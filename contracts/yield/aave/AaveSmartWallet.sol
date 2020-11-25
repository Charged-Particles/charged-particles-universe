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

import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../interfaces/IAaveBridge.sol";
import "../../lib/SmartWalletBase.sol";

/**
 * @notice ERC20-Token Smart-Wallet Bridge
 * @dev Non-upgradeable Contract
 */
contract AaveSmartWallet is SmartWalletBase, Initializable {
  using SafeMath for uint256;
  using SafeCast for uint256;

  uint256 constant internal RAY = 1e27;

  IAaveBridge internal _bridge;

  //   Asset Token => Principal Balance
  mapping (address => uint256) internal _assetPrincipalBalance;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(
    address aaveBridge
  )
    public
    initializer
  {
    SmartWalletBase.initializeBase();
    _bridge = IAaveBridge(aaveBridge);
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address assetToken) external view override returns (bool) {
    return _bridge.isReserveActive(assetToken);
  }

  function getReserveInterestToken(address assetToken) external view override returns (address) {
    return _bridge.getReserveInterestToken(assetToken);
  }

  function getPrincipal(address assetToken) external override returns (uint256) {
    return _getPrincipal(assetToken);
  }

  function getInterest(address assetToken) external override returns (uint256 creatorInterest, uint256 ownerInterest) {
    return _getInterest(assetToken);
  }

  function getTotal(address assetToken) external override returns (uint256) {
    return _getTotal(assetToken);
  }

  function getRewards(address rewardToken) external override returns (uint256) {
    return IERC20(rewardToken).balanceOf(address(this));
  }

  // function migrateToAaveV2(address assetToken)
  //   external
  //   onlyWalletManager
  //   returns (uint256 amountMigrated, uint256 creatorAmount)
  // {
  //   require(!enableAaveV2, "AaveSmartWallet: ALREADY_ON_V2");

  //   // Migrate all deposits for asset from V1
  //   uint256 walletPrincipal = _getPrincipal(assetToken);
  //   (uint256 creatorInterest, uint256 ownerInterest) = _getInterest(assetToken);
  //   uint256 amountToMigrate = walletPrincipal.add(ownerInterest);
  //   creatorAmount = creatorInterest;

  //   _withdrawFromV1(address(this), assetToken, creatorAmount, amountToMigrate);
  //   amountMigrated = _depositIntoV2(assetToken, amountToMigrate);

  //   // Track Principal
  //   // _assetPrincipalBalance[assetToken] = walletPrincipal;

  //   // Switch to Aave V2
  //   enableAaveV2 = true;
  // }


  function deposit(
    address assetToken,
    uint256 assetAmount,
    uint256 referralCode
  )
    external
    override
    returns (uint256)
  {
    return _deposit(assetToken, assetAmount, referralCode);
  }


  function withdraw(
    address receiver,
    address assetToken
  )
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 walletPrincipal = _getPrincipal(assetToken);
    (, uint256 ownerInterest) = _getInterest(assetToken);
    return _withdraw(receiver, assetToken, walletPrincipal.add(ownerInterest));
  }

  function withdrawAmount(
    address receiver,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
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
    uint256 assetAmount,
    uint256 referralCode
  )
    internal
    returns (uint256)
  {
    // Collect Asset Token (reverts on fail)
    _collectToken(_walletManager, assetToken, assetAmount);
    _trackAssetToken(assetToken);

    // Deposit Assets into Aave (reverts on fail)
    IERC20(assetToken).approve(address(_bridge), assetAmount);
    uint256 aTokensAmount = _bridge.deposit(assetToken, assetAmount, referralCode);

    // Track Principal
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].add(assetAmount);

    // Return amount of aTokens transfered
    return aTokensAmount;
  }

  function _withdraw(
    address receiver,
    address assetToken,
    uint256 assetAmount
  )
    internal
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 walletPrincipal = _getPrincipal(assetToken);
    (uint256 creatorInterest, uint256 ownerInterest) = _getInterest(assetToken);

    // Withdraw from Interest only
    if (assetAmount < ownerInterest) {
      uint256 ratio = assetAmount.mul(RAY).div(ownerInterest);
      creatorAmount = creatorInterest.mul(ratio).div(RAY);
      receiverAmount = assetAmount;
    }

    // Withdraw from Interest + Principal
    else {
      uint256 fromPrincipal = assetAmount.sub(ownerInterest);
      if (fromPrincipal > walletPrincipal) {
        fromPrincipal = walletPrincipal;
      }

      creatorAmount = creatorInterest;
      receiverAmount = ownerInterest.add(fromPrincipal);

      // Track Principal
      _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].sub(fromPrincipal);
    }

    // Send aTokens to Bridge
    address aTokenAddress = _bridge.getReserveInterestToken(assetToken);
    _sendToken(address(_bridge), aTokenAddress, receiverAmount.add(creatorAmount));

    // Withdraw Assets for Creator
    if (creatorAmount > 0) {
      _bridge.withdraw(nftCreator, assetToken, creatorAmount);
    }

    // Withdraw Assets for Receiver
    _bridge.withdraw(receiver, assetToken, receiverAmount);
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
    require(rewardsToken.transfer(receiver, rewardsAmount), "AaveSmartWallet: REWARDS_TRANSFER_FAILED");
    return rewardsAmount;
  }

  function _getTotal(address assetToken) internal view returns (uint256) {
    return _bridge.getTotalBalance(address(this), assetToken);
  }

  function _getPrincipal(address assetToken) internal view returns (uint256) {
    return _assetPrincipalBalance[assetToken];
  }

  function _getInterest(address assetToken) internal view returns (uint256 creatorInterest, uint256 ownerInterest) {
    uint256 total = _getTotal(assetToken);
    uint256 principal = _getPrincipal(assetToken);
    uint256 interest = total.sub(principal);

    // Creator Royalties
    if (nftCreatorAnnuityPct > 0) {

      // Interest too small to calculate percentage; split evenly
      if (interest <= PERCENTAGE_SCALE) {
        creatorInterest = interest.div(2);
      }

      // Calculate percentage for Creator
      else {
        creatorInterest = interest.mul(nftCreatorAnnuityPct).div(PERCENTAGE_SCALE);
      }
    }

    // Owner Portion
    ownerInterest = interest.sub(creatorInterest);
  }

  function _collectToken(address from, address token, uint256 amount) internal {
    require(IERC20(token).transferFrom(from, address(this), amount), "AaveSmartWallet: COLLECT_FAILED");
  }

  function _sendToken(address to, address token, uint256 amount) internal {
    require(IERC20(token).transfer(to, amount), "AaveSmartWallet: SEND_FAILED");
  }
}
