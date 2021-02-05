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

import "../interfaces/IUniverse.sol";
import "../interfaces/IChargedSettings.sol";
import "../interfaces/IChargedParticles.sol";
import "../interfaces/IWalletManager.sol";
import "../interfaces/IBasketManager.sol";

import "../lib/Bitwise.sol";
import "../lib/TokenInfo.sol";
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
  using TokenInfo for address;
  using Bitwise for uint32;

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

  // NftState - actionPerms
  uint32 constant internal PERM_RESTRICT_ENERGIZE_FROM_ALL = 1;  // NFTs that have Restrictions on Energize
  uint32 constant internal PERM_ALLOW_DISCHARGE_FROM_ALL   = 2;  // NFTs that allow Discharge by anyone
  uint32 constant internal PERM_ALLOW_RELEASE_FROM_ALL     = 4;  // NFTs that allow Release by anyone
  uint32 constant internal PERM_RESTRICT_BOND_FROM_ALL     = 8;  // NFTs that have Restrictions on Covalent Bonds
  uint32 constant internal PERM_ALLOW_BREAK_BOND_FROM_ALL  = 16; // NFTs that allow Breaking Covalent Bonds by anyone

  struct NftState {
    uint32 actionPerms;

    uint256 dischargeTimelock;
    uint256 releaseTimelock;
    uint256 tempLockExpiry;

    mapping (address => address) dischargeApproval;
    mapping (address => address) releaseApproval;
    mapping (address => address) breakBondApproval;
    mapping (address => address) timelockApproval;
  }

  // Linked Contracts
  IChargedSettings internal _settings;
  IUniverse internal _universe;

  // Wallet/Basket Managers (by Unique Manager ID)
  mapping (string => IWalletManager) internal _ftWalletManager;
  mapping (string => IBasketManager) internal _nftBasketManager;

  // State of individual NFTs (by Token UUID)
  mapping (uint256 => NftState) internal _nftState;


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the Charged-Settings Controller
  function setChargedSettings(address settings) external virtual onlyOwner {
    _settings = IChargedSettings(settings);
    emit ChargedSettingsSet(settings);
  }

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


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev See {ChargedParticles-isWalletManagerEnabled}.
  function _isWalletManagerEnabled(string calldata walletManagerId) internal view virtual returns (bool) {
    return (address(_ftWalletManager[walletManagerId]) != address(0x0) && !_ftWalletManager[walletManagerId].isPaused());
  }

  /// @dev See {ChargedParticles-isNftBasketEnabled}.
  function _isNftBasketEnabled(string calldata basketId) internal view virtual returns (bool) {
    return (address(_nftBasketManager[basketId]) != address(0x0) && !_nftBasketManager[basketId].isPaused());
  }

  /// @dev See {ChargedParticles-isApprovedForDischarge}.
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].dischargeApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForRelease}.
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].releaseApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForBreakBond}.
  function _isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].breakBondApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForTimelock}.
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    (bool timelockAny, bool timelockOwn) = _settings.getTimelockApprovals(operator);
    if (timelockAny || (timelockOwn && contractAddress == operator)) { return true; }

    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return tokenOwner == operator || _nftState[tokenUuid].timelockApproval[tokenOwner] == operator;
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
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
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
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftState[tokenUuid].releaseApproval[tokenOwner] = operator;
    emit ReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Break Covalent Bonds on a specific Token
  /// This allows an operator to withdraw Basket NFTs
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setBreakBondApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftState[tokenUuid].breakBondApproval[tokenOwner] = operator;
    emit BreakBondApproval(contractAddress, tokenId, tokenOwner, operator);
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
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftState[tokenUuid].timelockApproval[tokenOwner] = operator;
    emit TimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @dev Updates Restrictions on Energizing an NFT
  function _setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state) internal {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
    }
    emit PermsSetForRestrictCharge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function _setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state) internal {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    }
    emit PermsSetForAllowDischarge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function _setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state) internal {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_ALLOW_RELEASE_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_ALLOW_RELEASE_FROM_ALL);
    }
    emit PermsSetForAllowRelease(contractAddress, tokenId, state);
  }

  /// @dev Updates Restrictions on Covalent Bonds on an NFT
  function _setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state) internal {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_RESTRICT_BOND_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_RESTRICT_BOND_FROM_ALL);
    }
    emit PermsSetForRestrictBond(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone
  function _setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state) internal {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    }
    emit PermsSetForAllowBreakBond(contractAddress, tokenId, state);
  }

  /// @dev Validates a Deposit according to the rules set by the Token Contract
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param walletManagerId  The Wallet Manager of the Assets to Deposit
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
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (_nftState[tokenUuid].actionPerms.hasBit(PERM_RESTRICT_ENERGIZE_FROM_ALL)) {
      require(contractAddress.isErc721OwnerOrOperator(tokenId, _msgSender()), "CP:E-105");
    }

    ( string memory requiredWalletManager,
      bool energizeEnabled,
      bool restrictedAssets,
      bool validAsset,
      uint256 depositCap,
      uint256 depositMin,
      uint256 depositMax
    ) = _settings.getAssetRequirements(contractAddress, assetToken);

    require(energizeEnabled, "CP:E-417");

    // Valid Wallet Manager?
    if (bytes(requiredWalletManager).length > 0) {
        require(keccak256(abi.encodePacked(requiredWalletManager)) == keccak256(abi.encodePacked(walletManagerId)), "CP:E-419");
    }

    // Valid Asset?
    if (restrictedAssets) {
      require(validAsset, "CP:E-424");
    }

    _validateDepositAmount(
      contractAddress,
      tokenId,
      walletManagerId,
      assetToken,
      assetAmount,
      depositCap,
      depositMin,
      depositMax
    );
  }

  /// @dev Validates a Deposit-Amount according to the rules set by the Token Contract
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param walletManagerId      The Wallet Manager of the Assets to Deposit
  /// @param assetToken           The Address of the Asset Token to Deposit
  /// @param assetAmount          The specific amount of Asset Token to Deposit
  function _validateDepositAmount(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount,
    uint256 depositCap,
    uint256 depositMin,
    uint256 depositMax
  )
    internal
    virtual
  {
    IWalletManager lpWalletMgr = _ftWalletManager[walletManagerId];
    uint256 existingBalance = lpWalletMgr.getPrincipal(contractAddress, tokenId, assetToken);
    uint256 newBalance = assetAmount.add(existingBalance);

    // Validate Deposit Cap
    if (depositCap > 0) {
      require(newBalance <= depositCap, "CP:E-408");
    }

    // Valid Amount for Deposit?
    if (depositMin > 0) {
        require(newBalance >= depositMin, "CP:E-410");
    }
    if (depositMax > 0) {
        require(newBalance <= depositMax, "CP:E-410");
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
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (_nftState[tokenUuid].actionPerms.hasBit(PERM_RESTRICT_BOND_FROM_ALL)) {
      require(contractAddress.isErc721OwnerOrOperator(tokenId, _msgSender()), "CP:E-105");
    }

    ( string memory requiredBasketManager,
      bool basketEnabled,
      uint256 maxNfts
    ) = _settings.getNftAssetRequirements(contractAddress, nftTokenAddress);

    require(basketEnabled, "CP:E-417");

    // Valid Basket Manager?
    if (bytes(requiredBasketManager).length > 0) {
        require(keccak256(abi.encodePacked(requiredBasketManager)) == keccak256(abi.encodePacked(basketManagerId)), "CP:E-419");
    }

    if (maxNfts > 0) {
      IBasketManager basketMgr = _nftBasketManager[basketManagerId];
      uint256 tokenCountByType = basketMgr.getTokenCountByType(contractAddress, tokenId, nftTokenAddress, nftTokenId);
      require(maxNfts > tokenCountByType, "CP:E-427");
    }
  }

  /// @dev Deposit Asset Tokens into an NFT via the Wallet Manager
  /// @param contractAddress      The Address to the Contract of the NFT
  /// @param tokenId              The Token ID of the NFT
  /// @param walletManagerId  The Wallet Manager of the Assets to Deposit
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
    (address creator, uint256 annuityPct) = _settings.getCreatorAnnuities(contractAddress, tokenId);

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    address wallet = lpWalletMgr.getWalletAddressById(contractAddress, tokenId, creator, annuityPct);
    IERC20Upgradeable(assetToken).transfer(wallet, assetAmount);
    return lpWalletMgr.energize(contractAddress, tokenId, assetToken, assetAmount);
  }

  /// @dev Deposit NFT Tokens into the Basket Manager
  /// @param contractAddress      The Address to the Contract of the NFT
  /// @param tokenId              The Token ID of the NFT
  /// @param basketManagerId      The Wallet Manager of the Assets to Deposit
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
    address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);
    IERC721Upgradeable(nftTokenAddress).safeTransferFrom(address(this), wallet, nftTokenId);
    return basketMgr.addToBasket(contractAddress, tokenId, nftTokenAddress, nftTokenId);
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

  modifier onlyErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(contractAddress.isErc721OwnerOrOperator(tokenId, sender), "CP:E-105");
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
