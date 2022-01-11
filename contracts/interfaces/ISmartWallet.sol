// SPDX-License-Identifier: MIT

// ISmartWallet.sol -- Part of the Charged Particles Protocol
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

pragma solidity >=0.6.0;

/**
 * @title Charged Particles Smart Wallet
 * @dev Manages holding and transferring assets of an NFT to a specific LP for Yield (if any),
 */
interface ISmartWallet {
  function getAssetTokenCount() external view returns (uint256);
  function getAssetTokenByIndex(uint256 index) external view returns (address);

  function setNftCreator(address creator, uint256 annuityPct) external;

  function isReserveActive(address assetToken) external view returns (bool);
  function getReserveInterestToken(address assetToken) external view returns (address);

  function getPrincipal(address assetToken) external returns (uint256);
  function getInterest(address assetToken) external returns (uint256 creatorInterest, uint256 ownerInterest);
  function getTotal(address assetToken) external returns (uint256);
  function getRewards(address assetToken) external returns (uint256);

  function deposit(address assetToken, uint256 assetAmount, uint256 referralCode) external returns (uint256);
  function withdraw(address receiver, address creatorRedirect, address assetToken) external returns (uint256 creatorAmount, uint256 receiverAmount);
  function withdrawAmount(address receiver, address creatorRedirect, address assetToken, uint256 assetAmount) external returns (uint256 creatorAmount, uint256 receiverAmount);
  function withdrawAmountForCreator(address receiver, address assetToken, uint256 assetAmount) external returns (uint256 receiverAmount);
  function withdrawRewards(address receiver, address rewardsToken, uint256 rewardsAmount) external returns (uint256);
  function executeForAccount(address contractAddress, uint256 ethValue, bytes memory encodedParams) external returns (bytes memory);
  function refreshPrincipal(address assetToken) external;

  function withdrawEther(address payable receiver, uint256 amount) external;
  function withdrawERC20(address payable receiver, address tokenAddress, uint256 amount) external;
  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external;
}
