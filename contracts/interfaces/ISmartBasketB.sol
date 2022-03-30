// SPDX-License-Identifier: MIT

// ISmartBasketB.sol -- Part of the Charged Particles Protocol
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
 * @title Charged Particles Smart Basket "B"
 * @dev Manages holding and transferring NFTs within an NFT (if any),
 */
interface ISmartBasketB {
  function getNestedNftCount() external view returns (uint256);
  function getTokenCountByType(address contractAddress, uint256 tokenId) external view returns (uint256);

  function addToBasket(address contractAddress, uint256 tokenId, uint256 nftTokenAmount) external returns (bool);
  function removeFromBasket(address receiver, address contractAddress, uint256 tokenId, uint256 nftTokenAmount) external returns (bool);
  function withdrawRewards(address receiver, address rewardsToken, uint256 rewardsAmount) external returns (uint256);
  function executeForAccount(address contractAddress, uint256 ethValue, bytes memory encodedParams) external returns (bytes memory);

  function withdrawEther(address payable receiver, uint256 amount) external;
  function withdrawERC20(address payable receiver, address tokenAddress, uint256 amount) external;
  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external;
  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external;
}
