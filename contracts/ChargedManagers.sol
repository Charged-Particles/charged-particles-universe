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

import "./interfaces/IChargedManagers.sol";
import "./interfaces/IChargedSettings.sol";
import "./interfaces/IChargedState.sol";
import "./interfaces/ITokenInfoProxy.sol";

import "./lib/TokenInfo.sol";
import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Wallet-Managers Contract
 */
contract ChargedManagers is
  IChargedManagers,
  Initializable,
  OwnableUpgradeable,
  BlackholePrevention
{
  using SafeMathUpgradeable for uint256;
  using TokenInfo for address;

  IChargedSettings internal _chargedSettings;
  IChargedState internal _chargedState;
  ITokenInfoProxy internal _tokenInfoProxy;

  // Wallet/Basket Managers (by Unique Manager ID)
  mapping (string => IWalletManager) internal _ftWalletManager;
  mapping (string => IBasketManager) internal _nftBasketManager;


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

  /// @notice Checks if an Account is the Owner of an NFT Contract
  ///    When Custom Contracts are registered, only the "owner" or operator of the Contract
  ///    is allowed to register them and define custom rules for how their tokens are "Charged".
  ///    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
  /// @param contractAddress  The Address to the External NFT Contract to check
  /// @param account          The Account to check if it is the Owner of the specified Contract
  /// @return True if the account is the Owner of the _contract
  function isContractOwner(address contractAddress, address account) external view override virtual returns (bool) {
    return contractAddress.isContractOwner(account);
  }

  function isWalletManagerEnabled(string calldata walletManagerId) external virtual override view returns (bool) {
    return _isWalletManagerEnabled(walletManagerId);
  }

  function getWalletManager(string calldata walletManagerId) external virtual override view returns (IWalletManager) {
    return _ftWalletManager[walletManagerId];
  }

  function isNftBasketEnabled(string calldata basketId) external virtual override view returns (bool) {
    return _isNftBasketEnabled(basketId);
  }

  function getBasketManager(string calldata basketId) external virtual override view returns (IBasketManager) {
    return _nftBasketManager[basketId];
  }

  /// @dev Validates a Deposit according to the rules set by the Token Contract
  /// @param sender           The sender address to validate against
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param walletManagerId  The Wallet Manager of the Assets to Deposit
  /// @param assetToken           The Address of the Asset Token to Deposit
  /// @param assetAmount          The specific amount of Asset Token to Deposit
  function validateDeposit(
    address sender,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  ) external virtual override {
    _validateDeposit(sender, contractAddress, tokenId, walletManagerId, assetToken, assetAmount);
  }

  /// @dev Validates an NFT Deposit according to the rules set by the Token Contract
  /// @param sender           The sender address to validate against
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param basketManagerId      The Basket to Deposit the NFT into
  /// @param nftTokenAddress      The Address of the NFT Token being deposited
  /// @param nftTokenId           The ID of the NFT Token being deposited
  /// @param nftTokenAmount       The amount of Tokens to Deposit (ERC1155-specific)
  function validateNftDeposit(
    address sender,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  ) external virtual override {
    _validateNftDeposit(sender, contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId, nftTokenAmount);
  }

  function validateDischarge(address sender, address contractAddress, uint256 tokenId) external virtual override {
    _validateDischarge(sender, contractAddress, tokenId);
  }

  function validateRelease(address sender, address contractAddress, uint256 tokenId) external virtual override {
    _validateRelease(sender, contractAddress, tokenId);
  }

  function validateBreakBond(address sender, address contractAddress, uint256 tokenId) external virtual override {
    _validateBreakBond(sender, contractAddress, tokenId);
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the various Charged-Controllers
  function setController(address controller, string calldata controllerId) external virtual onlyOwner {
    bytes32 controllerIdStr = keccak256(abi.encodePacked(controllerId));

    if (controllerIdStr == keccak256(abi.encodePacked("settings"))) {
      _chargedSettings = IChargedSettings(controller);
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("state"))) {
      _chargedState = IChargedState(controller);
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("tokeninfo"))) {
      _tokenInfoProxy = ITokenInfoProxy(controller);
    }

    emit ControllerSet(controller, controllerId);
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

  /// @dev See {ChargedParticles-isWalletManagerEnabled}.
  function _isWalletManagerEnabled(string calldata walletManagerId) internal view virtual returns (bool) {
    return (address(_ftWalletManager[walletManagerId]) != address(0x0) && !_ftWalletManager[walletManagerId].isPaused());
  }

  /// @dev See {ChargedParticles-isNftBasketEnabled}.
  function _isNftBasketEnabled(string calldata basketId) internal view virtual returns (bool) {
    return (address(_nftBasketManager[basketId]) != address(0x0) && !_nftBasketManager[basketId].isPaused());
  }

  /// @dev Validates a Deposit according to the rules set by the Token Contract
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param walletManagerId  The Wallet Manager of the Assets to Deposit
  /// @param assetToken           The Address of the Asset Token to Deposit
  /// @param assetAmount          The specific amount of Asset Token to Deposit
  function _validateDeposit(
    address sender,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    internal
    virtual
  {
    if (_chargedState.isEnergizeRestricted(contractAddress, tokenId)) {
      bool isNFTOwnerOrOperator = _tokenInfoProxy.isNFTOwnerOrOperator(contractAddress, tokenId, sender);
      require(isNFTOwnerOrOperator, "CP:E-105");
    }

    ( string memory requiredWalletManager,
      bool energizeEnabled,
      bool restrictedAssets,
      bool validAsset,
      uint256 depositCap,
      uint256 depositMin,
      uint256 depositMax,
      bool invalidAsset
    ) = _chargedSettings.getAssetRequirements(contractAddress, assetToken);

    require(energizeEnabled, "CP:E-417");

    require(!invalidAsset, "CP:E-424");

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
    uint256 existingBalance = _ftWalletManager[walletManagerId].getPrincipal(contractAddress, tokenId, assetToken);
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
  /// @param nftTokenAmount       The amount of Tokens to Deposit (ERC1155-specific)
  function _validateNftDeposit(
    address sender,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    internal
    virtual
  {
    // Prevent Ouroboros NFTs
    require(contractAddress.getTokenUUID(tokenId) != nftTokenAddress.getTokenUUID(nftTokenId), "CP:E-433");

    if (_chargedState.isCovalentBondRestricted(contractAddress, tokenId)) {
      bool isNFTOwnerOrOperator = _tokenInfoProxy.isNFTOwnerOrOperator(contractAddress, tokenId, sender);
      require(isNFTOwnerOrOperator, "CP:E-105");
    }

    ( string memory requiredBasketManager,
      bool basketEnabled,
      uint256 maxNfts
    ) = _chargedSettings.getNftAssetRequirements(contractAddress, nftTokenAddress);

    require(basketEnabled, "CP:E-417");

    // Valid Basket Manager?
    if (bytes(requiredBasketManager).length > 0) {
        require(keccak256(abi.encodePacked(requiredBasketManager)) == keccak256(abi.encodePacked(basketManagerId)), "CP:E-419");
    }

    if (maxNfts > 0) {
      uint256 tokenCount = _nftBasketManager[basketManagerId].getTokenTotalCount(contractAddress, tokenId);
      require(maxNfts >= (tokenCount + nftTokenAmount), "CP:E-427");
    }
  }

  function _validateDischarge(address sender, address contractAddress, uint256 tokenId) internal virtual {
    ( bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    ) = _chargedState.getDischargeState(contractAddress, tokenId, sender);
    _validateState(allowFromAll, isApproved, timelock, tempLockExpiry);
  }

  function _validateRelease(address sender, address contractAddress, uint256 tokenId) internal virtual {
    ( bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    ) = _chargedState.getReleaseState(contractAddress, tokenId, sender);
    _validateState(allowFromAll, isApproved, timelock, tempLockExpiry);
  }

  function _validateBreakBond(address sender, address contractAddress, uint256 tokenId) internal virtual {
    ( bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    ) = _chargedState.getBreakBondState(contractAddress, tokenId, sender);
    _validateState(allowFromAll, isApproved, timelock, tempLockExpiry);
  }

  function _validateState(
    bool allowFromAll,
    bool isApproved,
    uint256 timelock,
    uint256 tempLockExpiry
  )
    internal
    view
    virtual
  {
    if (!allowFromAll) {
      require(isApproved, "CP:E-105");
    }
    if (timelock > 0) {
      require(block.number >= timelock, "CP:E-302");
    }
    if (tempLockExpiry > 0) {
      require(block.number >= tempLockExpiry, "CP:E-303");
    }
  }
}
