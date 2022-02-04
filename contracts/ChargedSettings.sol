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
import "./interfaces/ITokenInfoProxy.sol";

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

  ITokenInfoProxy internal _tokenInfoProxy;

  // Current settings for External NFT contracts;
  //  - Any user can add any ERC721 or ERC1155 token (with a clearly identifiable owner) as a Charged Particle without Limits,
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

  // Blacklist for non-compliant tokens
  mapping (address => bool) internal _invalidAssets;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(address initiator) public initializer {
    __Ownable_init();
    emit Initialized(initiator);
  }


  /***********************************|
  |               Public              |
  |__________________________________*/

  /// @dev Gets the amount of creator annuities reserved for the creator for the specified NFT
  /// @param contractAddress The contract address of the NFT (Particle)
  /// @param tokenId         The token ID of the NFT (Particle)
  /// @return                creator The creator's address
  /// @return                annuityPct The percentage of annuities reserved for the creator
  function getCreatorAnnuities(
    address contractAddress,
    uint256 tokenId
  )
    external
    override
    virtual
    returns (address creator, uint256 annuityPct)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    creator = _tokenInfoProxy.getTokenCreator(contractAddress, tokenId);
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

  /// @notice Sets a custom configuration for the Creator Annuities of a Proton-based NFT
  /// @param contractAddress  The address of the Proton-based NFT to configure
  /// @param tokenId          The token ID of the Proton-based NFT to configure
  /// @param creator          The creator of the Proton-based NFT
  /// @param annuityPercent   The percentage of interest annuities to reserve for the creator
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
    require(_tokenInfoProxy.isNFTContractOrCreator(contractAddress, tokenId, _msgSender()), "CP:E-104");
    _setCreatorAnnuities(contractAddress, tokenId, creator, annuityPercent);
  }

  /// @notice Sets a custom receiver address for the Creator Annuities
  /// @param contractAddress  The address to the Proton-based NFT to configure
  /// @param tokenId          The token ID of the Proton-based NFT to configure
  /// @param receiver         The receiver of the creator's interest annuities
  function setCreatorAnnuitiesRedirect(
    address contractAddress,
    uint256 tokenId,
    address receiver
  )
    external
    virtual
    override
  {
    require(_tokenInfoProxy.isNFTContractOrCreator(contractAddress, tokenId, _msgSender()), "CP:E-104");
    _setCreatorAnnuitiesRedirect(contractAddress, tokenId, receiver);
  }


  /***********************************|
  |     Register Contract Settings    |
  |(For External Contract Integration)|
  |__________________________________*/

  /// @notice Sets a required Wallet Manager for External NFT contracts (otherwise set to "none" to allow any Wallet Manager)
  /// @param contractAddress    The contract address of the External NFT to configure
  /// @param walletManager      If set, will only allow deposits from this specific Wallet Manager
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

  /// @notice Sets a required Basket Manager for External NFT contracts (otherwise set to "none" to allow any Basket Manager)
  /// @param contractAddress    The contract address of the External NFT to configure
  /// @param basketManager      If set, will only allow deposits from this specific Basket Manager
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
    // Update configs for External token contract
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

  /// @notice Enables or disables asset token restrictions for External NFT contracts
  /// @param contractAddress      The contract address of the External NFT contract to configure
  /// @param restrictionsEnabled  If set, only allowed asset tokens can be deposited
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
    // Update configs for External token contract
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

  /// @notice Enables or disables allowed asset tokens for External NFT contracts
  /// @param contractAddress  The contract address of the External NFT to configure
  /// @param assetToken       The address of the asset token to allow or disallow
  /// @param isAllowed        True if the asset token is allowed
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
    // Update configs for External token contract
    _nftAllowedAssetTokens[contractAddress][assetToken] = isAllowed;

    emit AllowedAssetTokenSet(
      contractAddress,
      assetToken,
      isAllowed
    );
  }

  /// @notice Sets the custom configuration for External contracts
  /// @param contractAddress  The address of the External contract to configure
  /// @param assetToken       The address of the asset token to set limits for
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
    // Update configs for External token contract
    _nftDepositMin[contractAddress][assetToken] = depositMin;
    _nftDepositMax[contractAddress][assetToken] = depositMax;

    emit AssetTokenLimitsSet(
      contractAddress,
      assetToken,
      depositMin,
      depositMax
    );
  }

  /// @notice Sets the maximum number of NFTs that can be held by a Charged Particle NFT
  /// @param contractAddress  The address of the External contract to configure
  /// @param nftTokenAddress  The address of the NFT to set a maximum for
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
    // Update configs for External token contract
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

  /// @dev Setup the various Charged-Controllers
  function setController(address controller, string calldata controllerId) external virtual onlyOwner {
    bytes32 controllerIdStr = keccak256(abi.encodePacked(controllerId));

    if (controllerIdStr == keccak256(abi.encodePacked("tokeninfo"))) {
      _tokenInfoProxy = ITokenInfoProxy(controller);
    }

    emit ControllerSet(controller, controllerId);
  }

  function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
    trustedForwarder = _trustedForwarder;
  }

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

  function enableNftContracts(address[] calldata contracts) external override virtual onlyOwner {
    uint count = contracts.length;
    for (uint i = 0; i < count; i++) {
      address tokenContract = contracts[i];
      _setPermsForCharge(tokenContract, true);
      _setPermsForBasket(tokenContract, true);
      _setPermsForTimelockSelf(tokenContract, true);
    }
  }

  function migrateToken(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent,
    address annuityReceiver
  )
    external
    onlyOwner
  {
    _setCreatorAnnuities(contractAddress, tokenId, creator, annuityPercent);
    if (annuityReceiver != address(0)) {
      _setCreatorAnnuitiesRedirect(contractAddress, tokenId, annuityReceiver);
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

  /// @dev Update the list of NFT contracts that can Timelock any NFT for front-running protection
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

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external virtual onlyOwner {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

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

  /// @dev Update the list of NFT contracts that can Timelock any NFT for front-running protection
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

  /// @dev see setCreatorAnnuities()
  function _setCreatorAnnuities(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent
  )
    internal
    virtual
  {
    require(annuityPercent <= MAX_ANNUITIES, "CP:E-421");
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    // Update configs for External token creator
    _creatorAnnuityPercent[tokenUuid] = annuityPercent;

    emit TokenCreatorConfigsSet(
      contractAddress,
      tokenId,
      creator,
      annuityPercent
    );
  }

  /// @dev see setCreatorAnnuitiesRedirect()
  function _setCreatorAnnuitiesRedirect(
    address contractAddress,
    uint256 tokenId,
    address receiver
  )
    internal
    virtual
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _creatorAnnuityRedirect[tokenUuid] = receiver;
    emit TokenCreatorAnnuitiesRedirected(contractAddress, tokenId, receiver);
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
