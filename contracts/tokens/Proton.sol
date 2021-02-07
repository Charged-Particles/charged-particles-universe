// SPDX-License-Identifier: MIT

// Proton.sol -- Part of the Charged Particles Protocol
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
pragma experimental ABIEncoderV2;

import "../lib/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/IUniverse.sol";
import "../interfaces/IChargedState.sol";
import "../interfaces/IChargedSettings.sol";
import "../interfaces/IChargedParticles.sol";

import "../lib/BlackholePrevention.sol";
import "../lib/RelayRecipient.sol";


contract Proton is ERC721, Ownable, RelayRecipient, ReentrancyGuard, BlackholePrevention {
  using SafeMath for uint256;
  using Address for address payable;
  using Counters for Counters.Counter;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;   // 10000  (100%)
  uint256 constant internal MAX_ROYALTIES = 8e3;      // 8000   (80%)

  event UniverseSet(address indexed universe);
  event ChargedStateSet(address indexed chargedState);
  event ChargedSettingsSet(address indexed chargedSettings);
  event ChargedParticlesSet(address indexed chargedParticles);
  event SalePriceSet(uint256 indexed tokenId, uint256 salePrice);
  event CreatorRoyaltiesSet(uint256 indexed tokenId, uint256 royaltiesPct);
  event FeesWithdrawn(address indexed receiver, uint256 amount);
  event ProtonSold(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner, uint256 salePrice, address creator, uint256 creatorRoyalties);

  IUniverse internal _universe;
  IChargedState internal _chargedState;
  IChargedSettings internal _chargedSettings;
  IChargedParticles internal _chargedParticles;

  Counters.Counter internal _tokenIds;

  mapping (uint256 => address) internal _tokenCreator;
  mapping (uint256 => uint256) internal _tokenCreatorRoyaltiesPct;
  mapping (uint256 => address) internal _tokenCreatorRoyaltiesRedirect;

  mapping (uint256 => uint256) internal _tokenSalePrice;
  mapping (uint256 => uint256) internal _tokenLastSellPrice;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor() public ERC721("Charged Particles - Proton", "PROTON") {}


  /***********************************|
  |              Public               |
  |__________________________________*/

  function creatorOf(uint256 tokenId) public view returns (address) {
    return _tokenCreator[tokenId];
  }

  function getSalePrice(uint256 tokenId) public view returns (uint256) {
    return _tokenSalePrice[tokenId];
  }

  function getLastSellPrice(uint256 tokenId) public view returns (uint256) {
    return _tokenLastSellPrice[tokenId];
  }

  function getCreatorRoyalties(uint256 tokenId) public view returns (uint256) {
    return _tokenCreatorRoyaltiesPct[tokenId];
  }

  function getCreatorRoyaltiesReceiver(uint256 tokenId) public view returns (address) {
    return _creatorRoyaltiesReceiver(tokenId);
  }

  function createChargedParticle(
    address creator,
    address receiver,
    address referrer,
    string memory tokenMetaUri,
    string memory walletManagerId,
    address assetToken,
    uint256 assetAmount,
    uint256 annuityPercent
  )
    external
    nonReentrant
    returns (uint256 newTokenId)
  {
    newTokenId = _createChargedParticle(
      creator,
      receiver,
      referrer,
      tokenMetaUri,
      walletManagerId,
      assetToken,
      assetAmount,
      annuityPercent
    );
  }

  function createBasicProton(
    address creator,
    address receiver,
    string memory tokenMetaUri
  )
    external
    returns (uint256 newTokenId)
  {
    newTokenId = _createProton(
      creator,
      receiver,
      tokenMetaUri,
      0, // annuityPercent,
      0, // royaltiesPercent
      0  // salePrice
    );
  }

  function createProton(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    uint256 annuityPercent
  )
    external
    returns (uint256 newTokenId)
  {
    newTokenId = _createProton(
      creator,
      receiver,
      tokenMetaUri,
      annuityPercent,
      0, // royaltiesPercent
      0  // salePrice
    );
  }

  function createProtonForSale(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    uint256 annuityPercent,
    uint256 royaltiesPercent,
    uint256 salePrice
  )
    external
    returns (uint256 newTokenId)
  {
    newTokenId = _createProton(
      creator,
      receiver,
      tokenMetaUri,
      annuityPercent,
      royaltiesPercent,
      salePrice
    );
  }

  function batchProtonsForSale(
    address creator,
    uint256 annuityPercent,
    uint256 royaltiesPercent,
    string[] calldata tokenMetaUris,
    uint256[] calldata salePrices
  )
    external
  {
    _batchProtonsForSale(
      creator,
      annuityPercent,
      royaltiesPercent,
      tokenMetaUris,
      salePrices
    );
  }

  function buyProton(uint256 tokenId)
    external
    payable
    nonReentrant
    returns (bool)
  {
    return _buyProton(tokenId);
  }

  /***********************************|
  |     Only Token Creator/Owner      |
  |__________________________________*/

  function setSalePrice(uint256 tokenId, uint256 salePrice)
    external
    onlyTokenOwnerOrApproved(tokenId)
  {
    _setSalePrice(tokenId, salePrice);
  }

  function setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct)
    external
    onlyTokenCreator(tokenId)
    onlyTokenOwnerOrApproved(tokenId)
  {
    _setRoyaltiesPct(tokenId, royaltiesPct);
  }

  function setCreatorRoyaltiesReceiver(uint256 tokenId, address receiver)
    external
    onlyTokenCreator(tokenId)
  {
    _tokenCreatorRoyaltiesRedirect[tokenId] = receiver;
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the ChargedParticles Interface
    */
  function setUniverse(address universe) external onlyOwner {
    _universe = IUniverse(universe);
    emit UniverseSet(universe);
  }

  /**
    * @dev Setup the ChargedParticles Interface
    */
  function setChargedParticles(address chargedParticles) external onlyOwner {
    _chargedParticles = IChargedParticles(chargedParticles);
    emit ChargedParticlesSet(chargedParticles);
  }

  /// @dev Setup the Charged-State Controller
  function setChargedState(address stateController) external virtual onlyOwner {
    _chargedState = IChargedState(stateController);
    emit ChargedStateSet(stateController);
  }

  /// @dev Setup the Charged-Settings Controller
  function setChargedSettings(address settings) external onlyOwner {
    _chargedSettings = IChargedSettings(settings);
    emit ChargedSettingsSet(settings);
  }

  function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
    trustedForwarder = _trustedForwarder;
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


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _setSalePrice(uint256 tokenId, uint256 salePrice) internal {
    // Temp-Lock/Unlock NFT
    //  prevents front-running the sale and draining the value of the NFT just before sale
    _chargedState.setTemporaryLock(address(this), tokenId, (salePrice > 0));

    _tokenSalePrice[tokenId] = salePrice;
    emit SalePriceSet(tokenId, salePrice);
  }

  function _setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct) internal {
    require(royaltiesPct <= MAX_ROYALTIES, "Proton:E-421");
    _tokenCreatorRoyaltiesPct[tokenId] = royaltiesPct;
    emit CreatorRoyaltiesSet(tokenId, royaltiesPct);
  }

  function _creatorRoyaltiesReceiver(uint256 tokenId) internal view returns (address) {
    address receiver = _tokenCreatorRoyaltiesRedirect[tokenId];
    if (receiver == address(0x0)) {
      receiver = _tokenCreator[tokenId];
    }
    return receiver;
  }

  function _createChargedParticle(
    address creator,
    address receiver,
    address referrer,
    string memory tokenMetaUri,
    string memory walletManagerId,
    address assetToken,
    uint256 assetAmount,
    uint256 annuityPercent
  )
    internal
    returns (uint256 newTokenId)
  {
    require(address(_chargedParticles) != address(0x0), "Proton:E-107");

    newTokenId = _createProton(creator, receiver, tokenMetaUri, annuityPercent, 0, 0);

    _chargeParticle(newTokenId, walletManagerId, assetToken, assetAmount, referrer);
  }

  function _createProton(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    uint256 annuityPercent,
    uint256 royaltiesPercent,
    uint256 salePrice
  )
    internal
    returns (uint256 newTokenId)
  {
    _tokenIds.increment();

    newTokenId = _tokenIds.current();
    _safeMint(receiver, newTokenId, "");
    _tokenCreator[newTokenId] = creator;

    _setTokenURI(newTokenId, tokenMetaUri);

    if (royaltiesPercent > 0) {
      _setRoyaltiesPct(newTokenId, royaltiesPercent);
    }

    if (salePrice > 0) {
      _setSalePrice(newTokenId, salePrice);
    }

    if (annuityPercent > 0) {
      _chargedSettings.setCreatorAnnuities(
        address(this),
        newTokenId,
        creator,
        annuityPercent
      );
    }
  }

  function _batchProtonsForSale(
    address creator,
    uint256 annuityPercent,
    uint256 royaltiesPercent,
    string[] calldata tokenMetaUris,
    uint256[] calldata salePrices
  )
    internal
  {
    require(tokenMetaUris.length == salePrices.length, "Proton:E-202");
    address self = address(this);

    uint256 count = tokenMetaUris.length;
    for (uint256 i = 0; i < count; i++) {
      _tokenIds.increment();
      uint256 newTokenId = _tokenIds.current();

      _safeMint(creator, newTokenId, "");
      _tokenCreator[newTokenId] = creator;

      _setTokenURI(newTokenId, tokenMetaUris[i]);

      if (royaltiesPercent > 0) {
        _setRoyaltiesPct(newTokenId, royaltiesPercent);
      }

      uint256 salePrice = salePrices[i];
      if (salePrice > 0) {
        _setSalePrice(newTokenId, salePrice);
      }

      if (annuityPercent > 0) {
        _chargedSettings.setCreatorAnnuities(
          self,
          newTokenId,
          creator,
          annuityPercent
        );
      }
    }
  }

  function _chargeParticle(
    uint256 tokenId,
    string memory walletManagerId,
    address assetToken,
    uint256 assetAmount,
    address referrer
  )
    internal
  {
    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    IERC20(assetToken).approve(address(_chargedParticles), assetAmount);

    _chargedParticles.energizeParticle(
      address(this),
      tokenId,
      walletManagerId,
      assetToken,
      assetAmount,
      referrer
    );
  }

  function _buyProton(uint256 tokenId)
    internal
    returns (bool)
  {
    uint256 salePrice = _tokenSalePrice[tokenId];
    require(salePrice > 0, "Proton:E-416");
    require(msg.value >= salePrice, "Proton:E-414");

    uint256 ownerAmount = salePrice;
    uint256 creatorAmount;
    address oldOwner = ownerOf(tokenId);
    address newOwner = _msgSender();

    // Creator Royalties
    address royaltiesReceiver = _creatorRoyaltiesReceiver(tokenId);
    uint256 royaltiesPct = _tokenCreatorRoyaltiesPct[tokenId];
    uint256 lastSellPrice = _tokenLastSellPrice[tokenId];
    if (royaltiesPct > 0 && lastSellPrice > 0 && salePrice > lastSellPrice) {
      creatorAmount = (salePrice - lastSellPrice).mul(royaltiesPct).div(PERCENTAGE_SCALE);
      ownerAmount = ownerAmount.sub(creatorAmount);
    }
    _tokenLastSellPrice[tokenId] = salePrice;

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onProtonSale(address(this), tokenId, oldOwner, newOwner, salePrice, royaltiesReceiver, creatorAmount);
    }

    // Unlock NFT
    _chargedState.setTemporaryLock(address(this), tokenId, false);

    // Transfer Token
    _transfer(oldOwner, newOwner, tokenId);

    // Transfer Payment
    payable(oldOwner).sendValue(ownerAmount);
    if (creatorAmount > 0) {
      payable(royaltiesReceiver).sendValue(creatorAmount);
    }

    emit ProtonSold(tokenId, oldOwner, newOwner, salePrice, royaltiesReceiver, creatorAmount);

    _refundOverpayment(salePrice);
    return true;
  }

  /**
    * @dev Collects the Required Asset Token from the users wallet
    * @param from         The owner address to collect the Assets from
    * @param assetAmount  The Amount of Asset Tokens to Collect
    */
  function _collectAssetToken(address from, address assetToken, uint256 assetAmount) internal {
    uint256 _userAssetBalance = IERC20(assetToken).balanceOf(from);
    require(assetAmount <= _userAssetBalance, "Proton:E-411");
    // Be sure to Approve this Contract to transfer your Asset Token
    require(IERC20(assetToken).transferFrom(from, address(this), assetAmount), "Proton:E-401");
  }

  function _refundOverpayment(uint256 threshold) internal {
    uint256 overage = msg.value.sub(threshold);
    if (overage > 0) {
      payable(_msgSender()).sendValue(overage);
    }
  }

  function _transfer(address from, address to, uint256 tokenId) internal override {
    _tokenSalePrice[tokenId] = 0;
    super._transfer(from, to, tokenId);
  }


  /***********************************|
  |          GSN/MetaTx Relay         |
  |__________________________________*/

  /// @dev See {BaseRelayRecipient-_msgSender}.
  function _msgSender()
    internal
    view
    virtual
    override(BaseRelayRecipient, Context)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  /// @dev See {BaseRelayRecipient-_msgData}.
  function _msgData()
    internal
    view
    virtual
    override(BaseRelayRecipient, Context)
    returns (bytes memory)
  {
    return BaseRelayRecipient._msgData();
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  modifier onlyTokenOwnerOrApproved(uint256 tokenId) {
    require(_isApprovedOrOwner(_msgSender(), tokenId), "Proton:E-105");
    _;
  }

  modifier onlyTokenCreator(uint256 tokenId) {
    require(_tokenCreator[tokenId] == _msgSender(), "Proton:E-104");
    _;
  }
}