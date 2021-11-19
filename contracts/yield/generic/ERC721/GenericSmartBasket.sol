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
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../../../interfaces/ISmartBasket.sol";
import "../../../interfaces/ITokenInfoProxy.sol";
import "../../../lib/BlackholePrevention.sol";
import "../../../lib/NftTokenType.sol";


/**
 * @notice Generic ERC721-Token Smart-Basket
 * @dev Non-upgradeable Contract
 */
contract GenericSmartBasket is ISmartBasket, BlackholePrevention, IERC721Receiver, IERC1155Receiver {
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.AddressSet;
  using NftTokenType for address;

  ITokenInfoProxy internal _tokenInfoProxy;

  address internal _basketManager;

  // NFT contract address => Token Ids in Basket
  mapping (address => mapping(uint256 => EnumerableSet.UintSet)) internal _nftContractTokens;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(ITokenInfoProxy tokenInfoProxy) public {
    require(_basketManager == address(0x0), "GSB:E-002");
    _basketManager = msg.sender;
    _tokenInfoProxy = tokenInfoProxy;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function getTokenCountByType(address contractAddress, uint256 tokenId) external view override returns (uint256) {
    uint256 nftType = contractAddress.getTokenType(tokenId);
    return _nftContractTokens[contractAddress][nftType].length();
  }

  function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
    return IERC721Receiver(0).onERC721Received.selector;
  }

  function onERC1155Received(address, address, uint256, uint256, bytes calldata) external override returns (bytes4) {
    return IERC1155Receiver(0).onERC1155Received.selector;
  }

  // Unimplemented
  function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external override returns (bytes4) {
    return ""; // IERC1155ReceiverUpgradeable(0).onERC1155BatchReceived.selector;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return (interfaceId == 0x0);
  }

  function addToBasket(address contractAddress, uint256 tokenId)
    external
    override
    onlyBasketManager
    returns (bool)
  {
    uint256 nftType = contractAddress.getTokenType(tokenId);
    require(!_nftContractTokens[contractAddress][nftType].contains(tokenId), "GSB:E-425");

    bool added = _nftContractTokens[contractAddress][nftType].add(tokenId);
    if (added) {
      // NFT should have been Transferred into here via Charged-Particles
      address ownerOf = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
      added = (ownerOf == address(this));
    }
    return added;
  }

  function removeFromBasket(address receiver, address contractAddress, uint256 tokenId)
    external
    override
    onlyBasketManager
    returns (bool)
  {
    uint256 nftType = contractAddress.getTokenType(tokenId);
    require(_nftContractTokens[contractAddress][nftType].contains(tokenId), "GSB:E-426");

    bool removed = _nftContractTokens[contractAddress][nftType].remove(tokenId);
    if (removed) {
      if (_isERC1155(contractAddress)) {
        IERC1155(contractAddress).safeTransferFrom(address(this), receiver, tokenId, 1, "");
      } else {
        IERC721(contractAddress).safeTransferFrom(address(this), receiver, tokenId);
      }
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

  /// @dev Checks if an NFT token contract supports the ERC1155 standard interface
  function _isERC1155(address nftTokenAddress) internal view virtual returns (bool) {
    bytes4 _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    return IERC165(nftTokenAddress).supportsInterface(_INTERFACE_ID_ERC1155);
  }

  /// @dev Throws if called by any account other than the basket manager
  modifier onlyBasketManager() {
    require(_basketManager == msg.sender, "GSB:E-109");
    _;
  }
}
