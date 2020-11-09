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

import "../../lib/WalletManagerBase.sol";
import "./AaveSmartWallet.sol";

/**
 * @notice Wallet Manager for Aave
 * @dev Non-upgradeable Contract
 */
contract AaveWalletManager is WalletManagerBase {

  address public lendingPoolProvider;
  uint256 public referralCode;


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
    * @return  The Interest-Amount of the Token
    */
  function getInterest(uint256 _uuid, address _assetToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getInterest(_assetToken);
  }

  function getAnnuities(uint256 _uuid, address _assetToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getAnnuities(_assetToken);
  }

  /**
    * @notice Gets the Available Balance of Assets held in the Token
    * @param _uuid  The ID of the Token
    * @return  The Available Balance of the Token
    */
  function getBalance(uint256 _uuid, address _assetToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getBalance(_assetToken);
  }

  function getRewards(uint256 _uuid, address _assetToken) external override returns (uint256) {
    if (_wallets[_uuid] == address(0x0)) { return 0; }
    return AaveSmartWallet(_wallets[_uuid]).getRewards(_assetToken);
  }


  /***********************************|
  |          Only Controller          |
  |__________________________________*/

  function energize(
    uint256 _uuid,
    address _assetToken,
    uint256 _assetAmount,
    address creator,
    uint256 annuityPct
  )
    external
    override
    returns (uint256 yieldTokensAmount)
  {
    address wallet = _wallets[_uuid];

    // Create Smart-Wallet if none exists
    if (wallet == address(0x0)) {
      wallet = _createWallet(_uuid);
      _wallets[_uuid] = wallet;

      if (creator != address(0x0)) {
        AaveSmartWallet(wallet).setNftCreator(creator, annuityPct);
      }
    }

    // Collect Asset Token (reverts on fail)
    _collectAssetToken(_msgSender(), _assetToken, _assetAmount);

    // Deposit into Smart-Wallet
    yieldTokensAmount = AaveSmartWallet(wallet).deposit(_assetToken, _assetAmount);

    // Log Event
    emit WalletEnergized(_uuid, _assetToken, _assetAmount, yieldTokensAmount);
  }

  function discharge(
    address _receiver,
    uint256 _uuid,
    address _assetToken
  )
    external
    override
    onlyController
    returns (uint256 interestAmount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    uint256 availableInterest = AaveSmartWallet(wallet).getInterest(_assetToken);
    require(availableInterest > 0, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge the full amount of interest
    interestAmount = AaveSmartWallet(wallet).withdrawAmount(_receiver, _assetToken, availableInterest);

    // Log Event
    emit WalletDischarged(_uuid, _assetToken, interestAmount);
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
    returns (uint256 interestAmount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    uint256 availableInterest = AaveSmartWallet(wallet).getInterest(_assetToken);
    require(_assetAmount > 0 && availableInterest >= _assetAmount, "AaveWalletManager: INSUFF_CHARGE");

    // Discharge a portion of the interest
    interestAmount = AaveSmartWallet(wallet).withdrawAmount(_receiver, _assetToken, _assetAmount);

    // Log Event
    emit WalletDischarged(_uuid, _assetToken, interestAmount);
  }

  function release(
    address _receiver,
    uint256 _uuid,
    address _assetToken
  )
    external
    override
    onlyController
    returns (uint256 principalAmount, uint256 interestAmount)
  {
    address wallet = _wallets[_uuid];
    require(wallet != address(0x0), "AaveWalletManager: INVALID_TOKEN_ID");

    // Release Assets to Receiver
    principalAmount = AaveSmartWallet(wallet).getPrincipal(_assetToken);
    interestAmount = AaveSmartWallet(wallet).getInterest(_assetToken);
    AaveSmartWallet(wallet).withdraw(_receiver, _assetToken);

    // Log Event
    emit WalletReleased(_uuid, _receiver, _assetToken, principalAmount, interestAmount);
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



  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setLendingPoolProvider(address _aaveLendingProvider) external onlyOwner {
    require(_aaveLendingProvider != address(0x0), "AaveWalletManager: INVALID_LENDING_POOL");
    lendingPoolProvider = _aaveLendingProvider;
  }

  // ref: https://docs.aave.com/developers/developing-on-aave/the-protocol/lendingpool
  function setReferralCode(uint256 _referralCode) external onlyOwner {
    referralCode = _referralCode;
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /**
    * @dev todo..
    */
  function _createWallet(
    uint256 _uuid
  )
    internal
    returns (address)
  {
    address newWallet = _createClone(_walletTemplate);
    AaveSmartWallet(newWallet).initialize(lendingPoolProvider, referralCode);

    emit NewSmartWallet(_uuid, newWallet);
    return newWallet;
  }
}