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
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedState.sol";
import "./interfaces/IChargedSettings.sol";
import "./interfaces/IChargedManagers.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/IWalletManager.sol";
import "./interfaces/IBasketManager.sol";
import "./interfaces/ITokenInfoProxy.sol";

import "./lib/Bitwise.sol";
import "./lib/RelayRecipient.sol";

import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
contract ChargedParticles is
  IChargedParticles,
  Initializable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  RelayRecipient,
  IERC721ReceiverUpgradeable,
  BlackholePrevention,
  IERC1155ReceiverUpgradeable
{
  using SafeMathUpgradeable for uint256;
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using Bitwise for uint32;
  using AddressUpgradeable for address;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;       // 10000  (100%)

  //
  // Particle Terminology
  //
  //   Particle               - Non-fungible Token (NFT)
  //   Mass                   - Underlying Asset of a Token (ex; DAI)
  //   Charge                 - Accrued Interest on the Underlying Asset of a Token
  //   Charged Particle       - Any NFT that has a Mass and a Positive Charge
  //   Neutral Particle       - Any NFT that has a Mass and No Charge
  //   Energize               - To deposit an Underlying Asset into an NFT
  //   Discharge              - Withdraw the Accrued Interest of an NFT leaving the Particle with its initial Mass
  //   Release                - Withdraw the Underlying Asset & Accrued Interest of an NFT leaving the Particle with No Mass or Charge
  //
  //   Proton                 - NFTs minted from the Charged Particle Accelerator
  //                            - A proton is a subatomic particle, symbol p or p⁺, with a positive electric charge of +1e elementary
  //                              charge and a mass slightly less than that of a neutron.
  //   Ionx                    - Platform Governance Token
  //                            - A charged subatomic particle. An atom or group of atoms that carries a positive or negative electric charge
  //                              as a result of having lost or gained one or more electrons.
  //

  // Linked Contracts
  IUniverse internal _universe;
  IChargedState internal _chargedState;
  IChargedSettings internal _chargedSettings;
  address internal _lepton;
  uint256 internal depositFee;
  ITokenInfoProxy internal _tokenInfoProxy;
  IChargedManagers internal _chargedManagers;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(address initiator) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    emit Initialized(initiator);
  }


  /***********************************|
  |         Public Functions          |
  |__________________________________*/

  function getStateAddress() external view virtual override returns (address stateAddress) {
    return address(_chargedState);
  }

  function getSettingsAddress() external view virtual override returns (address settingsAddress) {
    return address(_chargedSettings);
  }

  function getManagersAddress() external view virtual override returns (address managersAddress) {
    return address(_chargedManagers);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external virtual override returns (bytes4) {
    return IERC721ReceiverUpgradeable(0).onERC721Received.selector;
  }

  function onERC1155Received(address, address, uint256, uint256, bytes calldata) external virtual override returns (bytes4) {
    return IERC1155ReceiverUpgradeable(0).onERC1155Received.selector;
  }

  /// @dev Unimplemented
  function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external virtual override returns (bytes4) {
    return ""; // IERC1155ReceiverUpgradeable(0).onERC1155BatchReceived.selector;
  }

  function supportsInterface(bytes4 interfaceId) external view virtual override returns (bool) {
    return  interfaceId == 0x01ffc9a7 ||    // ERC-165
            interfaceId == 0x80ac58cd ||    // ERC-721
            interfaceId == 0x4e2312e0;      // ERC-1155
  }

  /// @notice Calculates the amount of fees to be paid for a specific deposit amount
  /// @param assetAmount    The amount of assets to calculate fees on
  /// @return               protocolFee The amount of deposit fees for the protocol
  function getFeesForDeposit(
    uint256 assetAmount
  )
    external
    override
    view
    returns (uint256 protocolFee)
  {
    protocolFee = _getFeesForDeposit(assetAmount);
  }

  /// @notice Gets the amount of asset tokens that have been deposited into the Particle
  /// representing the Mass of the Particle
  /// @param contractAddress    The address to the contract of the token (Particle)
  /// @param tokenId            The ID of the token (Particle)
  /// @param walletManagerId    The liquidity provider ID to check the asset balance of
  /// @param assetToken         The address of the asset token to check
  /// @return                   The amount of underlying asset held within the token (principal)
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

  /// @notice Gets the amount of interest that the Particle has generated representing
  /// the Charge of the Particle
  /// @param contractAddress      The address to the contract of the token (Particle)
  /// @param tokenId              The ID of the token (Particle)
  /// @param walletManagerId      The liquidity provider ID to check the interest balance of
  /// @param assetToken           The address of the asset token to check
  /// @return                     The amount of interest the token (Particle) has generated (for a given asset token)
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
  /// @param contractAddress      The address to the contract of the token (Particle)
  /// @param tokenId              The ID of the token (Particle)
  /// @param walletManagerId      The liquidity provider ID to check the Kinetics balance of
  /// @param assetToken           The address of the asset token to check
  /// @return                     The amount of LP tokens that have been generated
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
  /// @param contractAddress  The address to the contract of the token (Particle)
  /// @param tokenId          The ID of the token (Particle)
  /// @param basketManagerId  The ID of the Basket Manager to check the token balance of
  /// @return                 The total amount of ERC721 tokens that are held within the Particle
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
  |        Energize Particles         |
  |__________________________________*/

  /// @notice Fund a Particle with an asset token (ERC20)
  ///    Must be called by the account providing the asset
  ///    The account must approve THIS (ChargedParticles.sol) contract as Operator of the asset
  ///
  /// @param contractAddress      The address to the contract of the token (Particle) to Energize
  /// @param tokenId              The ID of the token (Particle) to Energize
  /// @param walletManagerId      The asset pair to Energize the token (Particle) with
  /// @param assetToken           The address of the asset token being deposited
  /// @param assetAmount          The amount of asset token to Energize with
  /// @return                     yieldTokensAmount The amount of yield-bearing tokens added to the Particle
  function energizeParticle(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount,
    address referrer
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 yieldTokensAmount)
  {
    _validateDeposit(contractAddress, tokenId, walletManagerId, assetToken, assetAmount);

    // Transfer ERC20 Token from Caller to Contract (reverts on fail)
    uint256 feeAmount = _collectAssetToken(_msgSender(), assetToken, assetAmount);

    // Deposit asset token directly into Smart Wallet (reverts on fail) and Update WalletManager
    yieldTokensAmount = _depositIntoWalletManager(contractAddress, tokenId, walletManagerId, assetToken, assetAmount, feeAmount);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onEnergize(_msgSender(), referrer, contractAddress, tokenId, walletManagerId, assetToken, assetAmount);
    }
  }

  /***********************************|
  |        Discharge Particles        |
  |__________________________________*/

  /// @notice Allows the owner or operator of the token (Particle) to collect or transfer the interest generated
  ///         from the token without removing the underlying asset
  /// @param receiver             The address to receive the discharged asset tokens
  /// @param contractAddress      The address to the contract of the token (Particle) to Discharge
  /// @param tokenId              The ID of token (Particle) to Discharge
  /// @param walletManagerId      The Wallet Manager of the assets to Discharge from the token (Particle)
  /// @param assetToken           The address of the asset token being discharged
  /// @return                     creatorAmount the amount of asset token discharged to the Creator
  /// @return                     receiverAmount the amount of asset token discharged to the Receiver
  function dischargeParticle(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    _validateDischarge(contractAddress, tokenId);

    address creatorRedirect = _chargedSettings.getCreatorAnnuitiesRedirect(contractAddress, tokenId);
    (creatorAmount, receiverAmount) = _chargedManagers.getWalletManager(walletManagerId).discharge(
      receiver,
      contractAddress,
      tokenId,
      assetToken,
      creatorRedirect
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onDischarge(contractAddress, tokenId, walletManagerId, assetToken, creatorAmount, receiverAmount);
    }
  }

  /// @notice Allows the owner or operator of the token (Particle) to collect or transfer a specific amount of the interest
  ///         generated from the token without removing the underlying asset from the Particle
  /// @param receiver             The address to receive the Discharged asset tokens
  /// @param contractAddress      The address to the contract of the token (Particle) to Discharge
  /// @param tokenId              The ID of the token (Particle) to Discharge
  /// @param walletManagerId      The Wallet Manager of the assets to Discharge from the token (Particle)
  /// @param assetToken           The address of the asset token being discharged
  /// @param assetAmount          The specific amount of asset token to Discharge from token (Particle)
  /// @return                     creatorAmount The amount of asset token discharged to the Creator
  /// @return                     receiverAmount The amount of asset token discharged to the Receiver
  function dischargeParticleAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    _validateDischarge(contractAddress, tokenId);

    address creatorRedirect = _chargedSettings.getCreatorAnnuitiesRedirect(contractAddress, tokenId);
    (creatorAmount, receiverAmount) = _chargedManagers.getWalletManager(walletManagerId).dischargeAmount(
      receiver,
      contractAddress,
      tokenId,
      assetToken,
      assetAmount,
      creatorRedirect
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onDischarge(contractAddress, tokenId, walletManagerId, assetToken, creatorAmount, receiverAmount);
    }
  }

  /// @notice Allows the creator of the token (Particle) to collect or transfer a their portion of the interest (if any)
  ///         generated from the token without removing the underlying asset that is held within the Particle
  /// @param receiver             The address to receive the Discharged asset tokens
  /// @param contractAddress      The address to the contract of the token (Particle) to Discharge
  /// @param tokenId              The ID of the Token to Discharge
  /// @param walletManagerId      The Wallet Manager of the assets to Discharge from the Token
  /// @param assetToken           The address of the asset token being discharged
  /// @param assetAmount          The specific amount of asset token to Discharge from the Particle
  /// @return receiverAmount      The amount of asset token discharged to the Receiver
  function dischargeParticleForCreator(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 receiverAmount)
  {
    address sender = _msgSender();
    address tokenCreator = _tokenInfoProxy.getTokenCreator(contractAddress, tokenId);
    require(sender == tokenCreator, "CP:E-104");

    receiverAmount = _chargedManagers.getWalletManager(walletManagerId).dischargeAmountForCreator(
      receiver,
      contractAddress,
      tokenId,
      sender,
      assetToken,
      assetAmount
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onDischargeForCreator(contractAddress, tokenId, walletManagerId, sender, assetToken, receiverAmount);
    }
  }


  /***********************************|
  |         Release Particles         |
  |__________________________________*/

  /// @notice Releases the Full amount of Asset + Interest held within the Particle by LP of the Assets
  /// @param receiver             The address to Receive the Released asset tokens
  /// @param contractAddress      The address to the contract of the token (Particle) to Release
  /// @param tokenId              The ID of the Token to Release
  /// @param walletManagerId      The Wallet Manager of the Assets to Release from the Token
  /// @param assetToken           The address of the asset token being released
  /// @return                     creatorAmount The amount of asset token released to the Creator
  /// @return                     receiverAmount The amount of asset token released to the Receiver (includes principalAmount)
  function releaseParticle(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    _validateRelease(contractAddress, tokenId);

    // Release Particle to Receiver
    uint256 principalAmount;
    address creatorRedirect = _chargedSettings.getCreatorAnnuitiesRedirect(contractAddress, tokenId);
    (principalAmount, creatorAmount, receiverAmount) = _chargedManagers.getWalletManager(walletManagerId).release(
      receiver,
      contractAddress,
      tokenId,
      assetToken,
      creatorRedirect
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onRelease(contractAddress, tokenId, walletManagerId, assetToken, principalAmount, creatorAmount, receiverAmount);
    }
  }


  /// @notice Releases a partial amount of principal + interest held within the Particle by LP of the Assets
  /// @param receiver             The address to receive the Released asset tokens
  /// @param contractAddress      The address to the contract of the token (Particle) to Release
  /// @param tokenId              The ID of the token (Particle) to Release
  /// @param walletManagerId      The Wallet Manager of the assets to Release from the token (Particle)
  /// @param assetToken           The address of the asset token being released
  /// @param assetAmount          The specific amount of asset token to Release from the Particle
  /// @return                     creatorAmount The amount of asset token released to the Creator
  /// @return                     receiverAmount The amount of asset token released to the Receiver (includes principalAmount)
  function releaseParticleAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    external
    virtual
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    _validateRelease(contractAddress, tokenId);

    // Release Particle to Receiver
    uint256 principalAmount;
    address creatorRedirect = _chargedSettings.getCreatorAnnuitiesRedirect(contractAddress, tokenId);
    (principalAmount, creatorAmount, receiverAmount) = _chargedManagers.getWalletManager(walletManagerId).releaseAmount(
      receiver,
      contractAddress,
      tokenId,
      assetToken,
      assetAmount,
      creatorRedirect
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onRelease(contractAddress, tokenId, walletManagerId, assetToken, principalAmount, creatorAmount, receiverAmount);
    }
  }


  /***********************************|
  |         Covalent Bonding          |
  |__________________________________*/

  /// @notice Deposit other NFT Assets into the Particle
  ///    Must be called by the account providing the Asset
  ///    Account must Approve THIS contract as Operator of Asset
  ///
  /// @param contractAddress      The address to the contract of the token (Particle) to Energize
  /// @param tokenId              The ID of the token (Particle) to Energize
  /// @param basketManagerId      The Basket to deposit the NFT into
  /// @param nftTokenAddress      The address of the NFT being deposited
  /// @param nftTokenId           The ID of the NFT being deposited
  function covalentBond(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId
  )
    external
    virtual
    override
    basketEnabled(basketManagerId)
    nonReentrant
    returns (bool success)
  {
    _validateNftDeposit(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);

    // Transfer ERC721 Token from Caller to Contract (reverts on fail)
    _collectNftToken(_msgSender(), nftTokenAddress, nftTokenId);

    // Deposit asset token directly into Smart Wallet (reverts on fail) and Update WalletManager
    success = _depositIntoBasketManager(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onCovalentBond(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);
    }
  }

  /// @notice Release NFT Assets from the Particle
  /// @param receiver             The address to receive the Released asset tokens
  /// @param contractAddress      The contract address of the token (Particle) to Energize
  /// @param tokenId              The ID of the token (Particle) to Release from
  /// @param basketManagerId      The Basket to Release the NFT from
  /// @param nftTokenAddress      The address of the NFT Token being Released
  /// @param nftTokenId           The ID of the NFT Token being Released
  function breakCovalentBond(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId
  )
    external
    virtual
    override
    basketEnabled(basketManagerId)
    nonReentrant
    returns (bool success)
  {
    _validateBreakBond(contractAddress, tokenId);

    // Release Particle to Receiver
    success = _chargedManagers.getBasketManager(basketManagerId).removeFromBasket(
      receiver,
      contractAddress,
      tokenId,
      nftTokenAddress,
      nftTokenId
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onCovalentBreak(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);
    }
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the various Charged-Controllers
  function setController(address controller, string calldata controllerId) external virtual onlyOwner {
    bytes32 controllerIdStr = keccak256(abi.encodePacked(controllerId));

    if (controllerIdStr == keccak256(abi.encodePacked("universe"))) {
      _universe = IUniverse(controller);
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("settings"))) {
      _chargedSettings = IChargedSettings(controller);
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("state"))) {
      _chargedState = IChargedState(controller);
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("managers"))) {
      _chargedManagers = IChargedManagers(controller);
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("leptons"))) {
      _lepton = controller;
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("forwarder"))) {
      trustedForwarder = controller;
    }
    else if (controllerIdStr == keccak256(abi.encodePacked("tokeninfo"))) {
      _tokenInfoProxy = ITokenInfoProxy(controller);
    }

    emit ControllerSet(controller, controllerId);
  }


  /***********************************|
  |          Protocol Fees            |
  |__________________________________*/

  /// @dev Setup the base deposit fee for the protocol
  function setDepositFee(uint256 fee) external onlyOwner {
    require(fee < PERCENTAGE_SCALE, "CP:E-421");
    depositFee = fee;
    emit DepositFeeSet(fee);
  }

  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external onlyOwner {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev Validates a deposit according to the rules set by the token contract
  /// @param contractAddress      The contract address of the asset token to check
  /// @param tokenId              The token ID of the asset token to check
  /// @param walletManagerId      The Wallet Manager of the assets to deposit
  /// @param assetToken           The address of the asset token to deposit
  /// @param assetAmount          The specific amount of asset token to deposit
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
    _chargedManagers.validateDeposit(_msgSender(), contractAddress, tokenId, walletManagerId, assetToken, assetAmount);
  }

  /// @dev Validates an NFT deposit according to the rules set by the token contract
  /// @param contractAddress      The address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param basketManagerId      The Basket to deposit the NFT into
  /// @param nftTokenAddress      The address of the NFT Token being deposited
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
  {
    _chargedManagers.validateNftDeposit(_msgSender(), contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);
  }

  function _validateDischarge(address contractAddress, uint256 tokenId) internal virtual {
    _chargedManagers.validateDischarge(_msgSender(), contractAddress, tokenId);
  }

  function _validateRelease(address contractAddress, uint256 tokenId) internal virtual {
    _chargedManagers.validateRelease(_msgSender(), contractAddress, tokenId);
  }

  function _validateBreakBond(address contractAddress, uint256 tokenId) internal virtual {
    _chargedManagers.validateBreakBond(_msgSender(), contractAddress, tokenId);
  }

  /// @dev Deposit asset tokens into an NFT via the Wallet Manager
  /// @param contractAddress      The contract address of the Particle
  /// @param tokenId              The Token ID of the NFT
  /// @param walletManagerId      The Wallet Manager of the assets to deposit
  /// @param assetToken           The address of the asset token to deposit
  /// @param assetAmount          The specific amount of asset token to deposit
  /// @param feeAmount            The amount of protocol fees charged
  function _depositIntoWalletManager(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount,
    uint256 feeAmount
  )
    internal
    virtual
    returns (uint256)
  {
    // Get Wallet-Manager for LP
    IWalletManager lpWalletMgr = _chargedManagers.getWalletManager(walletManagerId);

    (address creator, uint256 annuityPct) = _chargedSettings.getCreatorAnnuities(contractAddress, tokenId);

    // Deposit asset token directly into Smart Wallet (reverts on fail) and Update WalletManager
    address wallet = lpWalletMgr.getWalletAddressById(contractAddress, tokenId, creator, annuityPct);
    IERC20Upgradeable(assetToken).transfer(wallet, assetAmount);

    emit ProtocolFeesCollected(assetToken, assetAmount, feeAmount);

    return lpWalletMgr.energize(contractAddress, tokenId, assetToken, assetAmount);
  }

  /// @dev Deposit NFTs into the Basket Manager
  /// @param contractAddress      The contract address of the token (Particle)
  /// @param tokenId              The Token ID of the NFT
  /// @param basketManagerId      The Wallet Manager of the Assets to deposit
  /// @param nftTokenAddress      The address of the NFT to deposit
  /// @param nftTokenId           The specific amount of asset token to deposit
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
    IBasketManager basketMgr = _chargedManagers.getBasketManager(basketManagerId);
    address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);

    if (_isERC1155(nftTokenAddress)) {
      IERC1155Upgradeable(nftTokenAddress).safeTransferFrom(address(this), wallet, nftTokenId, 1, "");
    } else {
      IERC721Upgradeable(nftTokenAddress).transferFrom(address(this), wallet, nftTokenId);
    }
    return basketMgr.addToBasket(contractAddress, tokenId, nftTokenAddress, nftTokenId);
  }

  /**
    * @dev Calculates the amount of fees to be paid for a specific deposit amount; fees are calculated in terms of the interest token
    * @param assetAmount      The amount of assets to calculate fees on
    * @return                 protocolFee The amount of fees reserved for the protocol
    */
  function _getFeesForDeposit(
    uint256 assetAmount
  )
    internal
    view
    returns (uint256 protocolFee)
  {
    if (depositFee > 0) {
      protocolFee = assetAmount.mul(depositFee).div(PERCENTAGE_SCALE);
    }
  }

  /// @dev Collects the Required ERC20 Token(s) from the user's wallet; be sure to approve this contract (ChargedParticles.sol) to transfer your token(s)
  /// @param from               The owner address to collect the tokens from
  /// @param tokenAddress       The address of the token to transfer
  /// @param tokenAmount        The amount of tokens to collect
  function _collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) internal virtual returns (uint256 protocolFee) {
    protocolFee = _getFeesForDeposit(tokenAmount);
    IERC20Upgradeable(tokenAddress).safeTransferFrom(from, address(this), tokenAmount.add(protocolFee));
  }

  /// @dev Collects the Required ERC721 token(s) from the user's wallet; be sure to approve this contract (ChargedParticles.sol) to transfer your nft(s)
  /// @param from               The owner address to collect the tokens from
  /// @param nftTokenAddress    The address of the NFT token to transfer
  /// @param nftTokenId         The ID of the NFT token to transfer
  function _collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId) internal virtual {
    if (_isERC1155(nftTokenAddress)) {
      IERC1155Upgradeable(nftTokenAddress).safeTransferFrom(from, address(this), nftTokenId, 1, "");
    } else {
      IERC721Upgradeable(nftTokenAddress).safeTransferFrom(from, address(this), nftTokenId);
    }
  }

  /// @dev Checks if an NFT contract supports the ERC1155 standard interface
  function _isERC1155(address nftTokenAddress) internal view virtual returns (bool) {
    bytes4 _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    return IERC165Upgradeable(nftTokenAddress).supportsInterface(_INTERFACE_ID_ERC1155);
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
    return _chargedManagers.getWalletManager(walletManagerId).getPrincipal(contractAddress, tokenId, assetToken);
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
    (, uint256 ownerInterest) = _chargedManagers.getWalletManager(walletManagerId).getInterest(contractAddress, tokenId, assetToken);
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
    return _chargedManagers.getWalletManager(walletManagerId).getRewards(contractAddress, tokenId, assetToken);
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
    return _chargedManagers.getBasketManager(basketManagerId).getTokenTotalCount(contractAddress, tokenId);
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

  modifier managerEnabled(string calldata walletManagerId) {
    require(_chargedManagers.isWalletManagerEnabled(walletManagerId), "CP:E-419");
    _;
  }

  modifier basketEnabled(string calldata basketManagerId) {
    require(_chargedManagers.isNftBasketEnabled(basketManagerId), "CP:E-419");
    _;
  }
}
