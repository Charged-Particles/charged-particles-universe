// SPDX-License-Identifier: MIT

// IParticleSplitter.sol -- Part of the Charged Particles Protocol
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
 * @notice Interface for Particle Splitter
 */
interface IParticleSplitter {

  /***********************************|
  |             Public API            |
  |__________________________________*/

  function executeForWallet(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address externalAddress,
    bytes memory encodedParams
  ) external payable returns (bytes memory);

  function executeForBasket(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address externalAddress,
    bytes memory encodedParams
  ) external payable returns (bytes memory);

  function withdrawWalletRewards(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address rewardsToken,
    uint256 rewardsAmount
  ) external returns (uint256 amountWithdrawn);

  function withdrawBasketRewards(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address rewardsToken,
    uint256 rewardsAmount
  ) external returns (uint256 amountWithdrawn);

  function refreshWalletPrincipal(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  ) external;


  /***********************************|
  |          Particle Events          |
  |__________________________________*/

  event ChargedManagersSet(address indexed chargedManagers);
  event TokenInfoProxySet(address indexed tokenInfoProxy);

  event ExecuteForWallet(
    address indexed contractAddress,
    uint256 tokenId,
    string walletManagerId,
    address indexed externalAddress,
    bytes encodedParams,
    uint256 ethValue
  );
  event ExecuteForBasket(
    address indexed contractAddress,
    uint256 tokenId,
    string basketManagerId,
    address indexed externalAddress,
    bytes encodedParams,
    uint256 ethValue
  );
  event PrincipalRefreshed(
    address contractAddress,
    uint256 tokenId,
    string walletManagerId,
    address assetToken
  );
  event PermsSetForExternal(
    address indexed contractAddress,
    bool state
  );
}
