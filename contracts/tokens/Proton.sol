// SPDX-License-Identifier: MIT

// Proton.sol -- Charged Particles
// Copyright (c) 2019, 2020 Rob Secord <robsecord.eth>
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

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/IUniverse.sol";
import "../interfaces/IChargedParticles.sol";

contract Proton is ERC721, Ownable, ReentrancyGuard {
  using SafeMath for uint256;
  using Address for address payable;
  using Counters for Counters.Counter;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;   // 10000  (100%)
  uint256 constant internal MAX_ROYALTIES = 5e3;      // 5000   (50%)

  event UniverseSet(address indexed universe);
  event ChargedParticlesSet(address indexed chargedParticles);
  event MintFeeSet(uint256 fee);
  event SalePriceSet(uint256 indexed tokenId, uint256 salePrice);
  event CreatorRoyaltiesSet(uint256 indexed tokenId, uint256 royaltiesPct);
  event ProtonSold(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner, uint256 salePrice, address creator, uint256 creatorRoyalties);
  event FeesWithdrawn(address indexed receiver, uint256 amount);

  IUniverse internal _universe;
  IChargedParticles internal _chargedParticles;

  Counters.Counter internal _tokenIds;

  mapping (uint256 => address) internal _tokenCreator;
  mapping (uint256 => uint256) internal _tokenCreatorRoyaltiesPct;
  mapping (uint256 => uint256) internal _tokenSalePrice;
  mapping (uint256 => uint256) internal _tokenLastSellPrice;

  uint256 public mintFee;


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

  function createChargedParticle(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount,
    uint256 annuityPercent,
    bool burnToRelease
  )
    public
    payable
    nonReentrant
    requireMintFee
    returns (uint256 newTokenId)
  {
    return _createChargedParticle(
      creator,
      receiver,
      tokenMetaUri,
      liquidityProviderId,
      assetToken,
      assetAmount,
      annuityPercent,
      burnToRelease
    );
  }

  function createProton(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    uint256 annuityPercent,
    bool burnToRelease
  )
    public
    payable
    nonReentrant
    requireMintFee
    returns (uint256 newTokenId)
  {
    return _createProton(
      creator,
      receiver,
      tokenMetaUri,
      annuityPercent,
      burnToRelease
    );
  }

  function chargeParticle(
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    public
    nonReentrant
  {
    _chargeParticle(
      tokenId,
      liquidityProviderId,
      assetToken,
      assetAmount
    );
  }

  function releaseParticle(
    address receiver,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    onlyTokenOwnerOrApproved(tokenId)
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    return _releaseParticle(
      receiver,
      tokenId,
      liquidityProviderId,
      assetToken
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
    _tokenSalePrice[tokenId] = salePrice;
    emit SalePriceSet(tokenId, salePrice);
  }

  function setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct)
    external
    onlyTokenCreator(tokenId)
    onlyTokenOwnerOrApproved(tokenId)
  {
    require(royaltiesPct <= MAX_ROYALTIES, "Proton: INVALID_PCT");
    _tokenCreatorRoyaltiesPct[tokenId] = royaltiesPct;
    emit CreatorRoyaltiesSet(tokenId, royaltiesPct);
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

  function setMintFee(uint256 newMintFee) external onlyOwner {
    mintFee = newMintFee;
    emit MintFeeSet(newMintFee);
  }

  function withdrawFees(address payable receiver) external onlyOwner {
    uint256 amount = address(this).balance;
    if (amount > 0) {
      receiver.sendValue(amount);
      emit FeesWithdrawn(receiver, amount);
    }
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/




  function _createChargedParticle(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount,
    uint256 annuityPercent,
    bool burnToRelease
  )
    internal
    returns (uint256 newTokenId)
  {
    newTokenId = _createProton(creator, receiver, tokenMetaUri, annuityPercent, burnToRelease);

    _chargeParticle(newTokenId, liquidityProviderId, assetToken, assetAmount);

    _refundOverpayment();
  }

  function _createProton(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    uint256 annuityPercent,
    bool burnToRelease
  )
    internal
    returns (uint256 newTokenId)
  {
    require(address(_chargedParticles) != address(0x0), "Proton: charged particles not set");

    _tokenIds.increment();

    newTokenId = _tokenIds.current();
    _safeMint(receiver, newTokenId);
    _tokenCreator[newTokenId] = creator;

    _setTokenURI(newTokenId, tokenMetaUri);

    _chargedParticles.setCreatorConfigs(
      address(this),
      newTokenId,
      creator,
      annuityPercent,
      burnToRelease
    );

    _refundOverpayment();
  }

  function _chargeParticle(
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    internal
  {
    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    IERC20(assetToken).approve(address(_chargedParticles), assetAmount);

    _chargedParticles.energizeParticle(
      address(this),
      tokenId,
      liquidityProviderId,
      assetToken,
      assetAmount
    );
  }

  function _releaseParticle(
    address receiver,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    address self = address(this);
    (creatorAmount, receiverAmount) = _chargedParticles.releaseParticle(
      receiver,
      self,
      tokenId,
      liquidityProviderId,
      assetToken
    );

    if (creatorAmount == uint256(-1) && receiverAmount == 0) {
      // Release requires burn
      _burn(tokenId);

      (creatorAmount, receiverAmount) = _chargedParticles.finalizeRelease(
        receiver,
        self,
        tokenId,
        liquidityProviderId,
        assetToken
      );
    }
  }

  function _buyProton(uint256 tokenId)
    internal
    returns (bool)
  {
    uint256 salePrice = _tokenSalePrice[tokenId];
    require(salePrice > 0, "Proton: TOKEN_NOT_FOR_SALE");
    require(msg.value >= salePrice, "Proton: INSUFF_PAYMENT");

    uint256 ownerAmount = salePrice;
    uint256 creatorAmount;

    // Creator Royalties
    address creator = _tokenCreator[tokenId];
    uint256 royaltiesPct = _tokenCreatorRoyaltiesPct[tokenId];
    uint256 lastSellPrice = _tokenLastSellPrice[tokenId];
    if (royaltiesPct > 0 && lastSellPrice > 0 && salePrice > lastSellPrice) {
      creatorAmount = (salePrice - lastSellPrice).mul(royaltiesPct).div(PERCENTAGE_SCALE);
      ownerAmount = ownerAmount.sub(creatorAmount);
    }
    _tokenLastSellPrice[tokenId] = salePrice;

    // Transfer Token
    address oldOwner = ownerOf(tokenId);
    address newOwner = _msgSender();
    _transfer(oldOwner, newOwner, tokenId);

    // Transfer Payment
    payable(oldOwner).sendValue(ownerAmount);
    if (creatorAmount > 0) {
      payable(creator).sendValue(creatorAmount);
    }

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onProtonSale(address(this), tokenId, oldOwner, newOwner, salePrice, creator, creatorAmount);
    }

    emit ProtonSold(tokenId, oldOwner, newOwner, salePrice, creator, creatorAmount);

    _refundOverpayment();
    return true;
  }

  /**
    * @dev Collects the Required Asset Token from the users wallet
    * @param from         The owner address to collect the Assets from
    * @param assetAmount  The Amount of Asset Tokens to Collect
    */
  function _collectAssetToken(address from, address assetToken, uint256 assetAmount) internal {
    uint256 _userAssetBalance = IERC20(assetToken).balanceOf(from);
    require(assetAmount <= _userAssetBalance, "Proton: INSUFF_ASSETS");
    // Be sure to Approve this Contract to transfer your Asset Token
    require(IERC20(assetToken).transferFrom(from, address(this), assetAmount), "Proton: TRANSFER_FAILED");
  }

  function _refundOverpayment() internal {
    uint256 overage = msg.value.sub(mintFee);
    if (overage > 0) {
      payable(_msgSender()).sendValue(overage);
    }
  }

  function _transfer(address from, address to, uint256 tokenId) internal override {
    super._transfer(from, to, tokenId);
    _tokenSalePrice[tokenId] = 0;
  }

  modifier requireMintFee() {
    require(msg.value >= mintFee, "Proton: INSUFF_FEE");
    _;
  }

  modifier onlyTokenOwnerOrApproved(uint256 tokenId) {
    require(_isApprovedOrOwner(_msgSender(), tokenId), "Proton: NOT_OWNER_OR_OPERATOR");
    _;
  }

  modifier onlyTokenCreator(uint256 tokenId) {
    require(_tokenCreator[tokenId] == _msgSender(), "Proton: NOT_CREATOR");
    _;
  }
}