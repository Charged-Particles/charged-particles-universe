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

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "../../../interfaces/ISmartBasketB.sol";
import "../../../interfaces/ITokenInfoProxy.sol";
import "../../../lib/TokenInfo.sol";
import "../../../lib/NftTokenType.sol";
import "../../../lib/BlackholePrevention.sol";

/**
 * @notice Generic ERC721-Token Smart-Basket
 * @dev Non-upgradeable Contract
 */
contract GenericSmartBasketB is ISmartBasketB, BlackholePrevention, IERC721Receiver, ERC1155Receiver {
  using TokenInfo for address;
  using NftTokenType for address;

  address internal _basketManager;

  // NFT TokenUUID => ERC1155 Balance
  mapping (uint256 => uint256) internal _nftContractTokenBalance;
  uint256 internal _nestedNftCount;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(ITokenInfoProxy /* tokenInfoProxy */) public {
    require(_basketManager == address(0x0), "GSB:E-002");
    _basketManager = msg.sender;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function getNestedNftCount() external view override returns (uint256) {
    return _nestedNftCount;
  }

  function getTokenCountByType(address contractAddress, uint256 tokenId) external view override returns (uint256) {
    return _nftContractTokenBalance[contractAddress.getTokenUUID(tokenId)];
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

  function addToBasket(address contractAddress, uint256 tokenId, uint256 nftTokenAmount)
    external
    override
    onlyBasketManager
    returns (bool)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    _nftContractTokenBalance[uuid] += nftTokenAmount;
    _nestedNftCount += nftTokenAmount;
    return true;
  }

  function removeFromBasket(address receiver, address contractAddress, uint256 tokenId, uint256 nftTokenAmount)
    external
    override
    onlyBasketManager
    returns (bool)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    _nftContractTokenBalance[uuid] -= nftTokenAmount;
    _nestedNftCount -= nftTokenAmount;

    if (contractAddress.isERC1155()) {
      IERC1155(contractAddress).safeTransferFrom(address(this), receiver, tokenId, nftTokenAmount, "");
    } else {
      IERC721(contractAddress).safeTransferFrom(address(this), receiver, tokenId);
    }
    return true;
  }

  function withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsAmount)
    external
    override
    onlyBasketManager
    returns (uint256)
  {
    address self = address(this);
    IERC20 rewardsToken = IERC20(rewardsTokenAddress);

    uint256 walletBalance = rewardsToken.balanceOf(self);
    require(walletBalance >= rewardsAmount, "GSB:E-411");

    // Transfer Rewards to Receiver
    rewardsToken.safeTransfer(receiver, rewardsAmount);
    return rewardsAmount;
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

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external virtual override onlyBasketManager {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev Throws if called by any account other than the basket manager
  modifier onlyBasketManager() {
    require(_basketManager == msg.sender, "GSB:E-109");
    _;
  }
}
