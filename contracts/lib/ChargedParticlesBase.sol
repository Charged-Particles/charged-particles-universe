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
import "@openzeppelin/contracts-upgradeable/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";

import "../interfaces/IERC721Chargeable.sol";
import "../interfaces/IUniverse.sol";
import "../interfaces/IChargedParticles.sol";
import "../interfaces/IWalletManager.sol";
import "../interfaces/IBasketManager.sol";

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

  // Interface Signatures
  bytes4 constant internal INTERFACE_SIGNATURE_ERC721 = 0x80ac58cd;
  bytes4 constant internal INTERFACE_SIGNATURE_ERC1155 = 0xd9b67a26;

  // Linked Contracts
  IUniverse internal _universe;
  string[] internal _walletManagers;
  string[] internal _nftBaskets;
  mapping (string => IWalletManager) internal _ftWalletManager;
  mapping (string => IBasketManager) internal _nftBasketManager;

  // Optional Limits set by Owner of External Token Contracts;
  //  - Any user can add any whitelisted ERC721 or ERC1155 token as a Charged Particle without Limits,
  //    unless the Owner of the ERC721 or ERC1155 token contract registers the token here
  //    and sets the Custom Limits for their token(s)
  mapping (address => string) internal _nftLiquidityProvider;
  mapping (address => uint256) internal _nftAssetDepositMin;
  mapping (address => uint256) internal _nftAssetDepositMax;

  //
  // TokenUUID => Config for individual NFTs set by NFT Creator
  mapping (uint256 => uint256) internal _creatorAnnuityPercent;
  mapping (uint256 => address) internal _creatorAnnuityRedirect;

  // TokenUUID => NFT Owner => NFT State
  mapping (uint256 => mapping (address => address)) internal _dischargeApproval;
  mapping (uint256 => mapping (address => address)) internal _releaseApproval;
  mapping (uint256 => mapping (address => address)) internal _timelockApproval;
  // TokenUUID => NFT State
  mapping (uint256 => uint256) internal _dischargeTimelock;
  mapping (uint256 => uint256) internal _releaseTimelock;



  /***********************************|
  |         Public Functions          |
  |__________________________________*/

  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external override view returns (bool) {
    return _isTokenCreator(contractAddress, tokenId, account);
  }

  function getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) external override view returns (address) {
    return _getCreatorAnnuitiesRedirect(contractAddress, tokenId);
  }

  function isWalletManagerEnabled(string calldata walletManagerId) external override view returns (bool) {
    return _isWalletManagerEnabled(walletManagerId);
  }

  function getWalletManagerCount() external override view returns (uint) {
    return _walletManagers.length;
  }

  function getWalletManagerByIndex(uint index) external override view returns (string memory) {
    require(index >= 0 && index < _walletManagers.length, "CP: E-201");
    return _walletManagers[index];
  }

  function getWalletManager(string calldata walletManagerId) external override view returns (address) {
    return address(_ftWalletManager[walletManagerId]);
  }

  function isNftBasketEnabled(string calldata basketId) external override view returns (bool) {
    return _isNftBasketEnabled(basketId);
  }

  function getNftBasketCount() external override view returns (uint) {
    return _nftBaskets.length;
  }

  function getNftBasketByIndex(uint index) external override view returns (string memory) {
    require(index >= 0 && index < _nftBaskets.length, "CP: E-201");
    return _nftBaskets[index];
  }

  function getBasketManager(string calldata basketId) external override view returns (address) {
    return address(_nftBasketManager[basketId]);
  }

  function getTokenUUID(address contractAddress, uint256 tokenId) external override pure returns (uint256) {
    return _getTokenUUID(contractAddress, tokenId);
  }

  function getOwnerUUID(string calldata walletManagerId, address ownerAddress) external override pure returns (uint256) {
    return _getOwnerUUID(walletManagerId, ownerAddress);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
    return IERC721ReceiverUpgradeable(0).onERC721Received.selector;
  }

  /// @notice Checks if an operator is allowed to Discharge a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external override view returns (bool) {
    return _isApprovedForDischarge(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Release a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external override view returns (bool) {
    return _isApprovedForRelease(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Timelock a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external override view returns (bool) {
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

  /// @notice Checks if an Account is the Owner of a Contract
  ///    When Custom Contracts are registered, only the "owner" or operator of the Contract
  ///    is allowed to register them and define custom rules for how their tokens are "Charged".
  ///    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
  /// @param contractAddress  The Address to the External Contract to check
  /// @param account          The Account to check if it is the Owner of the specified Contract
  /// @return True if the account is the Owner of the _contract
  function isContractOwner(address contractAddress, address account) external override view returns (bool) {
    return _isContractOwner(contractAddress, account);
  }

  /// @notice Sets the Custom Configuration for External Contracts
  /// @param contractAddress    The Address to the External Contract to configure
  /// @param liquidityProvider  If set, will only allow deposits from this specific LP, otherwise any LP supported
  /// @param assetDepositMin    If set, will define the minimum amount of Asset tokens the NFT may hold, otherwise any amount
  /// @param assetDepositMax    If set, will define the maximum amount of Asset tokens the NFT may hold, otherwise any amount
  function setExternalContractConfigs(
    address contractAddress,
    string calldata liquidityProvider,
    uint256 assetDepositMin,
    uint256 assetDepositMax
  )
    external
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    // Update Configs for External Token Contract
    _nftLiquidityProvider[contractAddress] = liquidityProvider;
    _nftAssetDepositMin[contractAddress] = assetDepositMin;
    _nftAssetDepositMax[contractAddress] = assetDepositMax;

    emit TokenContractConfigsSet(
      contractAddress,
      liquidityProvider,
      assetDepositMin,
      assetDepositMax
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
    override
  {
    require(_isTokenContractOrCreator(contractAddress, tokenId, creator, _msgSender()), "CP: E-104");
    require(annuityPercent <= MAX_ANNUITIES, "CP: E-421");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Update Configs for External Token Creator
    _creatorAnnuityPercent[tokenUuid] = annuityPercent;

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
    override
  {
    require(_isTokenCreator(contractAddress, tokenId, _msgSender()), "CP: E-104");
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _creatorAnnuityRedirect[tokenUuid] = receiver;
    emit TokenCreatorAnnuitiesRedirected(contractAddress, tokenId, receiver);
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the Universal Controller
  function setUniverse(address universe) external onlyOwner {
    _universe = IUniverse(universe);
    emit UniverseSet(universe);
  }

  /// @dev Register Contracts as wallet managers with a unique liquidity provider ID
  function registerWalletManager(string calldata walletManagerId, address walletManager) external onlyOwner {
    // Validate wallet manager
    IWalletManager newWalletMgr = IWalletManager(walletManager);
    require(newWalletMgr.isPaused() != true, "CP: E-418");

    // Register LP ID
    _walletManagers.push(walletManagerId);
    _ftWalletManager[walletManagerId] = newWalletMgr;
    emit LiquidityProviderRegistered(walletManagerId, walletManager);
  }

  /// @dev Register Contracts as basket managers with a unique basket ID
  function registerBasketManager(string calldata basketId, address basketManager) external onlyOwner {
    // Validate basket manager
    IBasketManager newBasketMgr = IBasketManager(basketManager);
    require(newBasketMgr.isPaused() != true, "CP: E-418");

    // Register Basket ID
    _nftBaskets.push(basketId);
    _nftBasketManager[basketId] = newBasketMgr;
    emit NftBasketRegistered(basketId, basketManager);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev See {ChargedParticles-getCreatorAnnuitiesRedirect}.
  function _getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) internal view returns (address) {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return _creatorAnnuityRedirect[tokenUuid];
  }

  /// @dev See {ChargedParticles-isWalletManagerEnabled}.
  function _isWalletManagerEnabled(string calldata walletManagerId) internal view returns (bool) {
    return (address(_ftWalletManager[walletManagerId]) != address(0x0) && !_ftWalletManager[walletManagerId].isPaused());
  }

  /// @dev See {ChargedParticles-isNftBasketEnabled}.
  function _isNftBasketEnabled(string calldata basketId) internal view returns (bool) {
    return (address(_nftBasketManager[basketId]) != address(0x0) && !_nftBasketManager[basketId].isPaused());
  }

  /// @dev See {ChargedParticles-getTokenUUID}.
  function _getTokenUUID(address contractAddress, uint256 tokenId) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(contractAddress, tokenId)));
  }

  /// @dev See {ChargedParticles-getOwnerUUID}.
  function _getOwnerUUID(string memory walletManagerId, address _owner) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(walletManagerId, _owner)));
  }

  /// @dev See {ChargedParticles-getTokenOwner}.
  function _getTokenOwner(address contractAddress, uint256 tokenId) internal view returns (address) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    return tokenInterface.ownerOf(tokenId);
  }

  /// @dev See {ChargedParticles-isApprovedForDischarge}.
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _dischargeApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForRelease}.
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _releaseApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForTimelock}.
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _timelockApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @dev Checks if an External NFT contract follows standards
  /// @param contractAddress  The Address to the Contract of the NFT
  /// @return True if the contract follows current standards
  function isValidExternalContract(address contractAddress) internal view returns (bool) {
    // Check Token Interface to ensure compliance
    IERC165Upgradeable tokenInterface = IERC165Upgradeable(contractAddress);
    bool _is721 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC721);
    bool _is1155 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC1155);
    return (_is721 || _is1155);
  }

  /// @dev Checks if an account is the Owner of an External NFT contract
  /// @param contractAddress  The Address to the Contract of the NFT to check
  /// @param account          The Address of the Account to check
  /// @return True if the account owns the contract
  function _isContractOwner(address contractAddress, address account) internal view returns (bool) {
    address contractOwner = IERC721Chargeable(contractAddress).owner();
    return contractOwner != address(0x0) && contractOwner == account;
  }

  /// @dev Checks if an account is the Creator of a Proton-based NFT
  /// @param contractAddress  The Address to the Contract of the Proton-based NFT to check
  /// @param tokenId          The Token ID of the Proton-based NFT to check
  /// @param sender           The Address of the Account to check
  /// @return True if the account is the creator of the Proton-based NFT
  function _isTokenCreator(address contractAddress, uint256 tokenId, address sender) internal view returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenCreator = tokenInterface.creatorOf(tokenId);
    return (sender == tokenCreator);
  }

  /// @dev Checks if an account is the Creator of a Proton-based NFT or the Contract itself
  /// @param contractAddress  The Address to the Contract of the Proton-based NFT to check
  /// @param tokenId          The Token ID of the Proton-based NFT to check
  /// @param sender           The Address of the Account to check
  /// @return True if the account is the creator of the Proton-based NFT or the Contract itself
  function _isTokenContractOrCreator(address contractAddress, uint256 tokenId, address creator, address sender) internal view returns (bool) {
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
  function _isErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) internal view returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    return (sender == tokenOwner || tokenInterface.isApprovedForAll(tokenOwner, sender));
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
  {
    IWalletManager lpWalletMgr = _ftWalletManager[walletManagerId];
    uint256 existingBalance = lpWalletMgr.getPrincipal(contractAddress, tokenId, assetToken);
    uint256 newBalance = assetAmount.add(existingBalance);

    // Valid LP?
    if (bytes(_nftLiquidityProvider[contractAddress]).length > 0) {
        require(keccak256(abi.encodePacked(_nftLiquidityProvider[contractAddress])) == keccak256(abi.encodePacked(walletManagerId)), "CP: E-419");
    }

    // Valid Amount for Deposit?
    if (_nftAssetDepositMin[contractAddress] > 0) {
        require(newBalance >= _nftAssetDepositMin[contractAddress], "CP: E-410");
    }
    if (_nftAssetDepositMax[contractAddress] > 0) {
        require(newBalance <= _nftAssetDepositMax[contractAddress], "CP: E-410");
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
    returns (bool)
  {
    // Deposit NFT Token directly into Smart Wallet (reverts on fail) and Update BasketManager
    IBasketManager basketMgr = _nftBasketManager[basketManagerId];
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
    returns (address creator, uint256 annuityPct)
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    creator = IERC721Chargeable(contractAddress).creatorOf(tokenId);
    annuityPct = _creatorAnnuityPercent[tokenUuid];
  }

  /// @dev Collects the Required ERC20 Token(s) from the users wallet
  ///   Be sure to Approve this Contract to transfer your Token(s)
  /// @param from         The owner address to collect the tokens from
  /// @param tokenAddress  The addres of the token to transfer
  /// @param tokenAmount  The amount of tokens to collect
  function _collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) internal {
    require(IERC20Upgradeable(tokenAddress).transferFrom(from, address(this), tokenAmount), "CP: E-401");
  }

  /// @dev Collects the Required ERC721 Token(s) from the users wallet
  ///   Be sure to Approve this Contract to transfer your Token(s)
  /// @param from             The owner address to collect the tokens from
  /// @param nftTokenAddress  The address of the NFT token to transfer
  /// @param nftTokenId       The ID of the NFT token to transfer
  function _collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId) internal {
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
    require(isValidExternalContract(contractAddress), "CP: E-420");
    _;
  }

  modifier onlyContractOwner(address contractAddress, address sender) {
    require(_isContractOwner(contractAddress, sender), "CP: E-102");
    _;
  }

  modifier onlyContractOwnerOrAdmin(address contractAddress, address sender) {
    require(sender == owner() || _isContractOwner(contractAddress, sender), "CP: E-103");
    _;
  }

  modifier onlyErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(_isErc721OwnerOrOperator(contractAddress, tokenId, sender), "CP: E-105");
    _;
  }

  modifier managerEnabled(string calldata walletManagerId) {
    require(_isWalletManagerEnabled(walletManagerId), "CP: E-419");
    _;
  }

  modifier basketEnabled(string calldata basketManagerId) {
    require(_isNftBasketEnabled(basketManagerId), "CP: E-419");
    _;
  }
}
