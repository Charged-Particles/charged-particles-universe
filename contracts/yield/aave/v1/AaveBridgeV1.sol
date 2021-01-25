// SPDX-License-Identifier: MIT

// AaveBridgeV1.sol  -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./IATokenV1.sol";
import "./ILendingPoolV1.sol";
import "./ILendingPoolAddressesProviderV1.sol";

import "../../../interfaces/IAaveBridge.sol";


contract AaveBridgeV1 is Ownable, IAaveBridge {
  using SafeMath for uint256;
  using SafeCast for uint256;
  using Address for address payable;

  ILendingPoolAddressesProviderV1 public provider;
  ILendingPoolV1 public lendingPool;

  constructor (address lendingPoolProvider) public {
    provider = ILendingPoolAddressesProviderV1(lendingPoolProvider);
    lendingPool = ILendingPoolV1(provider.getLendingPool());
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
    return IATokenV1(aTokenAddress).balanceOf(account);
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
    require(_isReserveActive(assetToken), "AaveBridgeV1: E-424");

    IERC20 token = IERC20(assetToken);
    IATokenV1 aToken = IATokenV1(aTokenAddress);

    if (token.allowance(address(this), provider.getLendingPoolCore()) < assetAmount) {
      token.approve(provider.getLendingPoolCore(), uint256(-1));
    }

    // Deposit Assets into Aave
    uint256 preBalance = aToken.balanceOf(self);
    lendingPool.deposit(assetToken, assetAmount, referralCode.toUint16());
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
    address aTokenAddress = _getReserveInterestToken(assetToken);
    require(_isReserveActive(assetToken), "AaveBridgeV1: E-424");

    IATokenV1 aToken = IATokenV1(aTokenAddress);

    // Redeem aTokens for Asset Tokens
    aToken.redeem(assetAmount); // redeems to self

    // Transfer back the Asset Tokens
    _sendToken(receiver, assetToken, assetAmount);
  }


  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    require(receiver != address(0x0), "AaveBridgeV1: E-403");
    receiver.sendValue(amount);
  }

  function withdrawErc20(address payable receiver, address token, uint256 amount) external onlyOwner {
    require(receiver != address(0x0), "AaveBridgeV1: E-403");
    _sendToken(receiver, token, amount);
  }

  function _sendToken(address to, address token, uint256 amount) internal {
    require(IERC20(token).transfer(to, amount), "AaveBridgeV1: E-401");
  }

  function _getReserveInterestToken(address assetToken) internal view returns (address aTokenAddress) {
    (,,,,,,,,,,, aTokenAddress,) = lendingPool.getReserveData(assetToken);
  }

  function _isReserveActive(address assetToken) internal view returns (bool) {
    (,,,, bool usageAsCollateralEnabled,,, bool isActive) = lendingPool.getReserveConfigurationData(assetToken);
    return (isActive && usageAsCollateralEnabled);
  }

}
