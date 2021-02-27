// SPDX-License-Identifier: MIT

// Lepton.sol -- Part of the Charged Particles Protocol
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

import "../lib/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/ILepton.sol";
import "../lib/BlackholePrevention.sol";


contract Lepton is ILepton, ERC721, Ownable, ReentrancyGuard, BlackholePrevention {
  using SafeMath for uint256;
  using Address for address payable;
  using Counters for Counters.Counter;

  Counters.Counter internal _tokenIds;
  Classification[] internal _leptonTypes;
  mapping (uint256 => Classification) internal _leptonData;

  uint256 internal _typeIndex;
  uint256 internal _maxSupply;
  uint256 internal _maxMintPerTx;
  bool internal _paused;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor() public ERC721("Charged Particles - Lepton", "LEPTON") {
    _paused = true;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function mintLepton() external payable virtual override nonReentrant whenNotPaused returns (uint256 newTokenId) {
    newTokenId = _mintLepton(msg.sender);
  }

  function batchMintLepton(uint256 count) external payable virtual override nonReentrant whenNotPaused {
    _batchMintLepton(msg.sender, count);
  }

  function getNextType() external view virtual override returns (uint256) {
    if (_typeIndex >= _leptonTypes.length) { return 0; }
    return _typeIndex;
  }

  function getNextPrice() external view virtual override returns (uint256) {
    if (_typeIndex >= _leptonTypes.length) { return 0; }
    return _leptonTypes[_typeIndex].price;
  }

  function getMultiplier(uint256 tokenId) external view virtual override returns (uint256) {
    return _leptonData[tokenId].multiplier;
  }

  function getBonus(uint256 tokenId) external view virtual override returns (uint256) {
    return _leptonData[tokenId].bonus;
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function addLeptonType(
    string calldata tokenUri,
    uint256 price,
    uint32 supply,
    uint32 multiplier,
    uint32 bonus
  )
    external
    virtual
    onlyOwner
  {
    _maxSupply = _maxSupply.add(uint256(supply));

    Classification memory lepton = Classification({
      tokenUri: tokenUri,
      price: price,
      supply: supply,
      multiplier: multiplier,
      bonus: bonus,
      _upperBounds: uint128(_maxSupply)
    });
    _leptonTypes.push(lepton);

    emit LeptonTypeAdded(tokenUri, price, supply, multiplier, bonus, _maxSupply);
  }

  function updateLeptonType(
    uint256 leptonIndex,
    string calldata tokenUri,
    uint256 price,
    uint32 supply,
    uint32 multiplier,
    uint32 bonus
  )
    external
    virtual
    onlyOwner
  {
    _leptonTypes[leptonIndex].tokenUri = tokenUri;
    _leptonTypes[leptonIndex].price = price;
    _leptonTypes[leptonIndex].supply = supply;
    _leptonTypes[leptonIndex].multiplier = multiplier;
    _leptonTypes[leptonIndex].bonus = bonus;

    emit LeptonTypeUpdated(leptonIndex, tokenUri, price, supply, multiplier, bonus, _maxSupply);
  }

  function setMaxMintPerTx(uint256 maxAmount) external virtual  onlyOwner {
    _maxMintPerTx = maxAmount;
    emit MaxMintPerTxSet(maxAmount);
  }

  function setPausedState(bool state) external virtual  onlyOwner {
    _paused = state;
    emit PausedStateSet(state);
  }


  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external virtual onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external virtual onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _mintLepton(address receiver) internal virtual returns (uint256 newTokenId) {
    require(_typeIndex < _leptonTypes.length, "LPT:E-408");

    Classification memory lepton = _leptonTypes[_typeIndex];
    require(msg.value >= lepton.price, "LPT:E-414");

    _tokenIds.increment();
    newTokenId = _tokenIds.current();

    _leptonData[newTokenId] = lepton;
    _safeMint(receiver, newTokenId, "");
    _setTokenURI(newTokenId, lepton.tokenUri);

    // Distribute Next Type
    if (newTokenId == lepton._upperBounds) {
      _typeIndex = _typeIndex.add(1);
    }

    emit LeptonMinted(receiver, newTokenId, lepton.price, lepton.multiplier);

    _refundOverpayment(lepton.price);
  }


  function _batchMintLepton(address receiver, uint256 count) internal virtual {
    require(_typeIndex < _leptonTypes.length, "LPT:E-408");
    require(_maxMintPerTx == 0 || count <= _maxMintPerTx, "LPT:E-429");

    Classification memory lepton = _leptonTypes[_typeIndex];

    uint256 startTokenId = _tokenIds.current();
    uint256 endTokenId = startTokenId.add(count);
    if (endTokenId > lepton._upperBounds) {
      count = count.sub(endTokenId.sub(lepton._upperBounds));
    }

    uint256 salePrice = lepton.price.mul(count);
    require(msg.value >= salePrice, "LPT:E-414");

    _safeMintBatch(receiver, startTokenId.add(1), count, "");

    for (uint i = 0; i < count; i++) {
      _tokenIds.increment();
      startTokenId = _tokenIds.current();

      _leptonData[startTokenId] = lepton;
      _setTokenURI(startTokenId, lepton.tokenUri);
    }

    // Distribute Next Type
    if (startTokenId >= lepton._upperBounds) {
      _typeIndex = _typeIndex.add(1);
    }

    emit LeptonBatchMinted(receiver, startTokenId, count, lepton.price, lepton.multiplier);

    _refundOverpayment(salePrice);
  }

  function _refundOverpayment(uint256 threshold) internal virtual {
    uint256 overage = msg.value.sub(threshold);
    if (overage > 0) {
      payable(_msgSender()).sendValue(overage);
    }
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  modifier whenNotPaused() {
      require(!_paused, "LPT:E-101");
      _;
  }
}