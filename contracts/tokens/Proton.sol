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
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../interfaces/IChargedParticles.sol";

contract Proton is ERC721, Ownable {
  using Counters for Counters.Counter;

  IChargedParticles internal _chargedParticles;

  Counters.Counter internal _tokenIds;

  mapping (uint256 => address) internal _tokenCreator;


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
    address receiver,
    string memory tokenURI,
    IChargedParticles.NftCreatorConfig calldata nftConfig,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    public
    returns (uint256 newTokenId)
  {
    require(address(_chargedParticles) != address(0x0), "Proton: charged particles not set");

    newTokenId = createProton(receiver, tokenURI, nftConfig);

    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    _chargedParticles.energizeParticle(
      address(this),
      newTokenId,
      liquidityProviderId,
      assetToken,
      assetAmount
    );
  }

  function createProton(
    address receiver,
    string memory tokenURI,
    IChargedParticles.NftCreatorConfig calldata nftConfig
  )
    public
    returns (uint256 newTokenId)
  {
    _tokenIds.increment();

    newTokenId = _tokenIds.current();
    _safeMint(receiver, newTokenId);
    _tokenCreator[newTokenId] = _msgSender();

    _setTokenURI(newTokenId, tokenURI);

    _chargedParticles.setCreatorConfigs(
      address(this),
      newTokenId,
      nftConfig
    );
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the ChargedParticles Interface
    */
  function setChargedParticles(address chargedParticles) external onlyOwner {
    _chargedParticles = IChargedParticles(chargedParticles);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

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
}