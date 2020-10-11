// SPDX-License-Identifier: MIT

// YearnSmartWallet.sol -- Charged Particles
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

import "../../lib/SmartWalletBase.sol";

/**
 * @notice ERC20-Token Smart-Wallet Bridge
 * @dev Non-upgradeable Contract
 */
contract YearnSmartWallet is SmartWalletBase, Initializable {
  using SafeMath for uint256;
  using SafeCast for uint256;


  function initialize() public initializer {
    SmartWalletBase.initializeBase();
  }





  function isReserveActive(address _assetToken) external view override returns (bool) {
    return false;
  }

  function getReserveInterestToken(address _assetToken) external view override returns (address) {
    return address(0x0);
  }


  function getPrincipal(address _assetToken) external override returns (uint256) {
    return 0;
  }

  function getInterest(address _assetToken) external override returns (uint256) {
    return 0;
  }

  function getBalance(address _assetToken) external override returns (uint256) {
    return 0;
  }

  function getRewards(address _assetToken) external override returns (uint256) {
    return 0;
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








  function _deposit(
    address _assetToken,
    uint256 _assetAmount
  )
    internal
    returns (uint256)
  {
    // Return amount of yTokens transfered
    return 0;
  }



  function _withdraw(
    address _receiver,
    address _assetToken,
    uint256 _assetAmount
  )
    internal
    returns (uint256)
  {
    return 0;
  }


  function _getBalance(address _assetToken) internal returns (uint256) {
    return 0;
  }



  /**
    * @dev Collects the Required Asset Token from the users wallet
    */
  function _collectAssetToken(address _assetToken, uint256 _assetAmount) internal {
    uint256 assetBalance = IERC20(_assetToken).balanceOf(_walletManager);
    require(_assetAmount <= assetBalance, "YearnSmartWallet: INSUFF_FUNDS");
    require(IERC20(_assetToken).transferFrom(_walletManager, address(this), _assetAmount), "YearnSmartWallet: TRANSFER_FAILED");
  }

}
