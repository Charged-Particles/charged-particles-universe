// SPDX-License-Identifier: MIT

// IWalletManager.sol -- Charged Particles
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

pragma solidity >=0.6.0;

/**
 * @title Particle Wallet Manager interface
 * @dev The wallet-manager for underlying assets attached to Charged Particles
 */
interface IWalletManager {

  event NewSmartWallet(uint256 indexed _uuid, address indexed smartWallet);
  event WalletEnergized(uint256 indexed _uuid, address indexed _assetToken, uint256 assetAmount, uint256 interestAmount);
  event WalletDischarged(uint256 indexed _uuid, address indexed _assetToken, uint256 assetAmount);
  event WalletReleased(uint256 indexed _uuid, address indexed receiver, address indexed _assetToken, uint256 assetAmount);


  function isPaused() external view returns (bool);

  function isReserveActive(uint256 _uuid, address _assetToken) external view returns (bool);
  function getReserveInterestToken(uint256 _uuid, address _assetToken) external view returns (address);

  function getPrincipal(uint256 _uuid, address _assetToken) external returns (uint256);
  function getInterest(uint256 _uuid, address _assetToken) external returns (uint256);
  function getRewards(uint256 _uuid, address _assetToken) external returns (uint256);
  function getBalance(uint256 _uuid, address _assetToken) external returns (uint256);

  function energize(uint256 _uuid, address _assetToken, uint256 _assetAmount) external returns (uint256 _interestAmount);
  function discharge(address _receiver, uint256 _uuid, address _assetToken) external returns (uint256 _amount);
  function dischargeAmount(address _receiver, uint256 _uuid, address _assetToken, uint256 _assetAmount) external returns (uint256 _amount);
  function release(address _receiver, uint256 _uuid, address _assetToken) external returns (uint256 _amount);
}
