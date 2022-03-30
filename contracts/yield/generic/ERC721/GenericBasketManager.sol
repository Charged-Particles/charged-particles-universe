// SPDX-License-Identifier: MIT

// GenericBasketManager.sol -- Part of the Charged Particles Protocol
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
import "@openzeppelin/contracts/utils/Counters.sol";
import "../../../interfaces/IBasketManager.sol";
import "../../../interfaces/ISmartBasket.sol";
import "../../../lib/BlackholePrevention.sol";
import "../../../lib/TokenInfo.sol";
import "./GenericSmartBasket.sol";

/**
 * @notice Generic ERC721 Basket Manager
 * @dev Non-upgradeable Contract
 */
contract GenericBasketManager is Ownable, BlackholePrevention, IBasketManager {
  using Counters for Counters.Counter;
  using TokenInfo for address;

  // The Controller Contract Address
  address internal _controller;

  // Template Contract for creating Token Smart-Baskets
  address internal _basketTemplate;

  //       TokenID => Token Smart-Basket Address
  mapping (uint256 => address) internal _baskets;

  mapping (uint256 => Counters.Counter) internal _totalTokens;

  // State of Basket Manager
  bool internal _paused;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor () public {
    _basketTemplate = address(new GenericSmartBasket());
  }

  /***********************************|
  |              Public               |
  |__________________________________*/

  function isPaused() external view override returns (bool) {
    return _paused;
  }

  function getTokenTotalCount(
    address contractAddress,
    uint256 tokenId
  )
    external
    view
    override
    returns (uint256)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    return _totalTokens[uuid].current();
  }

  function getTokenCountByType(
    address contractAddress,
    uint256 tokenId,
    address basketTokenAddress,
    uint256 basketTokenId
  )
    external
    override
    returns (uint256)
  {
    address basket = getBasketAddressById(contractAddress, tokenId);
    return GenericSmartBasket(basket).getTokenCountByType(basketTokenAddress, basketTokenId);
  }

  function prepareTransferAmount(uint256 /* nftTokenAmount */) external override onlyController {
    // no-op
  }

  function addToBasket(
    address contractAddress,
    uint256 tokenId,
    address basketTokenAddress,
    uint256 basketTokenId
  )
    public
    override
    onlyController
    whenNotPaused
    returns (bool added)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];

    added = GenericSmartBasket(basket).addToBasket(basketTokenAddress, basketTokenId);

    // Log Event
    if (added) {
      _totalTokens[uuid].increment();
      emit BasketAdd(contractAddress, tokenId, basketTokenAddress, basketTokenId, 1);
    }
  }


  function removeFromBasket(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    address basketTokenAddress,
    uint256 basketTokenId
  )
    public
    override
    onlyController
    returns (bool removed)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];
    require(basket != address(0x0), "GBM:E-403");

    removed = GenericSmartBasket(basket).removeFromBasket(receiver, basketTokenAddress, basketTokenId);

    // Log Event
    if (removed) {
      _totalTokens[uuid].decrement();
      emit BasketRemove(receiver, contractAddress, tokenId, basketTokenAddress, basketTokenId, 1);
    }
  }

  function withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsAmount)
    external
    override
    onlyController
    returns (uint256 amount)
  {
    // no-op
  }

  function executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes memory encodedParams)
    public
    override
    onlyController
    returns (bytes memory)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];
    return GenericSmartBasket(basket).executeForAccount(externalAddress, ethValue, encodedParams);
  }

  function getBasketAddressById(address contractAddress, uint256 tokenId)
    public
    override
    onlyController
    returns (address)
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];

    // Create Smart-Basket if none exists
    if (basket == address(0x0)) {
      basket = _createBasket();
      _baskets[uuid] = basket;

      emit NewSmartBasket(contractAddress, tokenId, basket);
    }

    return basket;
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Sets the Paused-state of the Basket Manager
    */
  function setPausedState(bool paused) external onlyOwner {
    _paused = paused;
    emit PausedStateSet(paused);
  }

  /**
    * @dev Connects to the Charged Particles Controller
    */
  function setController(address controller) external onlyOwner {
    _controller = controller;
    emit ControllerSet(controller);
  }

  function withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];
    _withdrawEther(receiver, amount);
    return ISmartBasket(basket).withdrawEther(receiver, amount);
  }

  function withdrawERC20(address contractAddress, uint256 tokenId, address payable receiver, address tokenAddress, uint256 amount)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];
    _withdrawERC20(receiver, tokenAddress, amount);
    return ISmartBasket(basket).withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];
    _withdrawERC721(receiver, nftTokenAddress, nftTokenId);
    return ISmartBasket(basket).withdrawERC721(receiver, nftTokenAddress, nftTokenId);
  }

  function withdrawERC1155(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId, uint256 amount)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address basket = _baskets[uuid];
    _withdrawERC1155(receiver, nftTokenAddress, nftTokenId, amount);
    return ISmartBasket(basket).withdrawERC1155(receiver, nftTokenAddress, nftTokenId, amount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getTokenUUID(address contractAddress, uint256 tokenId) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(contractAddress, tokenId)));
  }

  function _createBasket()
    internal
    returns (address)
  {
    address newBasket = _createClone(_basketTemplate);
    GenericSmartBasket(newBasket).initialize();
    return newBasket;
  }

  /**
    * @dev Creates Contracts from a Template via Cloning
    * see: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1167.md
    */
  function _createClone(address target) internal returns (address result) {
    bytes20 targetBytes = bytes20(target);
    assembly {
      let clone := mload(0x40)
      mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      mstore(add(clone, 0x14), targetBytes)
      mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      result := create(0, clone, 0x37)
    }
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any account other than the Controller contract
  modifier onlyController() {
    require(_controller == msg.sender, "GBM:E-108");
    _;
  }

  // Throws if called by any account other than the Charged Particles Escrow Controller.
  modifier whenNotPaused() {
    require(_paused != true, "GBM:E-101");
    _;
  }

}
