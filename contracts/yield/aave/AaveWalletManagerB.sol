// SPDX-License-Identifier: MIT

// AaveWalletManager.sol -- Part of the Charged Particles Protocol
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
import "../../interfaces/IChargedSettings.sol";
import "./AaveSmartWalletB.sol";

/**
 * @notice Wallet Manager for Aave
 * @dev Non-upgradeable Contract
 */
contract AaveWalletManagerB is WalletManagerBase {
  using SafeMath for uint256;

  event AaveBridgeSet(address indexed aaveBridge);
  event ChargedSettingsSet(address indexed settings);
  event ValidRewardsTokenSet(address indexed rewardsToken, bool state);

  IChargedSettings internal _chargedSettings;

  address internal _aaveBridge;
  uint256 internal _referralCode;

  mapping (address => bool) public _rewardsTokenWhitelist;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor () public {
    _walletTemplate = address(new AaveSmartWalletB());
  }

  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address contractAddress, uint256 tokenId, address assetToken) external view override returns (bool) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return false; }
    return AaveSmartWalletB(_wallets[uuid]).isReserveActive(assetToken);
  }

  function getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken) external view override returns (address) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return address(0x0); }
    return AaveSmartWalletB(_wallets[uuid]).getReserveInterestToken(assetToken);
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
    return AaveSmartWalletB(_wallets[uuid]).getPrincipal(assetToken);
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
      (, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);
      return AaveSmartWalletB(_wallets[uuid]).getInterest(assetToken, annuityPct);
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
    return AaveSmartWalletB(_wallets[uuid]).getTotal(assetToken);
  }

  function getRewards(address contractAddress, uint256 tokenId, address _rewardToken) external override returns (uint256) {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return AaveSmartWalletB(_wallets[uuid]).getRewards(_rewardToken);
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
    yieldTokensAmount = AaveSmartWalletB(wallet).deposit(assetToken, assetAmount, _referralCode);

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
    require(wallet != address(0x0), "AWM:E-403");

    (address creator, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);
    (, uint256 ownerInterest) = AaveSmartWalletB(wallet).getInterest(assetToken, annuityPct);
    require(ownerInterest > 0, "AWM:E-412");

    if (creatorRedirect != address(0)) {
      creator = creatorRedirect;
    }

    // Discharge the full amount of interest
    (creatorAmount, receiverAmount) = AaveSmartWalletB(wallet).withdrawAmount(receiver, creator, annuityPct, assetToken, ownerInterest);

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
    require(wallet != address(0x0), "AWM:E-403");

    (address creator, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);
    (, uint256 ownerInterest) = AaveSmartWalletB(wallet).getInterest(assetToken, annuityPct);
    require(assetAmount > 0 && ownerInterest >= assetAmount, "AWM:E-412");

    if (creatorRedirect != address(0)) {
      creator = creatorRedirect;
    }

    // Discharge a portion of the interest
    (creatorAmount, receiverAmount) = AaveSmartWalletB(wallet).withdrawAmount(receiver, creator, annuityPct, assetToken, assetAmount);

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
    require(wallet != address(0x0), "AWM:E-403");

    (, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);
    (uint256 creatorInterest,) = AaveSmartWalletB(wallet).getInterest(assetToken, annuityPct);
    require(assetAmount > 0 && creatorInterest >= assetAmount, "AWM:E-412");

    // Discharge a portion of the interest
    receiverAmount = AaveSmartWalletB(wallet).withdrawAmountForCreator(receiver, annuityPct, assetToken, assetAmount);

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
    require(wallet != address(0x0), "AWM:E-403");

    (address creator, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);
    if (creatorRedirect != address(0)) {
      creator = creatorRedirect;
    }

    // Release Principal + Interest
    principalAmount = AaveSmartWalletB(wallet).getPrincipal(assetToken);
    (creatorAmount, receiverAmount) = AaveSmartWalletB(wallet).withdraw(receiver, creator, annuityPct, assetToken);

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
    require(wallet != address(0x0), "AWM:E-403");

    (address creator, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);
    if (creatorRedirect != address(0)) {
      creator = creatorRedirect;
    }

    (, uint256 ownerInterest) = AaveSmartWalletB(wallet).getInterest(assetToken, annuityPct);
    principalAmount = (ownerInterest < assetAmount) ? assetAmount.sub(ownerInterest) : 0;

    // Release from interest first + principal if needed
    (creatorAmount, receiverAmount) = AaveSmartWalletB(wallet).withdrawAmount(receiver, creator, annuityPct, assetToken, assetAmount);

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
    require(wallet != address(0x0), "AWM:E-403");
    require(_rewardsTokenWhitelist[rewardsToken], "AWM:E-423");

    // Withdraw Rewards to Receiver
    amount = AaveSmartWalletB(wallet).withdrawRewards(receiver, rewardsToken, rewardsAmount);

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
    onlyControllerOrExecutor
    returns (bytes memory)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    return AaveSmartWalletB(wallet).executeForAccount(externalAddress, ethValue, encodedParams);
  }

  function refreshPrincipal(address contractAddress, uint256 tokenId, address assetToken)
    external
    override
    onlyControllerOrExecutor
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    AaveSmartWalletB(wallet).refreshPrincipal(assetToken);
  }

  function getWalletAddressById(
    address contractAddress,
    uint256 tokenId,
    address /* creator */,
    uint256 /* annuityPct */
  )
    external
    override
    onlyControllerOrExecutor
    returns (address)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];

    // Create Smart-Wallet if none exists
    if (wallet == address(0x0)) {
      wallet = _createWallet();
      _wallets[uuid] = wallet;
      emit NewSmartWallet(contractAddress, tokenId, wallet, address(0), 0);
    }

    return wallet;
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setAaveBridge(address aaveBridge) external onlyOwner {
    require(aaveBridge != address(0x0), "AWM:E-403");
    _aaveBridge = aaveBridge;
    emit AaveBridgeSet(aaveBridge);
  }

  function setChargedSettings(address settings) external onlyOwner {
    require(settings != address(0x0), "AWM:E-403");
    _chargedSettings = IChargedSettings(settings);
    emit ChargedSettingsSet(settings);
  }

  // ref: https://docs.aave.com/developers/developing-on-aave/the-protocol/lendingpool
  function setReferralCode(uint256 referralCode) external onlyOwner {
    _referralCode = referralCode;
  }

  function setValidRewardsToken(address rewardsToken, bool state) external onlyOwner {
    _rewardsTokenWhitelist[rewardsToken] = state;
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
    AaveSmartWalletB(newWallet).initialize(_aaveBridge);
    return newWallet;
  }
}