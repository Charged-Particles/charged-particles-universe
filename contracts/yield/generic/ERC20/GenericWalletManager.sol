// SPDX-License-Identifier: MIT

// GenericWalletManager.sol -- Part of the Charged Particles Protocol
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
import "../../../lib/WalletManagerBase.sol";
import "./GenericSmartWallet.sol";

/**
 * @notice Generic ERC20 Wallet Manager
 * @dev Non-upgradeable Contract
 */
contract GenericWalletManager is WalletManagerBase {
  using SafeMath for uint256;

  uint256 internal _referralCode;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor () public {
    _walletTemplate = address(new GenericSmartWallet());
  }

  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    view
    returns (bool)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return false; }
    return GenericSmartWallet(_wallets[uuid]).isReserveActive(assetToken);
  }

  function getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    view
    returns (address)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return address(0x0); }
    return GenericSmartWallet(_wallets[uuid]).getReserveInterestToken(assetToken);
  }

  /**
    * @notice Gets the Available Balance of Assets held in the Token
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Available Balance of the Token
    */
  function getTotal(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    returns (uint256)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return GenericSmartWallet(_wallets[uuid]).getTotal(assetToken);
  }

  /**
    * @notice Gets the Principal-Amount of Assets held in the Smart-Wallet
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Principal-Balance of the Smart-Wallet
    */
  function getPrincipal(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    returns (uint256)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return GenericSmartWallet(_wallets[uuid]).getPrincipal(assetToken);
  }

  /**
    * @notice Gets the Interest-Amount that the Token has generated
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return creatorInterest The NFT Creator's portion of the Interest
    * @return ownerInterest The NFT Owner's portion of the Interest
    */
  function getInterest(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    returns (uint256 creatorInterest, uint256 ownerInterest)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] != address(0x0)) {
    return GenericSmartWallet(_wallets[uuid]).getInterest(assetToken);
    }
  }

  function getRewards(address contractAddress, uint256 tokenId, address rewardToken)
    public
    override
    returns (uint256)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return GenericSmartWallet(_wallets[uuid]).getRewards(rewardToken);
  }

  function energize(address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount)
    public
    override
    onlyController
    returns (uint256 yieldTokensAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];

    // Deposit into Smart-Wallet
    yieldTokensAmount = GenericSmartWallet(wallet).deposit(assetToken, assetAmount, _referralCode);

    // Log Event
    emit WalletEnergized(contractAddress, tokenId, assetToken, assetAmount, yieldTokensAmount);
  }

  function discharge(address /* receiver */, address /* contractAddress */, uint256 /* tokenId */, address /* assetToken */, address /* creatorRedirect */)
    public
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    return (0, 0);
  }

  function dischargeAmount(address /* receiver */, address /* contractAddress */, uint256 /* tokenId */, address /* assetToken */, uint256 /* assetAmount */, address /* creatorRedirect */)
    public
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    return (0, 0);
  }

  function dischargeAmountForCreator(
    address /* receiver */,
    address /* contractAddress */,
    uint256 /* tokenId */,
    address /* creator */,
    address /* assetToken */,
    uint256 /* assetAmount */
  )
    external
    override
    onlyController
    returns (uint256 receiverAmount)
  {
    return 0;
  }

  function release(address receiver, address contractAddress, uint256 tokenId, address assetToken, address creatorRedirect)
    public
    override
    onlyController
    returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "GenericWalletManager: E-403");

    // Release Principal + Interest
    principalAmount = GenericSmartWallet(wallet).getPrincipal(assetToken);
    (creatorAmount, receiverAmount) = GenericSmartWallet(wallet).withdraw(receiver, creatorRedirect, assetToken);

    // Log Event
    emit WalletReleased(contractAddress, tokenId, receiver, assetToken, principalAmount, creatorAmount, receiverAmount);
  }

  function withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsAmount)
    public
    override
    onlyController
    returns (uint256 amount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "genericERC20WalletManager: E-403");

    // Withdraw Rewards to Receiver
    amount = GenericSmartWallet(wallet).withdrawRewards(receiver, rewardsToken, rewardsAmount);

    // Log Event
    emit WalletRewarded(contractAddress, tokenId, receiver, rewardsToken, amount);
  }

  function withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)
    public
    override
    onlyController
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    return GenericSmartWallet(wallet).withdrawEther(receiver, amount);
  }

  function executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes memory encodedParams)
    public
    override
    onlyController
    returns (bytes memory)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    return GenericSmartWallet(wallet).executeForAccount(externalAddress, ethValue, encodedParams);
  }

  function getWalletAddressById(address contractAddress, uint256 tokenId, address creator, uint256 annuityPct)
    public
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
        GenericSmartWallet(wallet).setNftCreator(creator, annuityPct);
      }

      emit NewSmartWallet(contractAddress, tokenId, wallet, creator, annuityPct);
    }

    return wallet;
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _createWallet()
    internal
    returns (address)
  {
    address newWallet = _createClone(_walletTemplate);
    GenericSmartWallet(newWallet).initialize();
    return newWallet;
  }

}
