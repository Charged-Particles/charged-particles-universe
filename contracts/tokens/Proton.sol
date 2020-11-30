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

import "../interfaces/IChargedParticles.sol";

contract Proton is ERC721, Ownable {
  using SafeMath for uint256;
  using Counters for Counters.Counter;

  event ChargedParticlesSet(address indexed chargedParticles);
  event MintFeeSet(uint256 fee);
  event FeesWithdrawn(address indexed receiver, uint256 amount);

  IChargedParticles internal _chargedParticles;

  Counters.Counter internal _tokenIds;

  mapping (uint256 => address) internal _tokenCreator;

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
    requireMintFee
    returns (uint256 newTokenId)
  {
    newTokenId = createProton(creator, receiver, tokenMetaUri, annuityPercent, burnToRelease);

    chargedParticle(newTokenId, liquidityProviderId, assetToken, assetAmount);

    _refundOverpayment();
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
    requireMintFee
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

  function chargedParticle(
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    public
  {
    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    _chargedParticles.energizeParticle(
      address(this),
      tokenId,
      liquidityProviderId,
      assetToken,
      assetAmount
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
    emit ChargedParticlesSet(chargedParticles);
  }

  function setMintFee(uint256 newMintFee) external onlyOwner {
    mintFee = newMintFee;
    emit MintFeeSet(newMintFee);
  }

  function withdrawFees(address payable receiver) external onlyOwner {
    uint256 amount = address(this).balance;
    if (amount > 0) {
      receiver.transfer(amount);
      emit FeesWithdrawn(receiver, amount);
    }
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

  function _refundOverpayment() internal {
    uint256 overage = msg.value.sub(mintFee);
    if (overage > 0) {
      _msgSender().transfer(overage);
    }
  }

  modifier requireMintFee() {
    require(msg.value >= mintFee, "Proton: INSUFF_FEE");
    _;
  }
}