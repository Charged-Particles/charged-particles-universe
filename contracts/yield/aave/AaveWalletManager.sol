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
  // event WalletMigrated(uint256 indexed uuid, address indexed operator, address indexed assetToken, uint256 creatorAmount, uint256 ownerAmount);

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

  function isReserveActive(uint256 _uuid, address _assetToken) external view override returns (bool) {
    if (_wallets[_uuid] == address(0x0)) { return false; }
    return AaveSmartWallet(_wallets[_uuid]).isReserveActive(_assetToken);
  }

  function getReserveInterestToken(uint256 _uuid, address _assetToken) external view override returns (address) {
    if (_wallets[_uuid] == address(0x0)) { return address(0x0); }
    return AaveSmartWallet(_wallets[_uuid]).getReserveInterestToken(_assetToken);
  }

  /**
    * @notice Gets the Principal-Amount of Assets held in the Smart-Wallet
    * @param _uuid  The ID of the Token/Owner
    * @return  The Principal-Balance of the Smart-Wallet
    */
  function getPrincipal(uint256 _uuid, address _assetToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getPrincipal(_assetToken);
  }

  /**
    * @notice Gets the Interest-Amount that the Token has generated
    * @param _uuid  The ID of the Token
    * @return creatorInterest The NFT Creator's portion of the Interest
    * @return ownerInterest The NFT Owner's portion of the Interest
    */
  function getInterest(uint256 _uuid, address _assetToken) external override returns (uint256 creatorInterest, uint256 ownerInterest) {
    if (_wallets[_uuid] != address(0x0)) {
      return AaveSmartWallet(_wallets[_uuid]).getInterest(_assetToken);
    }
  }

  /**
    * @notice Gets the Available Balance of Assets held in the Token
    * @param _uuid  The ID of the Token
    * @return  The Available Balance of the Token
    */
  function getTotal(uint256 _uuid, address _assetToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getTotal(_assetToken);
  }

  function getRewards(uint256 _uuid, address _rewardToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getRewards(_rewardToken);
  }


  /***********************************|
  |          Only Controller          |
  |__________________________________*/

  function energize(
    uint256 _uuid,
    address _assetToken,
    uint256 _assetAmount,
    uint256 _depositFee
  )
    external
    override
    onlyController
    returns (uint256 yieldTokensAmount)
  {
    address wallet = _wallets[_uuid];

    // Deposit into Smart-Wallet
    yieldTokensAmount = AaveSmartWallet(wallet).deposit(_assetToken, _assetAmount, _referralCode);

    // Log Event
    emit WalletEnergized(_uuid, _assetToken, _assetAmount, _depositFee, yieldTokensAmount);
  }

  function discharge(
    address _receiver,
    uint256 _uuid,
    address _assetToken
  )
    external
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    (, uint256 ownerInterest) = AaveSmartWallet(wallet).getInterest(_assetToken);
    require(ownerInterest > 0, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge the full amount of interest
    (creatorAmount, receiverAmount) = AaveSmartWallet(wallet).withdrawAmount(_receiver, _assetToken, ownerInterest);

    // Log Event
    emit WalletDischarged(_uuid, _assetToken, creatorAmount, receiverAmount);
  }

  function dischargeAmount(
    address _receiver,
    uint256 _uuid,
    address _assetToken,
    uint256 _assetAmount
  )
    external
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    (, uint256 ownerInterest) = AaveSmartWallet(wallet).getInterest(_assetToken);
    require(_assetAmount > 0 && ownerInterest >= _assetAmount, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge a portion of the interest
    (creatorAmount, receiverAmount) = AaveSmartWallet(wallet).withdrawAmount(_receiver, _assetToken, _assetAmount);

    // Log Event
    emit WalletDischarged(_uuid, _assetToken, creatorAmount, receiverAmount);
  }

  function release(
    address _receiver,
    uint256 _uuid,
    address _assetToken
  )
    external
    override
    onlyController
    returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    // Release Principal + Interest
    principalAmount = AaveSmartWallet(wallet).getPrincipal(_assetToken);
    (creatorAmount, receiverAmount) = AaveSmartWallet(wallet).withdraw(_receiver, _assetToken);

    // Log Event
    emit WalletReleased(_uuid, _receiver, _assetToken, principalAmount, creatorAmount, receiverAmount);
  }

  function withdrawRewards(
    address _receiver,
    uint256 _uuid,
    address _rewardsToken,
    uint256 _rewardsAmount
  )
    external
    override
    onlyController
    returns (uint256 amount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");
    require(rewardsTokenWhitelist[_rewardsToken], "AaveWalletManager: INVALID_REWARD_TOKEN");

    // Withdraw Rewards to Receiver
    amount = AaveSmartWallet(wallet).withdrawRewards(_receiver, _rewardsToken, _rewardsAmount);

    // Log Event
    emit WalletRewarded(_uuid, _receiver, _rewardsToken, amount);
  }

  function withdrawEther(uint256 _uuid, address payable receiver, uint256 amount) external virtual override onlyController {
    address wallet = _wallets[_uuid];
    return AaveSmartWallet(wallet).withdrawEther(receiver, amount);
  }

  function executeForAccount(
    uint256 _uuid,
    address contractAddress,
    uint256 ethValue,
    bytes memory encodedParams
  )
    external
    override
    onlyController
    returns (bytes memory)
  {
    address wallet = _wallets[_uuid];
    return AaveSmartWallet(wallet).executeForAccount(contractAddress, ethValue, encodedParams);
  }

  function getWalletAddressById(
    uint256 _uuid,
    address creator,
    uint256 annuityPct
  )
    external
    override
    onlyController
    returns (address)
  {
    address wallet = _wallets[_uuid];

    // Create Smart-Wallet if none exists
    if (wallet == address(0x0)) {
      wallet = _createWallet();
      _wallets[_uuid] = wallet;

      if (creator != address(0x0)) {
        AaveSmartWallet(wallet).setNftCreator(creator, annuityPct);
      }

      emit NewSmartWallet(_uuid, wallet, creator, annuityPct);
    }

    return wallet;
  }

  // function migrateToAaveV2(
  //   uint256 _uuid,
  //   address assetToken
  // )
  //   external
  //   returns (uint256 creatorAmount, uint256 amountMigrated)
  // {
  //   require(enableAaveV2, "AaveSmartWallet: V2_NOT_ENABLED");

  //   address wallet = _wallets[_uuid];
  //   (amountMigrated, creatorAmount) = AaveSmartWallet(wallet).migrateToAaveV2(assetToken);

  //   // Log Event
  //   emit WalletMigrated(_uuid, msg.sender, assetToken, creatorAmount, amountMigrated);
  // }


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

  function setWhitelistedRewardsToken(address _rewardsToken, bool _state) external onlyOwner {
    rewardsTokenWhitelist[_rewardsToken] = _state;
    emit WhitelistedRewardsTokenSet(_rewardsToken, _state);
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