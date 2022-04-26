// SPDX-License-Identifier: MIT

// AaveSmartWallet.sol -- Part of the Charged Particles Protocol
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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../../interfaces/IAaveBridge.sol";
import "../../lib/SmartWalletBaseB.sol";

/**
 * @notice ERC20-Token Smart-Wallet for Aave Assets
 * @dev Non-upgradeable Contract
 */
contract AaveSmartWalletB is SmartWalletBaseB {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  uint256 constant internal RAY = 1e27;

  IAaveBridge internal _bridge;

  uint256 internal _nftCreatorAmountDischarged;

  mapping (address => address) internal _assetATokens;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(
    address aaveBridge
  )
    public
  {
    SmartWalletBaseB.initializeBase();
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

  function getInterest(address assetToken, uint256 creatorPct) external override returns (uint256 creatorInterest, uint256 ownerInterest) {
    return _getInterest(assetToken, creatorPct);
  }

  function getTotal(address assetToken) external override returns (uint256) {
    return _getTotal(assetToken);
  }

  function getRewards(address rewardToken) external override returns (uint256) {
    return IERC20(rewardToken).balanceOf(address(this));
  }

  function deposit(
    address assetToken,
    uint256 assetAmount,
    uint256 referralCode
  )
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    return _deposit(assetToken, assetAmount, referralCode);
  }


  function withdraw(
    address receiver,
    address creator,
    uint256 creatorPct,
    address assetToken
  )
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 walletPrincipal = _getPrincipal(assetToken);
    (, uint256 ownerInterest) = _getInterest(assetToken, creatorPct);
    return _withdraw(receiver, creator, creatorPct, assetToken, walletPrincipal.add(ownerInterest));
  }

  function withdrawAmount(
    address receiver,
    address creator,
    uint256 creatorPct,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    return _withdraw(receiver, creator, creatorPct, assetToken, assetAmount);
  }

  function withdrawAmountForCreator(
    address receiver,
    uint256 creatorPct,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyWalletManager
    returns (uint256 receiverAmount)
  {
    return _withdrawForCreator(receiver, creatorPct, assetToken, assetAmount);
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

  function refreshPrincipal(address assetToken) external virtual override onlyWalletManager {
    uint256 aTokenBalance = IERC20(_assetATokens[assetToken]).balanceOf(address(this));
    if (_assetPrincipalBalance[assetToken] > aTokenBalance) {
      _assetPrincipalBalance[assetToken] = aTokenBalance;
    }
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
    _trackAssetToken(assetToken);

    // Track Principal
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].add(assetAmount);

    // Deposit Assets into Aave (reverts on fail)
    _sendToken(address(_bridge), assetToken, assetAmount);
    uint256 aTokensAmount = _bridge.deposit(assetToken, assetAmount, referralCode);

    // Return amount of aTokens transfered
    return aTokensAmount;
  }

  function _withdraw(
    address receiver,
    address creator,
    uint256 creatorPct,
    address assetToken,
    uint256 assetAmount
  )
    internal
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 walletPrincipal = _getPrincipal(assetToken);
    (uint256 creatorInterest, uint256 ownerInterest) = _getInterest(assetToken, creatorPct);

    // Withdraw from Interest only
    if (assetAmount < ownerInterest) {
      if (creatorInterest > 0) {
        uint256 ratio = assetAmount.mul(RAY).div(ownerInterest);
        creatorAmount = creatorInterest.add(_nftCreatorAmountDischarged).mul(ratio).div(RAY);

        if (creatorAmount <= _nftCreatorAmountDischarged) {
          _nftCreatorAmountDischarged = _nftCreatorAmountDischarged.sub(creatorAmount);
          creatorAmount = 0;
        }
        else {
          creatorAmount = creatorAmount.sub(_nftCreatorAmountDischarged);
          _nftCreatorAmountDischarged = 0;
        }
      }
      receiverAmount = assetAmount;
    }

    // Withdraw from Interest + Principal
    else {
      uint256 fromPrincipal = assetAmount.sub(ownerInterest);
      if (fromPrincipal > walletPrincipal) {
        fromPrincipal = walletPrincipal.sub(ownerInterest);
      }

      creatorAmount = creatorInterest;
      receiverAmount = ownerInterest.add(fromPrincipal);
      _nftCreatorAmountDischarged = 0;

      // Track Principal
      _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].sub(fromPrincipal);
    }

    // Send aTokens to Bridge
    address aTokenAddress = _bridge.getReserveInterestToken(assetToken);
    _sendToken(address(_bridge), aTokenAddress, receiverAmount.add(creatorAmount));

    // Withdraw Assets for Creator
    if (creatorAmount > 0) {
      if (creator != address(0)) {
        _bridge.withdraw(creator, assetToken, creatorAmount);
      } else {
        receiverAmount = receiverAmount.add(creatorAmount);
        creatorAmount = 0;
      }
    }

    // Withdraw Assets for Receiver
    _bridge.withdraw(receiver, assetToken, receiverAmount);
  }

  function _withdrawForCreator(
    address receiver,
    uint256 creatorPct,
    address assetToken,
    uint256 assetAmount
  )
    internal
    returns (uint256 receiverAmount)
  {
    (uint256 creatorInterest,) = _getInterest(assetToken, creatorPct);
    if (creatorInterest == 0) { return 0; }
    if (assetAmount > creatorInterest) {
      assetAmount = creatorInterest;
    }

    _nftCreatorAmountDischarged = _nftCreatorAmountDischarged.add(assetAmount);

    // Send aTokens to Bridge
    address aTokenAddress = _bridge.getReserveInterestToken(assetToken);
    _sendToken(address(_bridge), aTokenAddress, assetAmount);

    // Withdraw Assets for Receiver on behalf of Creator
    _bridge.withdraw(receiver, assetToken, assetAmount);
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
    require(walletBalance >= rewardsAmount, "ASW:E-411");

    // Transfer Rewards to Receiver
    rewardsToken.safeTransfer(receiver, rewardsAmount);
    return rewardsAmount;
  }

  function _getTotal(address assetToken) internal view returns (uint256) {
    return _bridge.getTotalBalance(address(this), assetToken);
  }

  function _getInterest(address assetToken, uint256 creatorPct) internal view returns (uint256 creatorInterest, uint256 ownerInterest) {
    uint256 total = _getTotal(assetToken);
    uint256 principal = _getPrincipal(assetToken);
    uint256 interest = total.sub(principal);

    // Creator Royalties
    if (creatorPct > 0) {

      // Interest too small to calculate percentage;
      if (interest <= PERCENTAGE_SCALE) {
        // creatorInterest = interest.div(2); // split evenly?
        creatorInterest = 0; // All to owner
      }

      // Calculate percentage for Creator
      else {
        creatorInterest = interest
          .add(_nftCreatorAmountDischarged)
          .mul(creatorPct)
          .div(PERCENTAGE_SCALE)
          .sub(_nftCreatorAmountDischarged);
      }
    }

    // Owner Portion
    ownerInterest = interest.sub(creatorInterest);
  }

  function _trackAssetToken(address assetToken) internal override {
    if (!_assetTokens.contains(assetToken)) {
      _assetTokens.add(assetToken);
      address aTokenAddress = _bridge.getReserveInterestToken(assetToken);
      _assetATokens[assetToken] = aTokenAddress;
    }
  }

  function _sendToken(address to, address token, uint256 amount) internal {
    IERC20(token).safeTransfer(to, amount);
  }
}
