// SPDX-License-Identifier: MIT

// AaveBridgeV2.sol -- Charged Particles
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
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";

import "./IATokenV2.sol";
import "./ILendingPoolV2.sol";
import "./ILendingPoolAddressesProviderV2.sol";

import "../../../interfaces/IAaveBridge.sol";

contract AaveBridgeV2 is Ownable, IAaveBridge {
  using SafeMath for uint256;
  using SafeCast for uint256;
  using ReserveLogic for ReserveLogic.ReserveData;

  ILendingPoolAddressesProviderV2 public provider;
  ILendingPoolV2 public lendingPool;

  constructor (address lendingPoolProvider) public {
    provider = ILendingPoolAddressesProviderV2(lendingPoolProvider);
    lendingPool = ILendingPoolV2(provider.getLendingPool());
  }

  function getReserveInterestToken(address assetToken) external view override returns (address aTokenAddress) {
    return _getReserveInterestToken(assetToken);
  }

  function isReserveActive(address assetToken) external view override returns (bool) {
    return _isReserveActive(assetToken);
  }

  function getTotalBalance(address account, address assetToken) external view override returns (uint256) {
    address aTokenAddress = _getReserveInterestToken(assetToken);
    if (aTokenAddress == address(0x0)) { return 0; }
    return IATokenV2(aTokenAddress).balanceOf(account);
  }

  function deposit(
    address assetToken,
    uint256 assetAmount,
    uint256 referralCode
  )
    external
    override
    returns (uint256)
  {
    address self = address(this);
    address aTokenAddress = _getReserveInterestToken(assetToken);
    require(_isReserveActive(assetToken), "AaveBridgeV2: INVALID_ASSET");

    IATokenV2 aToken = IATokenV2(aTokenAddress);

    _collectToken(msg.sender, assetToken, assetAmount);
    IERC20(assetToken).approve(address(lendingPool), assetAmount);

    // Deposit Assets into Aave
    uint256 preBalance = aToken.balanceOf(self);
    lendingPool.deposit(assetToken, assetAmount, self, referralCode.toUint16());
    uint256 postBalance = aToken.balanceOf(self);
    uint256 aTokensAmount = postBalance.sub(preBalance);

    // Transfer back the Interest Tokens
    _sendToken(msg.sender, aTokenAddress, aTokensAmount);

    // Return amount of aTokens transfered
    return aTokensAmount;
  }

  function withdraw(
    address receiver,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
  {
    address self = address(this);
    require(_isReserveActive(assetToken), "AaveBridgeV2: INVALID_ASSET");

    // Redeem aTokens for Asset Tokens
    lendingPool.withdraw(assetToken, assetAmount, self);

    // Transfer back the Asset Tokens
    _sendToken(receiver, assetToken, assetAmount);
  }


  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    require(receiver != address(0x0), "AaveBridgeV1: INVALID_RECEIVER");
    receiver.transfer(amount);
  }

  function withdrawErc20(address payable receiver, address token, uint256 amount) external onlyOwner {
    require(receiver != address(0x0), "AaveBridgeV1: INVALID_RECEIVER");
    _sendToken(receiver, token, amount);
  }


  /**
    * @dev Collects the Required Asset Token from the users wallet
    */
  function _collectToken(address from, address token, uint256 amount) internal {
    require(IERC20(token).transferFrom(from, address(this), amount), "AaveBridgeV2: COLLECT_FAILED");
  }

  function _sendToken(address to, address token, uint256 amount) internal {
    require(IERC20(token).transfer(to, amount), "AaveBridgeV2: SEND_FAILED");
  }

  function _getReserveInterestToken(address assetToken) internal view returns (address aTokenAddress) {
    ReserveLogic.ReserveData memory config = lendingPool.getReserveData(assetToken);
    return config.aTokenAddress;
  }

  function _isReserveActive(address assetToken) internal view returns (bool) {
    ReserveLogic.ReserveData memory config = lendingPool.getReserveData(assetToken);
    uint256 isActiveFlag = 2 ** 56; // bit 56: reserve is active
    return (config.configuration.data & isActiveFlag) == isActiveFlag;
  }
}
