// SPDX-License-Identifier: MIT

// CompoundWalletManager.sol -- Part of the Charged Particles Protocol
// Copyright (c) 2021 Firma Lux, Inc. <https://charged.fi>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../lib/WalletManagerBase.sol";

import "./CompoundSmartWallet.sol";

/**
 * @notice Wallet Manager for Compound
 * @dev Non-upgradeable Contract
 */
contract CompoundWalletManager is WalletManagerBase {
  using SafeMath for uint256;

  event CompoundBridgeSet(address indexed compoundBridge);
  event ValidRewardsTokenSet(address indexed rewardsToken, bool state);

  address internal _compoundBridge;

  mapping (address => bool) public rewardsTokenWhitelist;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor () public {
    _walletTemplate = address(new CompoundSmartWallet());
  }

  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address contractAddress, uint256 tokenId, address assetToken) external view override returns (bool) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return false; }
    return CompoundSmartWallet(_wallets[uuid]).isReserveActive(assetToken);
  }

  function getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken) external view override returns (address) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return address(0x0); }
    return CompoundSmartWallet(_wallets[uuid]).getReserveInterestToken(assetToken);
  }

  /**
    * @notice Gets the Principal-Amount of Assets held in the Smart-Wallet
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Principal-Balance of the Smart-Wallet
    */
  function getPrincipal(address contractAddress, uint256 tokenId, address assetToken) external override returns (uint256) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return CompoundSmartWallet(_wallets[uuid]).getPrincipal(assetToken);
  }

  /**
    * @notice Gets the Interest-Amount that the Token has generated
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return creatorInterest The NFT Creator's portion of the Interest
    * @return ownerInterest The NFT Owner's portion of the Interest
    */
  function getInterest(address contractAddress, uint256 tokenId, address assetToken)
    external
    override
    returns (uint256 creatorInterest, uint256 ownerInterest)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] != address(0x0)) {
      return CompoundSmartWallet(_wallets[uuid]).getInterest(assetToken);
    }
  }

  /**
    * @notice Gets the Available Balance of Assets held in the Token
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Available Balance of the Token
    */
  function getTotal(address contractAddress, uint256 tokenId, address assetToken) external override returns (uint256) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return CompoundSmartWallet(_wallets[uuid]).getTotal(assetToken);
  }

  function getRewards(address contractAddress, uint256 tokenId, address _rewardToken) external override returns (uint256) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return CompoundSmartWallet(_wallets[uuid]).getRewards(_rewardToken);
  }


  /***********************************|
  |          Only Controller          |
  |__________________________________*/

  function energize(
    address contractAddress,
    uint256 tokenId,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyController
    returns (uint256 yieldTokensAmount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];

    // Deposit into Smart-Wallet
    yieldTokensAmount = CompoundSmartWallet(wallet).deposit(assetToken, assetAmount, 0);

    // Log Event
    emit WalletEnergized(contractAddress, tokenId, assetToken, assetAmount, yieldTokensAmount);
  }

  function discharge(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken,
    address creatorRedirect
  )
    external
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "CWM:E-403");

    (, uint256 ownerInterest) = CompoundSmartWallet(wallet).getInterest(assetToken);
    require(ownerInterest > 0, "CWM:E-412");

    // Discharge the full amount of interest
    (creatorAmount, receiverAmount) = CompoundSmartWallet(wallet).withdrawAmount(receiver, creatorRedirect, assetToken, ownerInterest);

    // Log Event
    emit WalletDischarged(contractAddress, tokenId, assetToken, creatorAmount, receiverAmount);
  }

  function dischargeAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken,
    uint256 assetAmount,
    address creatorRedirect
  )
    external
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "CWM:E-403");

    (, uint256 ownerInterest) = CompoundSmartWallet(wallet).getInterest(assetToken);
    require(assetAmount > 0 && ownerInterest >= assetAmount, "CWM:E-412");

    // Discharge a portion of the interest
    (creatorAmount, receiverAmount) = CompoundSmartWallet(wallet).withdrawAmount(receiver, creatorRedirect, assetToken, assetAmount);

    // Log Event
    emit WalletDischarged(contractAddress, tokenId, assetToken, creatorAmount, receiverAmount);
  }

  function dischargeAmountForCreator(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address creator,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyController
    returns (uint256 receiverAmount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "CWM:E-403");

    (uint256 creatorInterest,) = CompoundSmartWallet(wallet).getInterest(assetToken);
    require(assetAmount > 0 && creatorInterest >= assetAmount, "CWM:E-412");

    // Discharge a portion of the interest
    receiverAmount = CompoundSmartWallet(wallet).withdrawAmountForCreator(receiver, assetToken, assetAmount);

    // Log Event
    emit WalletDischargedForCreator(contractAddress, tokenId, assetToken, creator, receiverAmount);
  }

  function release(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken,
    address creatorRedirect
  )
    external
    override
    onlyController
    returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "CWM:E-403");

    // Release Principal + Interest
    principalAmount = CompoundSmartWallet(wallet).getPrincipal(assetToken);
    (creatorAmount, receiverAmount) = CompoundSmartWallet(wallet).withdraw(receiver, creatorRedirect, assetToken);

    // Log Event
    emit WalletReleased(contractAddress, tokenId, receiver, assetToken, principalAmount, creatorAmount, receiverAmount);
  }

  function releaseAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken,
    uint256 assetAmount,
    address creatorRedirect
  )
    external
    override
    onlyController
    returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "CWM:E-403");

    (, uint256 ownerInterest) = CompoundSmartWallet(wallet).getInterest(assetToken);
    principalAmount = (ownerInterest < assetAmount) ? assetAmount.sub(ownerInterest) : 0;

    // Release from interest first + principal if needed
    (creatorAmount, receiverAmount) = CompoundSmartWallet(wallet).withdrawAmount(receiver, creatorRedirect, assetToken, assetAmount);

    // Log Event
    emit WalletReleased(contractAddress, tokenId, receiver, assetToken, principalAmount, creatorAmount, receiverAmount);
  }

  function withdrawRewards(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address rewardsToken,
    uint256 rewardsAmount
  )
    external
    override
    onlyController
    returns (uint256 amount)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "CWM:E-403");
    require(rewardsTokenWhitelist[rewardsToken], "CWM:E-423");

    // Withdraw Rewards to Receiver
    amount = CompoundSmartWallet(wallet).withdrawRewards(receiver, rewardsToken, rewardsAmount);

    // Log Event
    emit WalletRewarded(contractAddress, tokenId, receiver, rewardsToken, amount);
  }

  function executeForAccount(
    address contractAddress,
    uint256 tokenId,
    address externalAddress,
    uint256 ethValue,
    bytes memory encodedParams
  )
    external
    override
    onlyController
    returns (bytes memory)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    return CompoundSmartWallet(wallet).executeForAccount(externalAddress, ethValue, encodedParams);
  }

  function getWalletAddressById(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPct
  )
    external
    override
    onlyController
    returns (address)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];

    // Create Smart-Wallet if none exists
    if (wallet == address(0x0)) {
      wallet = _createWallet();
      _wallets[uuid] = wallet;

      if (creator != address(0x0)) {
        CompoundSmartWallet(wallet).setNftCreator(creator, annuityPct);
      }

      emit NewSmartWallet(contractAddress, tokenId, wallet, creator, annuityPct);
    }

    return wallet;
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setCompoundBridge(address compoundBridge) external onlyOwner {
    require(compoundBridge != address(0x0), "CWM:E-403");
    _compoundBridge = compoundBridge;
    emit CompoundBridgeSet(compoundBridge);
  }

  function setValidRewardsToken(address rewardsToken, bool state) external onlyOwner {
    rewardsTokenWhitelist[rewardsToken] = state;
    emit ValidRewardsTokenSet(rewardsToken, state);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _createWallet()
    internal
    returns (address)
  {
    address newWallet = _createClone(_walletTemplate);
    CompoundSmartWallet(newWallet).initialize(_compoundBridge);
    return newWallet;
  }
}