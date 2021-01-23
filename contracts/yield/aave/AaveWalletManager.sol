// SPDX-License-Identifier: MIT

// AaveWalletManager.sol -- Charged Particles
// Copyright (c) 2019, 2020 Rob Secord <robsecord.eth>
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

import "./AaveSmartWallet.sol";

/**
 * @notice Wallet Manager for Aave
 * @dev Non-upgradeable Contract
 */
contract AaveWalletManager is WalletManagerBase {
  using SafeMath for uint256;

  event AaveBridgeSet(address indexed aaveBridge);
  event WhitelistedRewardsTokenSet(address indexed rewardsToken, bool state);

  address internal _aaveBridge;
  uint256 internal _referralCode;

  mapping (address => bool) public rewardsTokenWhitelist;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor () public {
    _walletTemplate = address(new AaveSmartWallet());
  }

  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address contractAddress, uint256 tokenId, address assetToken) external view override returns (bool) {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return false; }
    return AaveSmartWallet(_wallets[uuid]).isReserveActive(assetToken);
  }

  function getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken) external view override returns (address) {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return address(0x0); }
    return AaveSmartWallet(_wallets[uuid]).getReserveInterestToken(assetToken);
  }

  /**
    * @notice Gets the Principal-Amount of Assets held in the Smart-Wallet
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Principal-Balance of the Smart-Wallet
    */
  function getPrincipal(address contractAddress, uint256 tokenId, address assetToken) external override returns (uint256) {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[uuid]).getPrincipal(assetToken);
  }

  /**
    * @notice Gets the Interest-Amount that the Token has generated
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return creatorInterest The NFT Creator's portion of the Interest
    * @return ownerInterest The NFT Owner's portion of the Interest
    */
  function getInterest(address contractAddress, uint256 tokenId, address assetToken) external override returns (uint256 creatorInterest, uint256 ownerInterest) {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] != address(0x0)) {
      return AaveSmartWallet(_wallets[uuid]).getInterest(assetToken);
    }
  }

  /**
    * @notice Gets the Available Balance of Assets held in the Token
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Available Balance of the Token
    */
  function getTotal(address contractAddress, uint256 tokenId, address assetToken) external override returns (uint256) {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[uuid]).getTotal(assetToken);
  }

  function getRewards(address contractAddress, uint256 tokenId, address _rewardToken) external override returns (uint256) {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[uuid]).getRewards(_rewardToken);
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
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];

    // Deposit into Smart-Wallet
    yieldTokensAmount = AaveSmartWallet(wallet).deposit(assetToken, assetAmount, _referralCode);

    // Log Event
    emit WalletEnergized(contractAddress, tokenId, assetToken, assetAmount, yieldTokensAmount);
  }

  function discharge(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken
  )
    external
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    (, uint256 ownerInterest) = AaveSmartWallet(wallet).getInterest(assetToken);
    require(ownerInterest > 0, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge the full amount of interest
    (creatorAmount, receiverAmount) = AaveSmartWallet(wallet).withdrawAmount(receiver, assetToken, ownerInterest);

    // Log Event
    emit WalletDischarged(contractAddress, tokenId, assetToken, creatorAmount, receiverAmount);
  }

  function dischargeAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    (, uint256 ownerInterest) = AaveSmartWallet(wallet).getInterest(assetToken);
    require(assetAmount > 0 && ownerInterest >= assetAmount, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge a portion of the interest
    (creatorAmount, receiverAmount) = AaveSmartWallet(wallet).withdrawAmount(receiver, assetToken, assetAmount);

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
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    (uint256 creatorInterest,) = AaveSmartWallet(wallet).getInterest(assetToken);
    require(assetAmount > 0 && creatorInterest >= assetAmount, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge a portion of the interest
    receiverAmount = AaveSmartWallet(wallet).withdrawAmountForCreator(receiver, assetToken, assetAmount);

    // Log Event
    emit WalletDischargedForCreator(contractAddress, tokenId, assetToken, creator, receiverAmount);
  }

  function release(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address assetToken
  )
    external
    override
    onlyController
    returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    // Release Principal + Interest
    principalAmount = AaveSmartWallet(wallet).getPrincipal(assetToken);
    (creatorAmount, receiverAmount) = AaveSmartWallet(wallet).withdraw(receiver, assetToken);

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
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");
    require(rewardsTokenWhitelist[rewardsToken], "AaveWalletManager: INVALID_REWARD_TOKEN");

    // Withdraw Rewards to Receiver
    amount = AaveSmartWallet(wallet).withdrawRewards(receiver, rewardsToken, rewardsAmount);

    // Log Event
    emit WalletRewarded(contractAddress, tokenId, receiver, rewardsToken, amount);
  }

  function withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount) external virtual override onlyController {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    return AaveSmartWallet(wallet).withdrawEther(receiver, amount);
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
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    return AaveSmartWallet(wallet).executeForAccount(externalAddress, ethValue, encodedParams);
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
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];

    // Create Smart-Wallet if none exists
    if (wallet == address(0x0)) {
      wallet = _createWallet();
      _wallets[uuid] = wallet;

      if (creator != address(0x0)) {
        AaveSmartWallet(wallet).setNftCreator(creator, annuityPct);
      }

      emit NewSmartWallet(contractAddress, tokenId, wallet, creator, annuityPct);
    }

    return wallet;
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setAaveBridge(address aaveBridge) external onlyOwner {
    require(aaveBridge != address(0x0), "AaveWalletManager: INVALID_LP_BRIDGE");
    _aaveBridge = aaveBridge;
    emit AaveBridgeSet(aaveBridge);
  }

  // ref: https://docs.aave.com/developers/developing-on-aave/the-protocol/lendingpool
  function setReferralCode(uint256 referralCode) external onlyOwner {
    _referralCode = referralCode;
  }

  function setWhitelistedRewardsToken(address rewardsToken, bool state) external onlyOwner {
    rewardsTokenWhitelist[rewardsToken] = state;
    emit WhitelistedRewardsTokenSet(rewardsToken, state);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _createWallet()
    internal
    returns (address)
  {
    address newWallet = _createClone(_walletTemplate);
    AaveSmartWallet(newWallet).initialize(_aaveBridge);
    return newWallet;
  }
}