// SPDX-License-Identifier: MIT

// CompoundBridge.sol -- Part of the Charged Particles Protocol
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
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";

import "./ICErc20.sol";
import "./IComptroller.sol";
import "./Lens.sol";

import "../../interfaces/ICompoundBridge.sol";
import "../../lib/BlackholePrevention.sol";

contract CompoundBridge is Ownable, ICompoundBridge, BlackholePrevention, Lens {
  using SafeMath for uint256;
  using SafeCast for uint256;
  using SafeERC20 for IERC20;

  IComptroller public comptroller;

  constructor (address _comptroller) public {
    comptroller = IComptroller(_comptroller);
  }

  function getReserveInterestToken(address assetToken) external view override returns (address cTokenAddress) {
    return _getReserveInterestToken(assetToken);
  }

  function isReserveActive(address assetToken) external view override returns (bool) {
    return _isReserveActive(assetToken);
  }

  function getTotalBalance(address account, address assetToken) external view override returns (uint256) {
    address cToken = _getReserveInterestToken(assetToken);
    if (cToken == address(0x0)) { return 0; }
    return cTokenBalanceOfUndelying(cToken, payable(account));
  }
  
  function yieldExchangeRate(address assetToken, uint256 assetAmount) public view override returns(uint256) {
    return cTokenExchangeRateForUnderlyingAmount(_getReserveInterestToken(assetToken), assetAmount);
  }

  function deposit(
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    returns (uint256)
  {
    address self = address(this);
    address _cToken = _getReserveInterestToken(assetToken);
    require(_isReserveActive(assetToken), "CB:E-424");

    IERC20 token = IERC20(assetToken);
    ICErc20 cToken = ICErc20(_cToken);

    if (token.allowance(address(this), _cToken) < assetAmount) {
      token.approve(_cToken, uint256(-1));
    }

    // Deposit Assets into Compound
    uint preBalance = cToken.balanceOf(self);
    require(cToken.mint(assetAmount) == 0, "CB:E-425");
    uint postBalance = cToken.balanceOf(self);
    uint cTokensAmount = postBalance.sub(preBalance);

    // Transfer back the Interest Tokens
    cToken.transfer(msg.sender, cTokensAmount);

    // Return amount of aTokens transfered
    return uint256(cTokensAmount);
  }

  function withdraw(
    address receiver,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
  {
    address _cToken = _getReserveInterestToken(assetToken);
    require(_isReserveActive(assetToken), "CB:E-424");

    IERC20 token = IERC20(assetToken);
    ICErc20 cToken = ICErc20(_cToken);

    // Redeem cTokens for Asset Tokens
    require(cToken.redeemUnderlying(uint(assetAmount)) == 0, "CB:E-426");

    // Transfer back the Asset Tokens
    token.safeTransfer(receiver, assetAmount);

    // Send cTokens back to Wallet
    require(cToken.transfer(msg.sender, cToken.balanceOf(address(this))), "CB:E-428");
  }


  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getReserveInterestToken(address assetToken) internal view returns (address cTokenAddress) {
    address[] memory markets = comptroller.getAllMarkets();
    for (uint256 i = 0; i < markets.length; i++) {
        if (cTokenUnderlying(markets[i]) == assetToken) {
          return markets[i];
        }
    }
  }

  function _isReserveActive(address assetToken) internal view returns (bool) {
    address cToken = _getReserveInterestToken(assetToken);
    return cTokenIsListed(cToken);
  }
}
