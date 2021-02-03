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

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../../../interfaces/ISmartBasket.sol";
import "../../../lib/BlackholePrevention.sol";


/**
 * @notice Generic ERC721-Token Smart-Basket
 * @dev Non-upgradeable Contract
 */
contract GenericSmartBasket is ISmartBasket, BlackholePrevention, IERC721Receiver {
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.AddressSet;

  address internal _basketManager;

  // NFT Contract Address held in Basket
  EnumerableSet.AddressSet internal _nftContracts;

  // NFT contract address => Token Ids in Basket
  mapping (address => EnumerableSet.UintSet) internal _nftContractTokens;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize() public {
    require(_basketManager == address(0x0), "GenericSmartBasket: E-002");
    _basketManager = msg.sender;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function getTokenContractCount() external view override returns (uint256) {
    return _nftContracts.length();
  }
  function getTokenContractByIndex(uint256 index) external view override returns (address) {
    return _nftContracts.at(index);
  }

  function getTokenCountByContract(address contractAddress) external view override returns (uint256) {
    return _nftContractTokens[contractAddress].length();
  }
  function getTokenByContractByIndex(address contractAddress, uint256 index) external view override returns (uint256) {
    return _nftContractTokens[contractAddress].at(index);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
    return IERC721Receiver(0).onERC721Received.selector;
  }


  function addToBasket(address contractAddress, uint256 tokenId)
    external
    override
    returns (bool)
  {
    require(!_nftContractTokens[contractAddress].contains(tokenId), "GenericSmartBasket: E-425");

    if (!_nftContracts.contains(contractAddress)) {
      _nftContracts.add(contractAddress);
    }
    bool added = _nftContractTokens[contractAddress].add(tokenId);
    if (added) {
      // NFT should have been Transferred into here via Charged-Particles
      added = (IERC721(contractAddress).ownerOf(tokenId) == address(this));
    }
    return added;
  }

  function removeFromBasket(address receiver, address contractAddress, uint256 tokenId)
    external
    override
    onlyBasketManager
    returns (bool)
  {
    require(_nftContractTokens[contractAddress].contains(tokenId), "GenericSmartBasket: E-426");

    bool removed = _nftContractTokens[contractAddress].remove(tokenId);
    if (removed) {
      if (_nftContractTokens[contractAddress].length() == 0) {
        _nftContracts.remove(contractAddress);
      }
      IERC721(contractAddress).safeTransferFrom(address(this), receiver, tokenId);
    }
    return removed;
  }

  function executeForAccount(
    address contractAddress,
    uint256 ethValue,
    bytes memory encodedParams
  )
    external
    override
    onlyBasketManager
    returns (bytes memory)
  {
    (bool success, bytes memory result) = contractAddress.call{value: ethValue}(encodedParams);
    require(success, string(result));
    return result;
  }


  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external virtual override onlyBasketManager {
    _withdrawEther(receiver, amount);
  }

  function withdrawERC20(address payable receiver, address tokenAddress, uint256 amount) external virtual override onlyBasketManager {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual override onlyBasketManager {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev Throws if called by any account other than the basket manager
  modifier onlyBasketManager() {
    require(_basketManager == msg.sender, "GenericSmartBasket: E-109");
    _;
  }
}