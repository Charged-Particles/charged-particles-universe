// SPDX-License-Identifier: MIT

// GenericSmartWallet.sol -- Part of the Charged Particles Protocol
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
import "../../../lib/SmartWalletBase.sol";


/**
 * @notice Generic ERC20-Token Smart-Wallet Bridge
 * @dev Non-upgradeable Contract
 */
contract GenericSmartWallet is SmartWalletBase {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize()
    public
  {
    SmartWalletBase.initializeBase();
  }

  function isReserveActive(address assetToken)
    external
    override
    view
    returns (bool)
  {
    return _getPrincipal(assetToken) == 0;
  }

  function getReserveInterestToken(address assetToken)
    external
    override
    view
    returns (address)
  {
    return assetToken;
  }

  function getPrincipal(address assetToken)
    external
    override
    returns (uint256)
  {
    return _getPrincipal(assetToken);
  }

  function getInterest(address /* assetToken */)
    external
    override
    returns (uint256 creatorInterest, uint256 ownerInterest)
  {
    return (0, 0);
  }

  function getTotal(address assetToken)
    external
    override
    returns (uint256)
  {
    return _getPrincipal(assetToken);
  }

  function getRewards(address assetToken)
    external
    override
    returns (uint256)
  {
    return IERC20(assetToken).balanceOf(address(this));
  }

  function deposit(address assetToken, uint256 assetAmount, uint256 /* referralCode */)
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    // Track Principal
    _trackAssetToken(assetToken);
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].add(assetAmount);
  }

  function withdraw(address receiver, address /* creatorRedirect */, address assetToken)
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    creatorAmount = 0;
    receiverAmount = _getPrincipal(assetToken);
    // Track Principal
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].sub(receiverAmount);
    IERC20(assetToken).safeTransfer(receiver, receiverAmount);
  }

  function withdrawAmount(address receiver, address /* creatorRedirect */, address assetToken, uint256 assetAmount)
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    creatorAmount = 0;
    receiverAmount = _getPrincipal(assetToken);
    if (receiverAmount >= assetAmount) {
      receiverAmount = assetAmount;
    }
    // Track Principal
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].sub(receiverAmount);
    IERC20(assetToken).safeTransfer(receiver, receiverAmount);
  }

  function withdrawAmountForCreator(
    address /* receiver */,
    address /* assetToken */,
    uint256 /* assetID */
  )
    external
    override
    onlyWalletManager
    returns (uint256 receiverAmount)
  {
    return 0;
  }

  function withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsAmount)
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    address self = address(this);
    IERC20 rewardsToken = IERC20(rewardsTokenAddress);

    uint256 walletBalance = rewardsToken.balanceOf(self);
    require(walletBalance >= rewardsAmount, "GSW:E-411");

    // Transfer Rewards to Receiver
    rewardsToken.safeTransfer(receiver, rewardsAmount);
    return rewardsAmount;
  }

}
