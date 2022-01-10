// SPDX-License-Identifier: MIT

// ParticleSplitter.sol -- Part of the Charged Particles Protocol
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
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IParticleSplitter.sol";
import "./interfaces/IChargedManagers.sol";
import "./interfaces/IWalletManager.sol";
import "./interfaces/IBasketManager.sol";
import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
contract ParticleSplitter is IParticleSplitter, Ownable, ReentrancyGuard, BlackholePrevention
{
  IChargedManagers internal _chargedManagers;

  /***********************************|
  |        Execute for Account        |
  |__________________________________*/

  /// @notice Executes an arbitrary command on an NFT Wallet
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param walletManagerId      The Wallet Manager controlling the NFT Wallet to execute on
  /// @param externalAddress      The Address of the External Contract to execute on
  /// @param encodedParams        The encoded function call to execute
  function executeForWallet(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address externalAddress,
    bytes memory encodedParams
  )
    external
    payable
    virtual
    override
    nonReentrant
    returns (bytes memory)
  {
    require(_chargedManagers.isWalletManagerEnabled(walletManagerId), "CP:E-419");

    // Get appropriate Wallet Manager
    IWalletManager walletMgr = _chargedManagers.getWalletManager(walletManagerId);

    // Get Address of Wallet to send any ETH into
    if (msg.value > 0) {
      address wallet = walletMgr.getWalletAddressById(contractAddress, tokenId, address(0), 0);
      payable(wallet).sendValue(msg.value);
    }

    emit ExecuteForWallet(contractAddress, tokenId, walletManagerId, externalAddress, encodedParams, msg.value);

    // Execute command for NFT Wallet
    return walletMgr.executeForAccount(contractAddress, tokenId, externalAddress, msg.value, encodedParams);
  }

  /// @notice Executes an arbitrary command on an NFT Basket
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param basketManagerId      The Basket Manager controlling the NFT Wallet to execute on
  /// @param externalAddress      The Address of the External Contract to execute on
  /// @param encodedParams        The encoded function call to execute
  function executeForBasket(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address externalAddress,
    bytes memory encodedParams
  )
    external
    payable
    virtual
    override
    nonReentrant
    returns (bytes memory)
  {
    require(_chargedManagers.isNftBasketEnabled(basketManagerId), "CP:E-419");

    // Get appropriate Basket Manager
    IBasketManager basketMgr = _chargedManagers.getBasketManager(basketManagerId);

    // Get Address of Wallet to send any ETH into
    if (msg.value > 0) {
      address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);
      payable(wallet).sendValue(msg.value);
    }

    emit ExecuteForBasket(contractAddress, tokenId, basketManagerId, externalAddress, encodedParams, msg.value);

    // Execute command for NFT Wallet
    return basketMgr.executeForAccount(contractAddress, tokenId, externalAddress, msg.value, encodedParams);
  }



  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the ChargedManagers Interface
    */
  function setChargedManagers(address chargedManagers) external virtual onlyOwner {
    _chargedManagers = IChargedManagers(chargedManagers);
    emit ChargedManagersSet(chargedManagers);
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

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external onlyOwner {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }
}
