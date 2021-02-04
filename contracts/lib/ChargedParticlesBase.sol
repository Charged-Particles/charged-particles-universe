// SPDX-License-Identifier: MIT

// ChargedParticles.sol -- Part of the Charged Particles Protocol
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
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";

import "../interfaces/IERC721Chargeable.sol";
import "../interfaces/IUniverse.sol";
import "../interfaces/IChargedParticles.sol";
import "../interfaces/IWalletManager.sol";
import "../interfaces/IBasketManager.sol";

import "../lib/Bitwise.sol";
import "../lib/RelayRecipient.sol";


/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
abstract contract ChargedParticlesBase is
  IChargedParticles,
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  RelayRecipient,
  IERC721ReceiverUpgradeable
{
  using SafeMathUpgradeable for uint256;
  using Bitwise for uint256;

  //
  // Particle Terminology
  //
  //   Particle               - Non-fungible Token (NFT)
  //   Mass                   - Underlying Asset of a Token (ex; DAI)
  //   Charge                 - Accrued Interest on the Underlying Asset of a Token
  //   Charged Particle       - Any NFT that has a Mass and a Positive Charge
  //   Neutral Particle       - Any NFT that has a Mass and No Charge
  //   Energize / Recharge    - Deposit of an Underlying Asset into an NFT
  //   Discharge              - Withdraw the Accrued Interest of an NFT leaving the Particle with its initial Mass
  //   Release                - Withdraw the Underlying Asset & Accrued Interest of an NFT leaving the Particle with No Mass or Charge
  //
  //   Proton                 - NFTs minted from the Charged Particle Accelerator
  //                            - A proton is a subatomic particle, symbol p or p⁺, with a positive electric charge of +1e elementary
  //                              charge and a mass slightly less than that of a neutron.
  //   Photon                 - Membership Classification
  //                            - The photon is a type of elementary particle. It is the quantum of the electromagnetic field including
  //                              electromagnetic radiation such as light and radio waves, and the force carrier for the electromagnetic force.
  //                              Photons are massless, so they always move at the speed of light in vacuum.
  //   Ion                    - Platform Governance Token
  //                            - A charged subatomic particle. An atom or group of atoms that carries a positive or negative electric charge
  //                              as a result of having lost or gained one or more electrons.
  //

  // uint256 constant internal PERCENTAGE_SCALE = 1e4;   // 10000  (100%)
  uint256 constant internal MAX_ANNUITIES = 1e4;      // 10000  (100%)

  uint256 constant internal PERM_CHARGE_NFT        = 1;    // NFT Contracts that can have assets Deposited into them (Charged)
  uint256 constant internal PERM_BASKET_NFT        = 2;    // NFT Contracts that can have other NFTs Deposited into them
  uint256 constant internal PERM_TIMELOCK_ANY_NFT  = 4;    // NFT Contracts that can timelock any NFT on behalf of users (primarily used for Front-run Protection)
  uint256 constant internal PERM_TIMELOCK_OWN_NFT  = 8;    // NFT Contracts that can timelock their own NFTs on behalf of their users
  uint256 constant internal PERM_RESTRICTED_ASSETS = 16;   // NFT Contracts that have restricted deposits to specific assets

  // Current Settings for External NFT Token Contracts;
  //  - Any user can add any whitelisted ERC721 or ERC1155 token as a Charged Particle without Limits,
  //    unless the Owner of the ERC721 or ERC1155 token contract registers the token
  //    and sets the Custom Settings for their token(s)
  struct NftSettings {
    uint256 actionPerms;

    string requiredWalletManager;
    string requiredBasketManager;

    // ERC20
    mapping (address => bool) allowedAssetTokens;
    mapping (address => uint256) depositMin;  // Asset Token Address => Min
    mapping (address => uint256) depositMax;  // Asset Token Address => Max

    // ERC721 / ERC1155
    mapping (address => uint256) maxNfts;     // NFT Token Address => Max
  }

  // Optional Configs for individual NFTs set by NFT Creator
  struct CreatorSettings {
    uint256 annuityPercent;
    address annuityRedirect;
  }

  struct NftState {
    uint256 dischargeTimelock;
    uint256 releaseTimelock;
    uint256 tempLockExpiry;

    mapping (address => address) dischargeApproval;
    mapping (address => address) releaseApproval;
    mapping (address => address) timelockApproval;
  }

  // Linked Contracts
  IUniverse internal _universe;

  uint256 internal _depositCap;
  uint256 internal _tempLockExpiryBlocks;

  // Wallet/Basket Managers (by Unique Manager ID)
  mapping (string => IWalletManager) internal _ftWalletManager;
  mapping (string => IBasketManager) internal _nftBasketManager;

  // Settings for individual NFTs set by NFT Creator (by Token UUID)
  mapping (uint256 => CreatorSettings) internal _creatorSettings;

  // Settings for External NFT Token Contracts (by Token Contract Address)
  mapping (address => NftSettings) internal _nftSettings;

  // State of individual NFTs (by Token UUID)
  mapping (uint256 => NftState) internal _nftState;


  /***********************************|
  |         Public Functions          |
  |__________________________________*/

  function getTokenLockExpiry(address contractAddress, uint256 tokenId) external virtual override view returns (uint256 lockExpiry) {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    if (_nftState[tokenUuid].dischargeTimelock > block.number) {
      lockExpiry = _nftState[tokenUuid].dischargeTimelock;
    }

    if (_nftState[tokenUuid].releaseTimelock > block.number) {
      lockExpiry = _nftState[tokenUuid].releaseTimelock;
    }

    if (_nftState[tokenUuid].tempLockExpiry > block.number) {
      lockExpiry = _nftState[tokenUuid].tempLockExpiry;
    }
  }

  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external virtual override view returns (bool) {
    return _isTokenCreator(contractAddress, tokenId, account);
  }

  function getCreatorAnnuities(address contractAddress, uint256 tokenId) external virtual override view returns (address creator, uint256 annuityPct) {
    return _getCreatorAnnuity(contractAddress, tokenId);
  }

  function getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) external virtual override view returns (address) {
    return _getCreatorAnnuitiesRedirect(contractAddress, tokenId);
  }

  function isWalletManagerEnabled(string calldata walletManagerId) external virtual override view returns (bool) {
    return _isWalletManagerEnabled(walletManagerId);
  }

  function getWalletManager(string calldata walletManagerId) external virtual override view returns (address) {
    return address(_ftWalletManager[walletManagerId]);
  }

  function isNftBasketEnabled(string calldata basketId) external virtual override view returns (bool) {
    return _isNftBasketEnabled(basketId);
  }

  function getBasketManager(string calldata basketId) external virtual override view returns (address) {
    return address(_nftBasketManager[basketId]);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external virtual override returns (bytes4) {
    return IERC721ReceiverUpgradeable(0).onERC721Received.selector;
  }

  /// @notice Checks if an operator is allowed to Discharge a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForDischarge(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Release a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForRelease(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Timelock a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForTimelock(contractAddress, tokenId, operator);
  }

  /// @notice Gets the Amount of Asset Tokens that have been Deposited into the Particle
  /// representing the Mass of the Particle.
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param walletManagerId  The Liquidity-Provider ID to check the Asset balance of
  /// @param assetToken           The Address of the Asset Token to check
  /// @return The Amount of underlying Assets held within the Token
  function baseParticleMass(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    returns (uint256)
  {
    return _baseParticleMass(contractAddress, tokenId, walletManagerId, assetToken);
  }

  /// @notice Gets the amount of Interest that the Particle has generated representing
  /// the Charge of the Particle
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param walletManagerId  The Liquidity-Provider ID to check the Interest balance of
  /// @param assetToken           The Address of the Asset Token to check
  /// @return The amount of interest the Token has generated (in Asset Token)
  function currentParticleCharge(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    returns (uint256)
  {
    return _currentParticleCharge(contractAddress, tokenId, walletManagerId, assetToken);
  }

  /// @notice Gets the amount of LP Tokens that the Particle has generated representing
  /// the Kinetics of the Particle
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param walletManagerId  The Liquidity-Provider ID to check the Kinetics balance of
  /// @param assetToken           The Address of the Asset Token to check
  /// @return The amount of LP tokens that have been generated
  function currentParticleKinetics(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    returns (uint256)
  {
    return _currentParticleKinetics(contractAddress, tokenId, walletManagerId, assetToken);
  }

  /// @notice Gets the total amount of ERC721 Tokens that the Particle holds
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param basketManagerId  The ID of the BasketManager to check the token balance of
  /// @return The total amount of ERC721 tokens that are held  within the Particle
  function currentParticleCovalentBonds(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId
  )
    external
    view
    virtual
    override
    basketEnabled(basketManagerId)
    returns (uint256)
  {
    return _currentParticleCovalentBonds(contractAddress, tokenId, basketManagerId);
  }



  /***********************************|
  |     Register Contract Settings    |
  |(For External Contract Integration)|
  |__________________________________*/

  /// @notice Checks if an Account is the Owner of an NFT Contract
  ///    When Custom Contracts are registered, only the "owner" or operator of the Contract
  ///    is allowed to register them and define custom rules for how their tokens are "Charged".
  ///    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
  /// @param contractAddress  The Address to the External NFT Contract to check
  /// @param account          The Account to check if it is the Owner of the specified Contract
  /// @return True if the account is the Owner of the _contract
  function isContractOwner(address contractAddress, address account) external override virtual view returns (bool) {
    return _isContractOwner(contractAddress, account);
  }

  /// @notice Sets a Required Wallet-Manager for External NFT Contracts (otherwise set to "none" to allow any Wallet-Manager)
  /// @param contractAddress    The Address to the External NFT Contract to configure
  /// @param walletManager      If set, will only allow deposits from this specific Wallet-Manager
  function setRequiredWalletManager(
    address contractAddress,
    string calldata walletManager
  )
    external
    virtual
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    if (keccak256(bytes(walletManager)) == keccak256(bytes("none"))) {
      _nftSettings[contractAddress].requiredWalletManager = "";
    } else {
      _nftSettings[contractAddress].requiredWalletManager = walletManager;
    }

    emit RequiredWalletManagerSet(
      contractAddress,
      walletManager
    );
  }

  /// @notice Sets a Required Basket-Manager for External NFT Contracts (otherwise set to "none" to allow any Basket-Manager)
  /// @param contractAddress    The Address to the External Contract to configure
  /// @param basketManager      If set, will only allow deposits from this specific Basket-Manager
  function setRequiredBasketManager(
    address contractAddress,
    string calldata basketManager
  )
    external
    virtual
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    if (keccak256(bytes(basketManager)) == keccak256(bytes("none"))) {
      _nftSettings[contractAddress].requiredBasketManager = "";
    } else {
      _nftSettings[contractAddress].requiredBasketManager = basketManager;
    }

    emit RequiredBasketManagerSet(
      contractAddress,
      basketManager
    );
  }

  /// @notice Enables or Disables Asset-Token Restrictions for External NFT Contracts
  /// @param contractAddress      The Address to the External NFT Contract to configure
  /// @param restrictionsEnabled  If set, will only allow deposits from Allowed Asset Tokens
  function setAssetTokenRestrictions(
    address contractAddress,
    bool restrictionsEnabled
  )
    external
    virtual
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    if (restrictionsEnabled) {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.setBit(PERM_RESTRICTED_ASSETS);
    } else {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.clearBit(PERM_RESTRICTED_ASSETS);
    }

    emit AssetTokenRestrictionsSet(
      contractAddress,
      restrictionsEnabled
    );
  }

  /// @notice Enables or Disables Allowed Asset Tokens for External NFT Contracts
  /// @param contractAddress  The Address to the External NFT Contract to configure
  /// @param assetToken       The Address of the Asset Token to Allow or Disallow
  /// @param isAllowed        True if the Asset Token is allowed
  function setAllowedAssetToken(
    address contractAddress,
    address assetToken,
    bool isAllowed
  )
    external
    virtual
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    _nftSettings[contractAddress].allowedAssetTokens[assetToken] = isAllowed;

    emit AllowedAssetTokenSet(
      contractAddress,
      assetToken,
      isAllowed
    );
  }

  /// @notice Sets the Custom Configuration for External Contracts
  /// @param contractAddress  The Address to the External Contract to configure
  /// @param assetToken       The address of the Asset Token to set Limits for
  /// @param depositMin       If set, will define the minimum amount of Asset tokens the NFT may hold, otherwise any amount
  /// @param depositMax       If set, will define the maximum amount of Asset tokens the NFT may hold, otherwise any amount
  function setAssetTokenLimits(
    address contractAddress,
    address assetToken,
    uint256 depositMin,
    uint256 depositMax
  )
    external
    virtual
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    _nftSettings[contractAddress].depositMin[assetToken] = depositMin;
    _nftSettings[contractAddress].depositMax[assetToken] = depositMax;

    emit AssetTokenLimitsSet(
      contractAddress,
      assetToken,
      depositMin,
      depositMax
    );
  }

  /// @notice Sets the Max Number of NFTs that can be held by a Charged Particle NFT
  /// @param contractAddress  The Address to the External Contract to configure
  /// @param nftTokenAddress  The address of the NFT Token to set a Max for
  /// @param maxNfts          The maximum numbers of NFTs that can be held by a given NFT (0 = unlimited)
  function setMaxNfts(
    address contractAddress,
    address nftTokenAddress,
    uint256 maxNfts
  )
    external
    virtual
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    _nftSettings[contractAddress].maxNfts[nftTokenAddress] = maxNfts;

    emit MaxNftsSet(
      contractAddress,
      nftTokenAddress,
      maxNfts
    );
  }

  /// @notice Sets the Custom Configuration for Creators of Proton-based NFTs
  /// @param contractAddress  The Address to the Proton-based NFT to configure
  /// @param tokenId          The token ID of the Proton-based NFT to configure
  /// @param creator          The creator of the Proton-based NFT
  /// @param annuityPercent   The percentage of interest-annuities to reserve for the creator
  function setCreatorConfigs(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent
  )
    external
    virtual
    override
  {
    require(_isTokenContractOrCreator(contractAddress, tokenId, creator, _msgSender()), "CP:E-104");
    require(annuityPercent <= MAX_ANNUITIES, "CP:E-421");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Update Configs for External Token Creator
    _creatorSettings[tokenUuid].annuityPercent = annuityPercent;

    emit TokenCreatorConfigsSet(
      contractAddress,
      tokenId,
      creator,
      annuityPercent
    );
  }

  /// @notice Sets a Custom Receiver Address for the Creator Annuities
  /// @param contractAddress  The Address to the Proton-based NFT to configure
  /// @param tokenId          The token ID of the Proton-based NFT to configure
  /// @param receiver         The receiver of the Creator interest-annuities
  function setCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId, address receiver)
    external
    virtual
    override
  {
    require(_isTokenCreator(contractAddress, tokenId, _msgSender()), "CP:E-104");
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _creatorSettings[tokenUuid].annuityRedirect = receiver;
    emit TokenCreatorAnnuitiesRedirected(contractAddress, tokenId, receiver);
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the Universal Controller
  function setUniverse(address universe) external virtual onlyOwner {
    _universe = IUniverse(universe);
    emit UniverseSet(universe);
  }

  /// @dev Register Contracts as wallet managers with a unique liquidity provider ID
  function registerWalletManager(string calldata walletManagerId, address walletManager) external virtual onlyOwner {
    // Validate wallet manager
    IWalletManager newWalletMgr = IWalletManager(walletManager);
    require(newWalletMgr.isPaused() != true, "CP:E-418");

    // Register LP ID
    _ftWalletManager[walletManagerId] = newWalletMgr;
    emit WalletManagerRegistered(walletManagerId, walletManager);
  }

  /// @dev Register Contracts as basket managers with a unique basket ID
  function registerBasketManager(string calldata basketId, address basketManager) external virtual onlyOwner {
    // Validate basket manager
    IBasketManager newBasketMgr = IBasketManager(basketManager);
    require(newBasketMgr.isPaused() != true, "CP:E-418");

    // Register Basket ID
    _nftBasketManager[basketId] = newBasketMgr;
    emit BasketManagerRegistered(basketId, basketManager);
  }

  function setDepositCap(uint256 cap) external virtual onlyOwner {
    _depositCap = cap;
    emit DepositCapSet(cap);
  }

  function setTempLockExpiryBlocks(uint256 numBlocks) external virtual onlyOwner {
    _tempLockExpiryBlocks = numBlocks;
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev See {ChargedParticles-getCreatorAnnuitiesRedirect}.
  function _getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) internal view virtual returns (address) {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return _creatorSettings[tokenUuid].annuityRedirect;
  }

  /// @dev See {ChargedParticles-isWalletManagerEnabled}.
  function _isWalletManagerEnabled(string calldata walletManagerId) internal view virtual returns (bool) {
    return (address(_ftWalletManager[walletManagerId]) != address(0x0) && !_ftWalletManager[walletManagerId].isPaused());
  }

  /// @dev See {ChargedParticles-isNftBasketEnabled}.
  function _isNftBasketEnabled(string calldata basketId) internal view virtual returns (bool) {
    return (address(_nftBasketManager[basketId]) != address(0x0) && !_nftBasketManager[basketId].isPaused());
  }

  function _getTokenUUID(address contractAddress, uint256 tokenId) internal pure virtual returns (uint256) {
    return uint256(keccak256(abi.encodePacked(contractAddress, tokenId)));
  }

  function _getTokenOwner(address contractAddress, uint256 tokenId) internal view virtual returns (address) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    return tokenInterface.ownerOf(tokenId);
  }

  /// @dev See {ChargedParticles-isApprovedForDischarge}.
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].dischargeApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForRelease}.
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].releaseApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForTimelock}.
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    if (_nftSettings[operator].actionPerms.hasBit(PERM_TIMELOCK_ANY_NFT)) { return true; }
    if (_nftSettings[operator].actionPerms.hasBit(PERM_TIMELOCK_OWN_NFT) && contractAddress == operator) { return true; }

    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return tokenOwner == operator || _nftState[tokenUuid].timelockApproval[tokenOwner] == operator;
  }

  /// @dev Checks if an External NFT contract is vald
  /// @param contractAddress  The Address to the Contract of the NFT
  /// @return True if the contract follows current standards
  function isValidExternalContract(address contractAddress) internal view virtual returns (bool) {
    bytes32 codehash;
    bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
    // solhint-disable-next-line no-inline-assembly
    assembly { codehash := extcodehash(contractAddress) }
    return (codehash != accountHash && codehash != 0x0);
  }

  /// @dev Checks if an account is the Owner of an External NFT contract
  /// @param contractAddress  The Address to the Contract of the NFT to check
  /// @param account          The Address of the Account to check
  /// @return True if the account owns the contract
  function _isContractOwner(address contractAddress, address account) internal view virtual returns (bool) {
    address contractOwner = IERC721Chargeable(contractAddress).owner();
    return contractOwner != address(0x0) && contractOwner == account;
  }

  /// @dev Checks if an account is the Creator of a Proton-based NFT
  /// @param contractAddress  The Address to the Contract of the Proton-based NFT to check
  /// @param tokenId          The Token ID of the Proton-based NFT to check
  /// @param sender           The Address of the Account to check
  /// @return True if the account is the creator of the Proton-based NFT
  function _isTokenCreator(address contractAddress, uint256 tokenId, address sender) internal view virtual returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenCreator = tokenInterface.creatorOf(tokenId);
    return (sender == tokenCreator);
  }

  /// @dev Checks if an account is the Creator of a Proton-based NFT or the Contract itself
  /// @param contractAddress  The Address to the Contract of the Proton-based NFT to check
  /// @param tokenId          The Token ID of the Proton-based NFT to check
  /// @param sender           The Address of the Account to check
  /// @return True if the account is the creator of the Proton-based NFT or the Contract itself
  function _isTokenContractOrCreator(address contractAddress, uint256 tokenId, address creator, address sender) internal view virtual returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenCreator = tokenInterface.creatorOf(tokenId);
    if (sender == contractAddress && creator == tokenCreator) { return true; }
    return (sender == tokenCreator);
  }

  /// @dev Checks if an account is the Owner or Operator of an External NFT
  /// @param contractAddress  The Address to the Contract of the External NFT to check
  /// @param tokenId          The Token ID of the External NFT to check
  /// @param sender           The Address of the Account to check
  /// @return True if the account is the Owner or Operator of the External NFT
  function _isErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) internal view virtual returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    return (sender == tokenOwner || tokenInterface.isApprovedForAll(tokenOwner, sender));
  }

  /// @notice Sets an Operator as Approved to Discharge a specific Token
  /// This allows an operator to withdraw the interest-portion only
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setDischargeApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _nftState[tokenUuid].dischargeApproval[tokenOwner] = operator;
    emit DischargeApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Release a specific Token
  /// This allows an operator to withdraw the principal + interest
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setReleaseApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _nftState[tokenUuid].releaseApproval[tokenOwner] = operator;
    emit ReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Timelock a specific Token
  /// This allows an operator to timelock the principal or interest
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setTimelockApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _nftState[tokenUuid].timelockApproval[tokenOwner] = operator;
    emit TimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @dev Update the list of NFT contracts that can be Charged
  function _setPermsForCharge(address contractAddress, bool state) internal {
    if (state) {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.setBit(PERM_CHARGE_NFT);
    } else {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.clearBit(PERM_CHARGE_NFT);
    }
    emit WhitelistedForCharge(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can hold other NFTs
  function _setPermsForBasket(address contractAddress, bool state) internal {
    if (state) {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.setBit(PERM_BASKET_NFT);
    } else {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.clearBit(PERM_BASKET_NFT);
    }
    emit WhitelistedForBasket(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can Timelock any NFT for Front-run Protection
  function _setPermsForTimelockAny(address contractAddress, bool state) internal {
    if (state) {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.setBit(PERM_TIMELOCK_ANY_NFT);
    } else {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.clearBit(PERM_TIMELOCK_ANY_NFT);
    }
    emit WhitelistedForTimelockAny(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can Timelock their own tokens
  function _setPermsForTimelockSelf(address contractAddress, bool state) internal {
    if (state) {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.setBit(PERM_TIMELOCK_OWN_NFT);
    } else {
      _nftSettings[contractAddress].actionPerms = _nftSettings[contractAddress].actionPerms.clearBit(PERM_TIMELOCK_OWN_NFT);
    }
    emit WhitelistedForTimelockSelf(contractAddress, state);
  }

  /// @dev Validates a Deposit according to the rules set by the Token Contract
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param walletManagerId  The LP of the Assets to Deposit
  /// @param assetToken           The Address of the Asset Token to Deposit
  /// @param assetAmount          The specific amount of Asset Token to Deposit
  function _validateDeposit(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    internal
    virtual
  {
    IWalletManager lpWalletMgr = _ftWalletManager[walletManagerId];
    uint256 existingBalance = lpWalletMgr.getPrincipal(contractAddress, tokenId, assetToken);
    uint256 newBalance = assetAmount.add(existingBalance);

    // Validate Deposit Cap
    if (_depositCap > 0) {
      require(newBalance <= _depositCap, "CP:E-408");
    }

    // Valid Wallet Manager?
    string memory requiredWalletManager = _nftSettings[contractAddress].requiredWalletManager;
    if (bytes(requiredWalletManager).length > 0) {
        require(keccak256(abi.encodePacked(requiredWalletManager)) == keccak256(abi.encodePacked(walletManagerId)), "CP:E-419");
    }

    // Valid Asset?
    if (_nftSettings[contractAddress].actionPerms.hasBit(PERM_RESTRICTED_ASSETS)) {
      require(_nftSettings[contractAddress].allowedAssetTokens[assetToken], "CP:E-424");
    }

    // Valid Amount for Deposit?
    if (_nftSettings[contractAddress].depositMin[assetToken] > 0) {
        require(newBalance >= _nftSettings[contractAddress].depositMin[assetToken], "CP:E-410");
    }
    if (_nftSettings[contractAddress].depositMax[assetToken] > 0) {
        require(newBalance <= _nftSettings[contractAddress].depositMax[assetToken], "CP:E-410");
    }
  }

  /// @dev Validates an NFT Deposit according to the rules set by the Token Contract
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param basketManagerId      The Basket to Deposit the NFT into
  /// @param nftTokenAddress      The Address of the NFT Token being deposited
  /// @param nftTokenId           The ID of the NFT Token being deposited
  function _validateNftDeposit(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId
  )
    internal
    virtual
    view
  {
    uint256 maxNfts = _nftSettings[contractAddress].maxNfts[nftTokenAddress];
    if (maxNfts > 0) {
      IBasketManager basketMgr = _nftBasketManager[basketManagerId];
      uint256 tokenCountByType = basketMgr.getTokenCountByType(contractAddress, tokenId, nftTokenAddress, nftTokenId);
      require(maxNfts > tokenCountByType, "CP:E-427");
    }
  }

  /// @dev Deposit Asset Tokens into an NFT via the Wallet Manager
  /// @param contractAddress      The Address to the Contract of the NFT
  /// @param tokenId              The Token ID of the NFT
  /// @param walletManagerId  The LP of the Assets to Deposit
  /// @param assetToken           The Address of the Asset Token to Deposit
  /// @param assetAmount          The specific amount of Asset Token to Deposit
  function _depositIntoWalletManager(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    internal
    virtual
    returns (uint256)
  {
    // Get Wallet-Manager for LP
    IWalletManager lpWalletMgr = _ftWalletManager[walletManagerId];
    (address creator, uint256 annuityPct) = _getCreatorAnnuity(contractAddress, tokenId);

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    address wallet = lpWalletMgr.getWalletAddressById(contractAddress, tokenId, creator, annuityPct);
    IERC20Upgradeable(assetToken).transfer(wallet, assetAmount);
    return lpWalletMgr.energize(contractAddress, tokenId, assetToken, assetAmount);
  }

  /// @dev Deposit NFT Tokens into the Basket Manager
  /// @param contractAddress      The Address to the Contract of the NFT
  /// @param tokenId              The Token ID of the NFT
  /// @param basketManagerId      The LP of the Assets to Deposit
  /// @param nftTokenAddress      The Address of the Asset Token to Deposit
  /// @param nftTokenId           The specific amount of Asset Token to Deposit
  function _depositIntoBasketManager(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId
  )
    internal
    virtual
    returns (bool)
  {
    // Deposit NFT Token directly into Smart Wallet (reverts on fail) and Update BasketManager
    IBasketManager basketMgr = _nftBasketManager[basketManagerId];

    // Valid Basket Manager?
    string memory requiredBasketManager = _nftSettings[contractAddress].requiredBasketManager;
    if (bytes(requiredBasketManager).length > 0) {
        require(keccak256(abi.encodePacked(requiredBasketManager)) == keccak256(abi.encodePacked(basketManagerId)), "CP:E-419");
    }

    address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);
    IERC721Upgradeable(nftTokenAddress).safeTransferFrom(address(this), wallet, nftTokenId);
    return basketMgr.addToBasket(contractAddress, tokenId, nftTokenAddress, nftTokenId);
  }

  /// @dev Gets the amount of creator annuities reserved for the creator for the specified NFT
  /// @param contractAddress The Address to the Contract of the NFT
  /// @param tokenId         The Token ID of the NFT
  /// @return creator The address of the creator
  /// @return annuityPct The percentage amount of annuities reserved for the creator
  function _getCreatorAnnuity(
    address contractAddress,
    uint256 tokenId
  )
    internal
    view
    virtual
    returns (address creator, uint256 annuityPct)
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    creator = IERC721Chargeable(contractAddress).creatorOf(tokenId);
    annuityPct = _creatorSettings[tokenUuid].annuityPercent;
  }

  /// @dev Collects the Required ERC20 Token(s) from the users wallet
  ///   Be sure to Approve this Contract to transfer your Token(s)
  /// @param from         The owner address to collect the tokens from
  /// @param tokenAddress  The addres of the token to transfer
  /// @param tokenAmount  The amount of tokens to collect
  function _collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) internal virtual {
    require(IERC20Upgradeable(tokenAddress).transferFrom(from, address(this), tokenAmount), "CP:E-401");
  }

  /// @dev Collects the Required ERC721 Token(s) from the users wallet
  ///   Be sure to Approve this Contract to transfer your Token(s)
  /// @param from             The owner address to collect the tokens from
  /// @param nftTokenAddress  The address of the NFT token to transfer
  /// @param nftTokenId       The ID of the NFT token to transfer
  function _collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId) internal virtual {
    IERC721Upgradeable(nftTokenAddress).transferFrom(from, address(this), nftTokenId);
  }

  /// @dev See {ChargedParticles-baseParticleMass}.
  function _baseParticleMass(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    internal
    virtual
    returns (uint256)
  {
    return _ftWalletManager[walletManagerId].getPrincipal(contractAddress, tokenId, assetToken);
  }

  /// @dev See {ChargedParticles-currentParticleCharge}.
  function _currentParticleCharge(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    internal
    virtual
    returns (uint256)
  {
    (, uint256 ownerInterest) = _ftWalletManager[walletManagerId].getInterest(contractAddress, tokenId, assetToken);
    return ownerInterest;
  }

  /// @dev See {ChargedParticles-currentParticleKinetics}.
  function _currentParticleKinetics(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    internal
    virtual
    returns (uint256)
  {
    return _ftWalletManager[walletManagerId].getRewards(contractAddress, tokenId, assetToken);
  }

  /// @dev See {ChargedParticles-currentParticleCovalentBonds}.
  function _currentParticleCovalentBonds(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId
  )
    internal
    view
    virtual
    returns (uint256)
  {
    return _nftBasketManager[basketManagerId].getTokenTotalCount(contractAddress, tokenId);
  }


  /***********************************|
  |          GSN/MetaTx Relay         |
  |__________________________________*/

  /// @dev See {BaseRelayRecipient-_msgSender}.
  function _msgSender()
    internal
    view
    virtual
    override(BaseRelayRecipient, ContextUpgradeable)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  /// @dev See {BaseRelayRecipient-_msgData}.
  function _msgData()
    internal
    view
    virtual
    override(BaseRelayRecipient, ContextUpgradeable)
    returns (bytes memory)
  {
    return BaseRelayRecipient._msgData();
  }

  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  modifier onlyValidExternalContract(address contractAddress) {
    require(isValidExternalContract(contractAddress), "CP:E-420");
    _;
  }

  modifier onlyContractOwnerOrAdmin(address contractAddress, address sender) {
    require(sender == owner() || _isContractOwner(contractAddress, sender), "CP:E-103");
    _;
  }

  modifier onlyErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(_isErc721OwnerOrOperator(contractAddress, tokenId, sender), "CP:E-105");
    _;
  }

  modifier managerEnabled(string calldata walletManagerId) {
    require(_isWalletManagerEnabled(walletManagerId), "CP:E-419");
    _;
  }

  modifier basketEnabled(string calldata basketManagerId) {
    require(_isNftBasketEnabled(basketManagerId), "CP:E-419");
    _;
  }
}
