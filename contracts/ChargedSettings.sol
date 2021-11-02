// SPDX-License-Identifier: MIT

// ChargedSettings.sol -- Part of the Charged Particles Protocol
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
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

import "./interfaces/IChargedSettings.sol";

import "./lib/Bitwise.sol";
import "./lib/TokenInfo.sol";
import "./lib/RelayRecipient.sol";
import "./lib/BlackholePrevention.sol";

import "./lib/TokenInfoProxy.sol";

/**
 * @notice Charged Particles Settings Contract
 */
contract ChargedSettings is
  IChargedSettings,
  Initializable,
  OwnableUpgradeable,
  RelayRecipient,
  BlackholePrevention
{
  using SafeMathUpgradeable for uint256;
  using TokenInfo for address;
  using Bitwise for uint32;

  uint256 constant internal MAX_ANNUITIES = 1e4;      // 10000  (100%)

  // NftSettings - actionPerms
  uint32 constant internal PERM_CHARGE_NFT        = 1;    // NFT Contracts that can have assets Deposited into them (Charged)
  uint32 constant internal PERM_BASKET_NFT        = 2;    // NFT Contracts that can have other NFTs Deposited into them
  uint32 constant internal PERM_TIMELOCK_ANY_NFT  = 4;    // NFT Contracts that can timelock any NFT on behalf of users (primarily used for Front-run Protection)
  uint32 constant internal PERM_TIMELOCK_OWN_NFT  = 8;    // NFT Contracts that can timelock their own NFTs on behalf of their users
  uint32 constant internal PERM_RESTRICTED_ASSETS = 16;   // NFT Contracts that have restricted deposits to specific assets


  // Current Settings for External NFT Token Contracts;
  //  - Any user can add any ERC721 or ERC1155 token as a Charged Particle without Limits,
  //    unless the Owner of the ERC721 or ERC1155 token contract registers the token
  //    and sets the Custom Settings for their token(s)
  mapping (address => uint32) internal _nftActionPerms;

  mapping (address => string) internal _nftRequiredWalletManager;
  mapping (address => string) internal _nftRequiredBasketManager;

  // ERC20
  mapping (address => mapping(address => bool)) internal _nftAllowedAssetTokens;
  mapping (address => mapping (address => uint256)) internal _nftDepositMin;
  mapping (address => mapping (address => uint256)) internal _nftDepositMax;

  // ERC721 / ERC1155
  mapping (address => mapping (address => uint256)) internal _nftMaxNfts;     // NFT Token Address => Max

  // Optional Configs for individual NFTs set by NFT Creator (by Token UUID)
  mapping (uint256 => uint256) internal _creatorAnnuityPercent;
  mapping (uint256 => address) internal _creatorAnnuityRedirect;

  mapping (address => uint256) internal _depositCap;
  uint256 internal _tempLockExpiryBlocks;

  // Wallet/Basket Managers (by Unique Manager ID)
  // mapping (string => IWalletManager) internal _ftWalletManager;
  // mapping (string => IBasketManager) internal _nftBasketManager;

  // Blacklist for non-compliant tokens
  mapping (address => bool) internal _invalidAssets;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize() public initializer {
    __Ownable_init();
  }


  /***********************************|
  |               Public              |
  |__________________________________*/

  /// @notice Checks if an Account is the Owner of an NFT Contract
  ///    When Custom Contracts are registered, only the "owner" or operator of the Contract
  ///    is allowed to register them and define custom rules for how their tokens are "Charged".
  ///    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
  /// @param contractAddress  The Address to the External NFT Contract to check
  /// @param account          The Account to check if it is the Owner of the specified Contract
  /// @return True if the account is the Owner of the _contract
  // function isContractOwner(address contractAddress, address account) external view override virtual returns (bool) {
  //   return contractAddress.isContractOwner(account);
  // }

  // function isWalletManagerEnabled(string calldata walletManagerId) external virtual override view returns (bool) {
  //   return _isWalletManagerEnabled(walletManagerId);
  // }

  // function getWalletManager(string calldata walletManagerId) external virtual override view returns (IWalletManager) {
  //   return _ftWalletManager[walletManagerId];
  // }

  // function isNftBasketEnabled(string calldata basketId) external virtual override view returns (bool) {
  //   return _isNftBasketEnabled(basketId);
  // }

  // function getBasketManager(string calldata basketId) external virtual override view returns (IBasketManager) {
  //   return _nftBasketManager[basketId];
  // }


  /// @dev Gets the amount of creator annuities reserved for the creator for the specified NFT
  /// @param contractAddress The Address to the Contract of the NFT
  /// @param tokenId         The Token ID of the NFT
  /// @return creator The address of the creator
  /// @return annuityPct The percentage amount of annuities reserved for the creator
  function getCreatorAnnuities(
    address contractAddress,
    uint256 tokenId
  )
    external
    view
    override
    virtual
    returns (address creator, uint256 annuityPct)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    creator = contractAddress.getTokenCreator(tokenId);
    annuityPct = _creatorAnnuityPercent[tokenUuid];
  }

  function getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId)
    external
    view
    override
    virtual
    returns (address)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return _creatorAnnuityRedirect[tokenUuid];
  }

  function getTempLockExpiryBlocks() external view override virtual returns (uint256) {
    return _tempLockExpiryBlocks;
  }

  function getTimelockApprovals(address operator)
    external
    view
    override
    virtual
    returns (bool timelockAny, bool timelockOwn)
  {
    timelockAny = _nftActionPerms[operator].hasBit(PERM_TIMELOCK_ANY_NFT);
    timelockOwn = _nftActionPerms[operator].hasBit(PERM_TIMELOCK_OWN_NFT);
  }

  function getAssetRequirements(address contractAddress, address assetToken)
    external
    view
    override
    virtual
    returns (
      string memory requiredWalletManager,
      bool energizeEnabled,
      bool restrictedAssets,
      bool validAsset,
      uint256 depositCap,
      uint256 depositMin,
      uint256 depositMax,
      bool invalidAsset
    )
  {
    requiredWalletManager = _nftRequiredWalletManager[contractAddress];
    energizeEnabled = _nftActionPerms[contractAddress].hasBit(PERM_CHARGE_NFT);
    restrictedAssets = _nftActionPerms[contractAddress].hasBit(PERM_RESTRICTED_ASSETS);
    validAsset = _nftAllowedAssetTokens[contractAddress][assetToken];
    depositCap = _depositCap[assetToken];
    depositMin = _nftDepositMin[contractAddress][assetToken];
    depositMax = _nftDepositMax[contractAddress][assetToken];
    invalidAsset = _invalidAssets[assetToken];
  }

  function getNftAssetRequirements(address contractAddress, address nftTokenAddress)
    external
    view
    override
    virtual
    returns (string memory requiredBasketManager, bool basketEnabled, uint256 maxNfts)
  {
    requiredBasketManager = _nftRequiredWalletManager[contractAddress];
    basketEnabled = _nftActionPerms[contractAddress].hasBit(PERM_BASKET_NFT);
    maxNfts = _nftMaxNfts[contractAddress][nftTokenAddress];
  }


  /***********************************|
  |         Only NFT Creator          |
  |__________________________________*/

  /// @notice Sets the Custom Configuration for Creators of Proton-based NFTs
  /// @param contractAddress  The Address to the Proton-based NFT to configure
  /// @param tokenId          The token ID of the Proton-based NFT to configure
  /// @param creator          The creator of the Proton-based NFT
  /// @param annuityPercent   The percentage of interest-annuities to reserve for the creator
  function setCreatorAnnuities(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent
  )
    external
    virtual
    override
  {
    require(contractAddress.isTokenContractOrCreator(tokenId, creator, _msgSender()), "CP:E-104");
    require(annuityPercent <= MAX_ANNUITIES, "CP:E-421");

    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

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
  /// @param creator          The creator of the Proton-based NFT
  /// @param receiver         The receiver of the Creator interest-annuities
  function setCreatorAnnuitiesRedirect(
    address contractAddress,
    uint256 tokenId,
    address creator,
    address receiver
  )
    external
    virtual
    override
  {
    require(contractAddress.isTokenContractOrCreator(tokenId, creator, _msgSender()), "CP:E-104");
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _creatorAnnuityRedirect[tokenUuid] = receiver;
    emit TokenCreatorAnnuitiesRedirected(contractAddress, tokenId, receiver);
  }

  function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
    trustedForwarder = _trustedForwarder;
  }


  /***********************************|
  |     Register Contract Settings    |
  |(For External Contract Integration)|
  |__________________________________*/

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
      _nftRequiredWalletManager[contractAddress] = "";
    } else {
      _nftRequiredWalletManager[contractAddress] = walletManager;
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
      _nftRequiredBasketManager[contractAddress] = "";
    } else {
      _nftRequiredBasketManager[contractAddress] = basketManager;
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
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].setBit(PERM_RESTRICTED_ASSETS);
    } else {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].clearBit(PERM_RESTRICTED_ASSETS);
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
    _nftAllowedAssetTokens[contractAddress][assetToken] = isAllowed;

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
    _nftDepositMin[contractAddress][assetToken] = depositMin;
    _nftDepositMax[contractAddress][assetToken] = depositMax;

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
    _nftMaxNfts[contractAddress][nftTokenAddress] = maxNfts;

    emit MaxNftsSet(
      contractAddress,
      nftTokenAddress,
      maxNfts
    );
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setAssetInvalidity(address assetToken, bool invalidity) external virtual override onlyOwner {
    _invalidAssets[assetToken] = invalidity;
    emit AssetInvaliditySet(assetToken, invalidity);
  }

  function setDepositCap(address assetToken, uint256 cap) external virtual onlyOwner {
    _depositCap[assetToken] = cap;
    emit DepositCapSet(assetToken, cap);
  }

  function setTempLockExpiryBlocks(uint256 numBlocks) external virtual onlyOwner {
    _tempLockExpiryBlocks = numBlocks;
    emit TempLockExpirySet(numBlocks);
  }

  // /// @dev Register Contracts as wallet managers with a unique liquidity provider ID
  // function registerWalletManager(string calldata walletManagerId, address walletManager) external virtual onlyOwner {
  //   // Validate wallet manager
  //   IWalletManager newWalletMgr = IWalletManager(walletManager);
  //   require(newWalletMgr.isPaused() != true, "CP:E-418");

  //   // Register LP ID
  //   _ftWalletManager[walletManagerId] = newWalletMgr;
  //   emit WalletManagerRegistered(walletManagerId, walletManager);
  // }

  // /// @dev Register Contracts as basket managers with a unique basket ID
  // function registerBasketManager(string calldata basketId, address basketManager) external virtual onlyOwner {
  //   // Validate basket manager
  //   IBasketManager newBasketMgr = IBasketManager(basketManager);
  //   require(newBasketMgr.isPaused() != true, "CP:E-418");

  //   // Register Basket ID
  //   _nftBasketManager[basketId] = newBasketMgr;
  //   emit BasketManagerRegistered(basketId, basketManager);
  // }

  function enableNftContracts(address[] calldata contracts) external override virtual onlyOwner {
    uint count = contracts.length;
    for (uint i = 0; i < count; i++) {
      address tokenContract = contracts[i];
      _setPermsForCharge(tokenContract, true);
      _setPermsForBasket(tokenContract, true);
      _setPermsForTimelockSelf(tokenContract, true);
    }
  }

  /// @dev Update the list of NFT contracts that can be Charged
  function setPermsForCharge(address contractAddress, bool state)
    external
    override
    virtual
    onlyOwner
  {
    _setPermsForCharge(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can hold other NFTs
  function setPermsForBasket(address contractAddress, bool state)
    external
    override
    virtual
    onlyOwner
  {
    _setPermsForBasket(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can Timelock any NFT for Front-run Protection
  function setPermsForTimelockAny(address contractAddress, bool state)
    external
    override
    virtual
    onlyOwner
  {
    _setPermsForTimelockAny(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can Timelock their own tokens
  function setPermsForTimelockSelf(address contractAddress, bool state)
    external
    override
    virtual
    onlyOwner
  {
    _setPermsForTimelockSelf(contractAddress, state);
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

  // /// @dev See {ChargedParticles-isWalletManagerEnabled}.
  // function _isWalletManagerEnabled(string calldata walletManagerId) internal view virtual returns (bool) {
  //   return (address(_ftWalletManager[walletManagerId]) != address(0x0) && !_ftWalletManager[walletManagerId].isPaused());
  // }

  // /// @dev See {ChargedParticles-isNftBasketEnabled}.
  // function _isNftBasketEnabled(string calldata basketId) internal view virtual returns (bool) {
  //   return (address(_nftBasketManager[basketId]) != address(0x0) && !_nftBasketManager[basketId].isPaused());
  // }

  /// @dev Update the list of NFT contracts that can be Charged
  function _setPermsForCharge(address contractAddress, bool state) internal virtual {
    if (state) {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].setBit(PERM_CHARGE_NFT);
    } else {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].clearBit(PERM_CHARGE_NFT);
    }
    emit PermsSetForCharge(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can hold other NFTs
  function _setPermsForBasket(address contractAddress, bool state) internal virtual {
    if (state) {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].setBit(PERM_BASKET_NFT);
    } else {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].clearBit(PERM_BASKET_NFT);
    }
    emit PermsSetForBasket(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can Timelock any NFT for Front-run Protection
  function _setPermsForTimelockAny(address contractAddress, bool state) internal virtual {
    if (state) {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].setBit(PERM_TIMELOCK_ANY_NFT);
    } else {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].clearBit(PERM_TIMELOCK_ANY_NFT);
    }
    emit PermsSetForTimelockAny(contractAddress, state);
  }

  /// @dev Update the list of NFT contracts that can Timelock their own tokens
  function _setPermsForTimelockSelf(address contractAddress, bool state) internal virtual {
    if (state) {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].setBit(PERM_TIMELOCK_OWN_NFT);
    } else {
      _nftActionPerms[contractAddress] = _nftActionPerms[contractAddress].clearBit(PERM_TIMELOCK_OWN_NFT);
    }
    emit PermsSetForTimelockSelf(contractAddress, state);
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
    require(contractAddress.isContract(), "CP:E-420");
    _;
  }

  modifier onlyContractOwnerOrAdmin(address contractAddress, address sender) {
    require(sender == owner() || contractAddress.isContractOwner(sender), "CP:E-103");
    _;
  }
}
