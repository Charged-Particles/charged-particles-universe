// SPDX-License-Identifier: MIT

// AaveSmartWallet.sol -- Charged Particles
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

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "./IAToken.sol";
import "./ILendingPool.sol";
import "./ILendingPoolAddressesProvider.sol";

import "../../lib/SmartWalletBase.sol";

/**
 * @notice ERC20-Token Smart-Wallet Bridge
 * @dev Non-upgradeable Contract
 */
contract AaveSmartWallet is SmartWalletBase, Initializable {
  using SafeMath for uint256;
  using SafeCast for uint256;

  ILendingPoolAddressesProvider public lendingPoolProvider;
  uint256 public referralCode;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(address _aaveLendingProvider, uint256 _referralCode) public initializer {
    SmartWalletBase.initializeBase();
    lendingPoolProvider = ILendingPoolAddressesProvider(_aaveLendingProvider);
    referralCode = _referralCode;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address _assetToken) external view override returns (bool) {
    ILendingPool lendingPool = ILendingPool(lendingPoolProvider.getLendingPool());
    return _isReserveActive(lendingPool, _assetToken);
  }

  function getReserveInterestToken(address _assetToken) external view override returns (address) {
    ILendingPool lendingPool = ILendingPool(lendingPoolProvider.getLendingPool());
    return _getReserveAToken(lendingPool, _assetToken);
  }

  function getPrincipal(address _assetToken) external override returns (uint256) {
    address aTokenAddress = _assetToInterestToken[_assetToken];
    if (aTokenAddress == address(0x0)) { return 0; }
    IAToken aToken = IAToken(aTokenAddress);

    return aToken.principalBalanceOf(address(this));
  }

  function getInterest(address _assetToken) external override returns (uint256) {
    address aTokenAddress = _assetToInterestToken[_assetToken];
    if (aTokenAddress == address(0x0)) { return 0; }
    IAToken aToken = IAToken(aTokenAddress);

    uint256 principal = aToken.principalBalanceOf(address(this));
    return aToken.balanceOf(address(this)).sub(principal);
  }

  function getBalance(address _assetToken) external override returns (uint256) {
    return _getBalance(_assetToken);
  }

  function getAnnuities(address _assetToken) external override returns (uint256) {
    return _getCreatorPortion(_assetToken, _getBalance(_assetToken));
  }

  function getRewards(address _rewardToken) external override returns (uint256) {
    return IERC20(_rewardToken).balanceOf(address(this));
  }


  function deposit(
    address _assetToken,
    uint256 _assetAmount
  )
    external
    override
    returns (uint256)
  {
    return _deposit(_assetToken, _assetAmount);
  }


  function withdraw(
    address _receiver,
    address _assetToken
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _withdraw(_receiver, _assetToken, _getBalance(_assetToken));
  }

  function withdrawAmount(
    address _receiver,
    address _assetToken,
    uint256 _assetAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _withdraw(_receiver, _assetToken, _assetAmount);
  }

  function withdrawRewards(
    address _receiver,
    address _rewardsToken,
    uint256 _rewardsAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _withdrawRewards(_receiver, _rewardsToken, _rewardsAmount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _deposit(
    address _assetToken,
    uint256 _assetAmount
  )
    internal
    returns (uint256)
  {
    address self = address(this);
    ILendingPool lendingPool = ILendingPool(lendingPoolProvider.getLendingPool());
    require(_isReserveActive(lendingPool, _assetToken), "AaveSmartWallet: INVALID_ASSET");

    address aTokenAddress = _getReserveAToken(lendingPool, _assetToken);
    IAToken aToken = IAToken(aTokenAddress);
    _addAssetToken(_assetToken, aTokenAddress);

    // Collect Asset Token (reverts on fail)
    _collectAssetToken(_assetToken, _assetAmount);

    // Approve LendingPool contract to transfer Assets
    IERC20(_assetToken).approve(lendingPoolProvider.getLendingPoolCore(), _assetAmount);

    // Deposit Assets into Aave
    uint256 preBalance = aToken.balanceOf(self);
    lendingPool.deposit(_assetToken, _assetAmount, referralCode.toUint16());
    uint256 postBalance = aToken.balanceOf(self);
    uint256 aTokensAmount = postBalance.sub(preBalance);

    // Return amount of aTokens transfered
    return aTokensAmount;
  }

  function _withdraw(
    address _receiver,
    address _assetToken,
    uint256 _assetAmount
  )
    internal
    returns (uint256)
  {
    address aTokenAddress = _assetToInterestToken[_assetToken];
    require(aTokenAddress != address(0x0), "AaveSmartWallet: INVALID_ASSET");

    address self = address(this);
    IERC20 assetToken = IERC20(_assetToken);
    IAToken aToken = IAToken(aTokenAddress);

    uint256 walletBalance = aToken.balanceOf(self);
    uint256 withdrawalAmount = (walletBalance >= _assetAmount) ? _assetAmount : walletBalance;
    require(withdrawalAmount > 0, "AaveSmartWallet: INSUFF_BALANCE");

    // Get Creator Annuities
    uint256 creatorAmount = _getCreatorPortion(_assetToken, withdrawalAmount);

    // Redeem aTokens for Asset Tokens
    uint256 preBalance = assetToken.balanceOf(self);
    aToken.redeem(withdrawalAmount);
    uint256 postBalance = assetToken.balanceOf(self);
    uint256 receiverAmount = postBalance.sub(preBalance);

    // Transfer Assets to Creator
    if (creatorAmount > 0) {
      receiverAmount = receiverAmount.sub(creatorAmount);
      require(assetToken.transfer(nftCreator, creatorAmount), "AaveSmartWallet: WITHDRAW_CREATOR_FAILED");
    }

    // Transfer Assets to Receiver
    require(assetToken.transfer(_receiver, receiverAmount), "AaveSmartWallet: WITHDRAW_RECEIVER_FAILED");
    return receiverAmount;
  }

  function _withdrawRewards(
    address _receiver,
    address _rewardsToken,
    uint256 _rewardsAmount
  )
    internal
    returns (uint256)
  {
    address self = address(this);
    IERC20 rewardsToken = IERC20(_rewardsToken);

    uint256 walletBalance = rewardsToken.balanceOf(self);
    require(walletBalance >= _rewardsAmount, "AaveSmartWallet: INSUFF_BALANCE");

    // Transfer Rewards to Receiver
    require(rewardsToken.transfer(_receiver, _rewardsAmount), "AaveSmartWallet: WITHDRAW_TRANSFER_FAILED");
    return _rewardsAmount;
  }


  function _getBalance(address _assetToken) internal returns (uint256) {
    address aTokenAddress = _assetToInterestToken[_assetToken];
    if (aTokenAddress == address(0x0)) { return 0; }
    IAToken aToken = IAToken(aTokenAddress);

    return aToken.balanceOf(address(this));
  }

  function _getCreatorPortion(address _assetToken, uint256 _amount) internal returns (uint256) {
    if (nftCreatorAnnuityPct == 0) { return 0; }

    address self = address(this);
    address aTokenAddress = _assetToInterestToken[_assetToken];
    IAToken aToken = IAToken(aTokenAddress);

    uint256 walletBalance = aToken.balanceOf(self);
    uint256 walletPrincipal = aToken.principalBalanceOf(self);
    uint256 walletInterest = walletBalance.sub(walletPrincipal);
    uint256 interestPortion = (walletInterest > _amount) ? _amount : walletInterest;
    if (interestPortion <= PERCENTAGE_SCALE) { return 0; }

    // Creator Annuity
    return interestPortion.mul(nftCreatorAnnuityPct).div(PERCENTAGE_SCALE);
  }


  /**
    * @dev Collects the Required Asset Token from the users wallet
    */
  function _collectAssetToken(address _assetToken, uint256 _assetAmount) internal {
    uint256 assetBalance = IERC20(_assetToken).balanceOf(_walletManager);
    require(_assetAmount <= assetBalance, "AaveSmartWallet: INSUFF_FUNDS");
    require(IERC20(_assetToken).transferFrom(_walletManager, address(this), _assetAmount), "AaveSmartWallet: TRANSFER_FAILED");
  }


  function _isReserveActive(ILendingPool _lendingPool, address _assetToken) internal view returns (bool) {
    (,,,, bool usageAsCollateralEnabled,,, bool isActive) = _lendingPool.getReserveConfigurationData(_assetToken);
    return (isActive && usageAsCollateralEnabled);
  }

  function _getReserveAToken(ILendingPool _lendingPool, address _assetToken) internal view returns (address) {
    (,,,,,,,,,,, address aTokenAddress,) = _lendingPool.getReserveData(_assetToken);
    return aTokenAddress;
  }

}
