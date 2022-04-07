// SPDX-License-Identifier: MIT

// ProtonB.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/IUniverse.sol";
import "../interfaces/IChargedState.sol";
import "../interfaces/IChargedSettings.sol";
import "../interfaces/IChargedParticles.sol";
import "../interfaces/IProtonB.sol";

import "../lib/BaseProton.sol";
import "../lib/TokenInfo.sol";
import "../lib/BlackholePrevention.sol";
import "../lib/RelayRecipient.sol";


contract ProtonB is BaseProton, IProtonB {
  using SafeMath for uint256;
  using TokenInfo for address payable;
  using Counters for Counters.Counter;

  IUniverse internal _universe;
  IChargedState internal _chargedState;
  IChargedSettings internal _chargedSettings;
  IChargedParticles internal _chargedParticles;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor() public BaseProton("Charged Particles - ProtonB", "PROTON.B") {}


  /***********************************|
  |              Public               |
  |__________________________________*/

  function createProtonForSale(
    address creator,
    address receiver,
    string memory tokenMetaUri,
    uint256 annuityPercent,
    uint256 royaltiesPercent,
    uint256 salePrice
  )
    external
    virtual
    override
    returns (uint256 newTokenId)
  {
    newTokenId = _createProton(
      creator,
      receiver,
      tokenMetaUri,
      royaltiesPercent,
      salePrice
    );

    if (annuityPercent > 0) {
      _chargedSettings.setCreatorAnnuities(
        address(this),
        newTokenId,
        creator,
        annuityPercent
      );
    }
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
    virtual
    override
    nonReentrant
    whenNotPaused
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

  /// @dev for backwards compatibility with v1
  function createBasicProton(
    address creator,
    address receiver,
    string memory tokenMetaUri
  )
    external
    virtual
    whenNotPaused
    returns (uint256 newTokenId)
  {
    newTokenId = _createProton(
      creator,
      receiver,
      tokenMetaUri,
      0, // royaltiesPercent
      0  // salePrice
    );
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the ChargedParticles Interface
    */
  function setUniverse(address universe) external virtual onlyOwner {
    _universe = IUniverse(universe);
    emit UniverseSet(universe);
  }

  /**
    * @dev Setup the ChargedParticles Interface
    */
  function setChargedParticles(address chargedParticles) external virtual onlyOwner {
    _chargedParticles = IChargedParticles(chargedParticles);
    emit ChargedParticlesSet(chargedParticles);
  }

  /// @dev Setup the Charged-State Controller
  function setChargedState(address stateController) external virtual onlyOwner {
    _chargedState = IChargedState(stateController);
    emit ChargedStateSet(stateController);
  }

  /// @dev Setup the Charged-Settings Controller
  function setChargedSettings(address settings) external virtual onlyOwner {
    _chargedSettings = IChargedSettings(settings);
    emit ChargedSettingsSet(settings);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

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
    virtual
    returns (uint256 newTokenId)
  {
    require(address(_chargedParticles) != address(0x0), "PRT:E-107");

    newTokenId = _createProton(creator, receiver, tokenMetaUri, 0, 0);

    if (annuityPercent > 0) {
      _chargedSettings.setCreatorAnnuities(
        address(this),
        newTokenId,
        creator,
        annuityPercent
      );
    }

    _chargeParticle(newTokenId, walletManagerId, assetToken, assetAmount, referrer);
  }

  function _chargeParticle(
    uint256 tokenId,
    string memory walletManagerId,
    address assetToken,
    uint256 assetAmount,
    address referrer
  )
    internal
    virtual
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


  /***********************************|
  |        Function Overrides         |
  |__________________________________*/

  function _setSalePrice(uint256 tokenId, uint256 salePrice) internal virtual override {
    super._setSalePrice(tokenId, salePrice);

    // Temp-Lock/Unlock NFT
    //  prevents front-running the sale and draining the value of the NFT just before sale
    _chargedState.setTemporaryLock(address(this), tokenId, (salePrice > 0));
  }


  function _buyProton(uint256 _tokenId, uint256 _gasLimit)
    internal
    virtual
    override
    returns (
      address contractAddress,
      uint256 tokenId,
      address oldOwner,
      address newOwner,
      uint256 salePrice,
      address royaltiesReceiver,
      uint256 creatorAmount
    )
  {
    (contractAddress, tokenId, oldOwner, newOwner, salePrice, royaltiesReceiver, creatorAmount) = super._buyProton(_tokenId, _gasLimit);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onProtonSale(contractAddress, tokenId, oldOwner, newOwner, salePrice, royaltiesReceiver, creatorAmount);
    }
  }


  function _transfer(address from, address to, uint256 tokenId) internal virtual override {
    // Unlock NFT
    _chargedState.setTemporaryLock(address(this), tokenId, false);

    super._transfer(from, to, tokenId);
  }
}