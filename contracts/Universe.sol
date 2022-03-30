// SPDX-License-Identifier: MIT

// Universe.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/ILepton.sol";
import "./lib/TokenInfo.sol";
import "./lib/BlackholePrevention.sol";


/**
 * @notice Charged Particles Universe Contract
 * @dev Upgradeable Contract
 */
contract Universe is IUniverse, Initializable, OwnableUpgradeable, BlackholePrevention {
  using SafeMathUpgradeable for uint256;
  using TokenInfo for address;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  // The ChargedParticles Contract Address
  address public chargedParticles;
  address public proton;
  address public lepton;
  address public quark;
  address public boson;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;  // 10000  (100%)

  // Positive Charge
  uint256 internal photonMaxSupply;
  uint256 internal totalPhotonDischarged;

  // Source of Positive Charge
  IERC20Upgradeable public photonSource;

  //   Asset Token => Electrostatic Attraction Multiplier
  mapping (address => uint256) internal esaMultiplier;

  //       Account => Electrostatic Attraction Levels
  mapping (address => uint256) internal esaLevel;

  // Energizing Account => Referral Source
  mapping (address => address) internal referralSource;

  // NFT Token UUID => Bonded Lepton Mass
  mapping (uint256 => uint256) internal bondedLeptonMass;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize() public initializer {
    __Ownable_init();
  }


  /***********************************|
  |         Public Functions          |
  |__________________________________*/

  function getStaticCharge(address account) external view virtual returns (uint256 positiveEnergy) {
    return esaLevel[account];
  }

  function conductElectrostaticDischarge(address account, uint256 amount) external virtual returns (uint256 positiveEnergy) {
    require(esaLevel[account] > 0, "UNI:E-411");
    require(photonSource.balanceOf(address(this)) > 0, "UNI:E-413");
    return _conductElectrostaticDischarge(account, amount);
  }


  /***********************************|
  |      Only Charged Particles       |
  |__________________________________*/

  function onEnergize(
    address sender,
    address referrer,
    address /* contractAddress */,
    uint256 /* tokenId */,
    string calldata /* walletManagerId */,
    address /* assetToken */,
    uint256 /* assetAmount */
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onDischarge(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address assetToken,
    uint256 creatorEnergy,
    uint256 receiverEnergy
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onDischargeForCreator(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address /* creator */,
    address assetToken,
    uint256 receiverEnergy
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onRelease(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address assetToken,
    uint256 principalAmount,
    uint256 creatorEnergy,
    uint256 receiverEnergy
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onCovalentBond(
    address contractAddress,
    uint256 tokenId,
    string calldata /* managerId */,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onCovalentBreak(
    address contractAddress,
    uint256 tokenId,
    string calldata /* managerId */,
    address nftTokenAddress,
    uint256 /* nftTokenId */,
    uint256 /* nftTokenAmount */
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onProtonSale(
    address contractAddress,
    uint256 tokenId,
    address oldOwner,
    address newOwner,
    uint256 salePrice,
    address creator,
    uint256 creatorRoyalties
  )
    external
    virtual
    override
    onlyProton
  {
    // no-op
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setChargedParticles(
    address controller
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(controller)
  {
    chargedParticles = controller;
    emit ChargedParticlesSet(controller);
  }

  function setPhoton(
    address token,
    uint256 maxSupply
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(token)
  {
    photonSource = IERC20Upgradeable(token);
    photonMaxSupply = maxSupply;
    emit PhotonSet(token, maxSupply);
  }

  function setProtonToken(
    address token
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(token)
  {
    proton = token;
    emit ProtonTokenSet(token);
  }

  function setLeptonToken(
    address token
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(token)
  {
    lepton = token;
    emit LeptonTokenSet(token);
  }

  function setQuarkToken(
    address token
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(token)
  {
    quark = token;
    emit QuarkTokenSet(token);
  }

  function setBosonToken(
    address token
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(token)
  {
    boson = token;
    emit BosonTokenSet(token);
  }

  function setEsaMultiplier(
    address assetToken,
    uint256 multiplier
  )
    external
    virtual
    onlyOwner
  {
    esaMultiplier[assetToken] = multiplier;
    emit EsaMultiplierSet(assetToken, multiplier);
  }

  function withdrawEther(address payable receiver, uint256 amount) external virtual onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external virtual onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external virtual onlyOwner {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }



  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _electrostaticAttraction(uint256 tokenUuid, address receiver, address assetToken, uint256 baseAmount) internal virtual {
    if (address(photonSource) == address(0x0) || receiver == address(0x0)) { return; }
    if (totalPhotonDischarged >= photonMaxSupply) { return; }

    uint256 energy = baseAmount.mul(esaMultiplier[assetToken]).div(PERCENTAGE_SCALE);
    uint256 bondedMass = bondedLeptonMass[tokenUuid];
    if (bondedMass > 0) {
      energy = energy.mul(bondedMass.add(PERCENTAGE_SCALE)).div(PERCENTAGE_SCALE);
    }
    if (totalPhotonDischarged.add(energy) > photonMaxSupply) {
      energy = photonMaxSupply.sub(totalPhotonDischarged);
    }
    totalPhotonDischarged = totalPhotonDischarged.add(energy);
    esaLevel[receiver] = esaLevel[receiver].add(energy);

    emit ElectrostaticAttraction(receiver, address(photonSource), energy, bondedMass);
  }

  function _conductElectrostaticDischarge(address account, uint256 energy) internal virtual returns (uint256) {
    uint256 electrostaticAttraction = esaLevel[account];
    if (energy > electrostaticAttraction) {
      energy = electrostaticAttraction;
    }

    uint256 bondable = photonSource.balanceOf(address(this));
    if (energy > bondable) {
      energy = bondable;
    }

    esaLevel[account] = esaLevel[account].sub(energy);
    photonSource.safeTransfer(account, energy);

    emit ElectrostaticDischarge(account, address(photonSource), energy);
    return energy;
  }

  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any non-account
  modifier onlyValidContractAddress(address account) {
    require(account != address(0x0) && account.isContract(), "UNI:E-417");
    _;
  }

  /// @dev Throws if called by any account other than the Charged Particles contract
  modifier onlyChargedParticles() {
    require(chargedParticles == msg.sender, "UNI:E-108");
    _;
  }

  /// @dev Throws if called by any account other than the Proton NFT contract
  modifier onlyProton() {
    require(proton == msg.sender, "UNI:E-110");
    _;
  }
}
