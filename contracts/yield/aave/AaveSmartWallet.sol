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

  function initialize(address aaveLendingProvider, uint256 aaveReferralCode) public initializer {
    SmartWalletBase.initializeBase();
    lendingPoolProvider = ILendingPoolAddressesProvider(aaveLendingProvider);
    referralCode = aaveReferralCode;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address assetToken) external view override returns (bool) {
    ILendingPool lendingPool = ILendingPool(lendingPoolProvider.getLendingPool());
    return _isReserveActive(lendingPool, assetToken);
  }

  function getReserveInterestToken(address assetToken) external view override returns (address) {
    ILendingPool lendingPool = ILendingPool(lendingPoolProvider.getLendingPool());
    return _getReserveAToken(lendingPool, assetToken);
  }

  function getPrincipal(address assetToken) external override returns (uint256) {
    address aTokenAddress = _assetToInterestToken[assetToken];
    if (aTokenAddress == address(0x0)) { return 0; }
    IAToken aToken = IAToken(aTokenAddress);

    return aToken.principalBalanceOf(address(this));
  }

  function getInterest(address assetToken) external override returns (uint256) {
    address aTokenAddress = _assetToInterestToken[assetToken];
    if (aTokenAddress == address(0x0)) { return 0; }
    IAToken aToken = IAToken(aTokenAddress);

    uint256 principal = aToken.principalBalanceOf(address(this));
    return aToken.balanceOf(address(this)).sub(principal);
  }

  function getBalance(address assetToken) external override returns (uint256) {
    return _getBalance(assetToken);
  }

  function getAnnuities(address assetToken) external override returns (uint256) {
    return _getCreatorPortion(assetToken, _getBalance(assetToken));
  }

  function getRewards(address rewardToken) external override returns (uint256) {
    return IERC20(rewardToken).balanceOf(address(this));
  }


  function deposit(
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    returns (uint256)
  {
    return _deposit(assetToken, assetAmount);
  }


  function withdraw(
    address receiver,
    address assetToken
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _withdraw(receiver, assetToken, _getBalance(assetToken));
  }

  function withdrawAmount(
    address receiver,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _withdraw(receiver, assetToken, assetAmount);
  }

  function withdrawRewards(
    address receiver,
    address rewardsToken,
    uint256 rewardsAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _withdrawRewards(receiver, rewardsToken, rewardsAmount);
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _deposit(
    address assetToken,
    uint256 assetAmount
  )
    internal
    returns (uint256)
  {
    address self = address(this);
    ILendingPool lendingPool = ILendingPool(lendingPoolProvider.getLendingPool());
    require(_isReserveActive(lendingPool, assetToken), "AaveSmartWallet: INVALID_ASSET");

    address aTokenAddress = _getReserveAToken(lendingPool, assetToken);
    IAToken aToken = IAToken(aTokenAddress);
    _addAssetToken(assetToken, aTokenAddress);

    // Collect Asset Token (reverts on fail)
    _collectAssetToken(assetToken, assetAmount);

    // Approve LendingPool contract to transfer Assets
    IERC20(assetToken).approve(lendingPoolProvider.getLendingPoolCore(), assetAmount);

    // Deposit Assets into Aave
    uint256 preBalance = aToken.balanceOf(self);
    lendingPool.deposit(assetToken, assetAmount, referralCode.toUint16());
    uint256 postBalance = aToken.balanceOf(self);
    uint256 aTokensAmount = postBalance.sub(preBalance);

    // Return amount of aTokens transfered
    return aTokensAmount;
  }

  function _withdraw(
    address receiver,
    address assetTokenAddress,
    uint256 assetAmount
  )
    internal
    returns (uint256)
  {
    address aTokenAddress = _assetToInterestToken[assetTokenAddress];
    require(aTokenAddress != address(0x0), "AaveSmartWallet: INVALID_ASSET");

    address self = address(this);
    IERC20 assetToken = IERC20(assetTokenAddress);
    IAToken aToken = IAToken(aTokenAddress);

    uint256 walletBalance = aToken.balanceOf(self);
    uint256 withdrawalAmount = (walletBalance >= assetAmount) ? assetAmount : walletBalance;
    require(withdrawalAmount > 0, "AaveSmartWallet: INSUFF_BALANCE");

    // Get Creator Annuities
    uint256 creatorAmount = _getCreatorPortion(assetTokenAddress, withdrawalAmount);

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
    require(assetToken.transfer(receiver, receiverAmount), "AaveSmartWallet: WITHDRAW_RECEIVER_FAILED");
    return receiverAmount;
  }

  function _withdrawRewards(
    address receiver,
    address rewardsTokenAddress,
    uint256 rewardsAmount
  )
    internal
    returns (uint256)
  {
    address self = address(this);
    IERC20 rewardsToken = IERC20(rewardsTokenAddress);

    uint256 walletBalance = rewardsToken.balanceOf(self);
    require(walletBalance >= rewardsAmount, "AaveSmartWallet: INSUFF_BALANCE");

    // Transfer Rewards to Receiver
    require(rewardsToken.transfer(receiver, rewardsAmount), "AaveSmartWallet: WITHDRAW_TRANSFER_FAILED");
    return rewardsAmount;
  }


  function _getBalance(address assetToken) internal returns (uint256) {
    address aTokenAddress = _assetToInterestToken[assetToken];
    if (aTokenAddress == address(0x0)) { return 0; }
    IAToken aToken = IAToken(aTokenAddress);

    return aToken.balanceOf(address(this));
  }

  function _getCreatorPortion(address assetToken, uint256 amount) internal returns (uint256) {
    if (nftCreatorAnnuityPct == 0) { return 0; }

    address self = address(this);
    address aTokenAddress = _assetToInterestToken[assetToken];
    IAToken aToken = IAToken(aTokenAddress);

    uint256 walletBalance = aToken.balanceOf(self);
    uint256 walletPrincipal = aToken.principalBalanceOf(self);
    uint256 walletInterest = walletBalance.sub(walletPrincipal);
    uint256 interestPortion = (walletInterest > amount) ? amount : walletInterest;
    if (interestPortion <= PERCENTAGE_SCALE) { return 0; }

    // Creator Annuity
    return interestPortion.mul(nftCreatorAnnuityPct).div(PERCENTAGE_SCALE);
  }


  /**
    * @dev Collects the Required Asset Token from the users wallet
    */
  function _collectAssetToken(address assetToken, uint256 assetAmount) internal {
    uint256 assetBalance = IERC20(assetToken).balanceOf(_walletManager);
    require(assetAmount <= assetBalance, "AaveSmartWallet: INSUFF_FUNDS");
    require(IERC20(assetToken).transferFrom(_walletManager, address(this), assetAmount), "AaveSmartWallet: TRANSFER_FAILED");
  }


  function _isReserveActive(ILendingPool lendingPool, address assetToken) internal view returns (bool) {
    (,,,, bool usageAsCollateralEnabled,,, bool isActive) = lendingPool.getReserveConfigurationData(assetToken);
    return (isActive && usageAsCollateralEnabled);
  }

  function _getReserveAToken(ILendingPool lendingPool, address assetToken) internal view returns (address) {
    (,,,,,,,,,,, address aTokenAddress,) = lendingPool.getReserveData(assetToken);
    return aTokenAddress;
  }
}
