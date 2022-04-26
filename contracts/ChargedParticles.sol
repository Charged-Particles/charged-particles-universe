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
 * @notice Charged Particles V2 Contract
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
  //   Energize / Recharge    - Deposit of an Underlying Asset into an NFT
  //   Discharge              - Withdraw the Accrued Interest of an NFT leaving the Particle with its initial Mass
  //   Release                - Withdraw the Underlying Asset & Accrued Interest of an NFT leaving the Particle with No Mass or Charge
  //
  //   Proton                 - NFTs minted from the Charged Particle Accelerator
  //                            - A proton is a subatomic particle, symbol p or p⁺, with a positive electric charge of +1e elementary
  //                              charge and a mass slightly less than that of a neutron.
  //   Ion                    - Platform Governance Token
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

  // Unimplemented
  function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external virtual override returns (bytes4) {
    return ""; // IERC1155ReceiverUpgradeable(0).onERC1155BatchReceived.selector;
  }

  function supportsInterface(bytes4 /* interfaceId */) external view virtual override returns (bool) {
      return false;
  }

  /// @notice Calculates the amount of Fees to be paid for a specific deposit amount
  /// @param assetAmount The Amount of Assets to calculate Fees on
  /// @return protocolFee The amount of deposit fees for the protocol
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
  |        Energize Particles         |
  |__________________________________*/

  /// @notice Fund Particle with Asset Token
  ///    Must be called by the account providing the Asset
  ///    Account must Approve THIS contract as Operator of Asset
  ///
  /// NOTE: DO NOT Energize an ERC20 Token, as anyone who holds any amount
  ///       of the same ERC20 token could discharge or release the funds.
  ///       All holders of the ERC20 token would essentially be owners of the Charged Particle.
  ///
  /// @param contractAddress      The Address to the Contract of the Token to Energize
  /// @param tokenId              The ID of the Token to Energize
  /// @param walletManagerId  The Asset-Pair to Energize the Token with
  /// @param assetToken           The Address of the Asset Token being used
  /// @param assetAmount          The Amount of Asset Token to Energize the Token with
  /// @return yieldTokensAmount The amount of Yield-bearing Tokens added to the escrow for the Token
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

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    yieldTokensAmount = _depositIntoWalletManager(contractAddress, tokenId, walletManagerId, assetToken, assetAmount, feeAmount);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onEnergize(_msgSender(), referrer, contractAddress, tokenId, walletManagerId, assetToken, assetAmount);
    }
  }


  /***********************************|
  |        Discharge Particles        |
  |__________________________________*/

  /// @notice Allows the owner or operator of the Token to collect or transfer the interest generated
  ///         from the token without removing the underlying Asset that is held within the token.
  /// @param receiver             The Address to Receive the Discharged Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Discharge
  /// @param tokenId              The ID of the Token to Discharge
  /// @param walletManagerId      The Wallet Manager of the Assets to Discharge from the Token
  /// @param assetToken           The Address of the Asset Token being discharged
  /// @return creatorAmount Amount of Asset Token discharged to the Creator
  /// @return receiverAmount Amount of Asset Token discharged to the Receiver
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

  /// @notice Allows the owner or operator of the Token to collect or transfer a specific amount of the interest
  ///         generated from the token without removing the underlying Asset that is held within the token.
  /// @param receiver             The Address to Receive the Discharged Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Discharge
  /// @param tokenId              The ID of the Token to Discharge
  /// @param walletManagerId  The Wallet Manager of the Assets to Discharge from the Token
  /// @param assetToken           The Address of the Asset Token being discharged
  /// @param assetAmount          The specific amount of Asset Token to Discharge from the Token
  /// @return creatorAmount Amount of Asset Token discharged to the Creator
  /// @return receiverAmount Amount of Asset Token discharged to the Receiver
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

  /// @notice Allows the Creator of the Token to collect or transfer a their portion of the interest (if any)
  ///         generated from the token without removing the underlying Asset that is held within the token.
  /// @param receiver             The Address to Receive the Discharged Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Discharge
  /// @param tokenId              The ID of the Token to Discharge
  /// @param walletManagerId  The Wallet Manager of the Assets to Discharge from the Token
  /// @param assetToken           The Address of the Asset Token being discharged
  /// @param assetAmount          The specific amount of Asset Token to Discharge from the Particle
  /// @return receiverAmount      Amount of Asset Token discharged to the Receiver
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
  /// @param receiver             The Address to Receive the Released Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Release
  /// @param tokenId              The ID of the Token to Release
  /// @param walletManagerId  The Wallet Manager of the Assets to Release from the Token
  /// @param assetToken           The Address of the Asset Token being released
  /// @return creatorAmount Amount of Asset Token released to the Creator
  /// @return receiverAmount Amount of Asset Token released to the Receiver (includes principalAmount)
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


  /// @notice Releases a partial amount of Asset + Interest held within the Particle by LP of the Assets
  /// @param receiver             The Address to Receive the Released Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Release
  /// @param tokenId              The ID of the Token to Release
  /// @param walletManagerId      The Wallet Manager of the Assets to Release from the Token
  /// @param assetToken           The Address of the Asset Token being released
  /// @param assetAmount          The specific amount of Asset Token to Release from the Particle
  /// @return creatorAmount Amount of Asset Token released to the Creator
  /// @return receiverAmount Amount of Asset Token released to the Receiver (includes principalAmount)
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
  /// @param contractAddress      The Address to the Contract of the Token to Energize
  /// @param tokenId              The ID of the Token to Energize
  /// @param basketManagerId      The Basket to Deposit the NFT into
  /// @param nftTokenAddress      The Address of the NFT Token being deposited
  /// @param nftTokenId           The ID of the NFT Token being deposited
  /// @param nftTokenAmount       The amount of Tokens to Deposit (ERC1155-specific)
  function covalentBond(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    external
    virtual
    override
    basketEnabled(basketManagerId)
    nonReentrant
    returns (bool success)
  {
    _validateNftDeposit(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId, nftTokenAmount);

    // Transfer ERC721 Token from Caller to Contract (reverts on fail)
    _collectNftToken(_msgSender(), nftTokenAddress, nftTokenId, nftTokenAmount);

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    success = _depositIntoBasketManager(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId, nftTokenAmount);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onCovalentBond(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId, nftTokenAmount);
    }
  }

  /// @notice Release NFT Assets from the Particle
  /// @param receiver             The Address to Receive the Released Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Energize
  /// @param tokenId              The ID of the Token to Energize
  /// @param basketManagerId      The Basket to Deposit the NFT into
  /// @param nftTokenAddress      The Address of the NFT Token being deposited
  /// @param nftTokenId           The ID of the NFT Token being deposited
  /// @param nftTokenAmount       The amount of Tokens to Withdraw (ERC1155-specific)
  function breakCovalentBond(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    external
    virtual
    override
    basketEnabled(basketManagerId)
    nonReentrant
    returns (bool success)
  {
    _validateBreakBond(contractAddress, tokenId);

    IBasketManager basketMgr = _chargedManagers.getBasketManager(basketManagerId);
    if (keccak256(abi.encodePacked(basketManagerId)) != keccak256(abi.encodePacked("generic"))) {
      basketMgr.prepareTransferAmount(nftTokenAmount);
    }

    // Release Particle to Receiver
    success = basketMgr.removeFromBasket(
      receiver,
      contractAddress,
      tokenId,
      nftTokenAddress,
      nftTokenId
    );

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onCovalentBreak(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId, nftTokenAmount);
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

  /// @dev Setup the Base Deposit Fee for the Protocol
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
    _chargedManagers.validateDeposit(_msgSender(), contractAddress, tokenId, walletManagerId, assetToken, assetAmount);
  }

  /// @dev Validates an NFT Deposit according to the rules set by the Token Contract
  /// @param contractAddress      The Address to the Contract of the External NFT to check
  /// @param tokenId              The Token ID of the External NFT to check
  /// @param basketManagerId      The Basket to Deposit the NFT into
  /// @param nftTokenAddress      The Address of the NFT Token being deposited
  /// @param nftTokenId           The ID of the NFT Token being deposited
  /// @param nftTokenAmount       The amount of Tokens to Deposit (ERC1155-specific)
  function _validateNftDeposit(
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
    _chargedManagers.validateNftDeposit(_msgSender(), contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId, nftTokenAmount);
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

  /// @dev Deposit Asset Tokens into an NFT via the Wallet Manager
  /// @param contractAddress      The Address to the Contract of the NFT
  /// @param tokenId              The Token ID of the NFT
  /// @param walletManagerId  The Wallet Manager of the Assets to Deposit
  /// @param assetToken           The Address of the Asset Token to Deposit
  /// @param assetAmount          The specific amount of Asset Token to Deposit
  /// @param feeAmount            The Amount of Protocol Fees charged
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

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    address wallet = lpWalletMgr.getWalletAddressById(contractAddress, tokenId, creator, annuityPct);
    IERC20Upgradeable(assetToken).transfer(wallet, assetAmount);

    emit ProtocolFeesCollected(assetToken, assetAmount, feeAmount);

    return lpWalletMgr.energize(contractAddress, tokenId, assetToken, assetAmount);
  }

  /// @dev Deposit NFT Tokens into the Basket Manager
  /// @param contractAddress      The Address to the Contract of the NFT
  /// @param tokenId              The Token ID of the NFT
  /// @param basketManagerId      The Wallet Manager of the Assets to Deposit
  /// @param nftTokenAddress      The Address of the Asset Token to Deposit
  /// @param nftTokenId           The specific amount of Asset Token to Deposit
  /// @param nftTokenAmount       The amount of Tokens to Deposit (ERC1155-specific)
  function _depositIntoBasketManager(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    internal
    virtual
    returns (bool)
  {
    // Deposit NFT Token directly into Smart Wallet (reverts on fail) and Update BasketManager
    IBasketManager basketMgr = _chargedManagers.getBasketManager(basketManagerId);
    address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);

    if (keccak256(abi.encodePacked(basketManagerId)) != keccak256(abi.encodePacked("generic"))) {
      basketMgr.prepareTransferAmount(nftTokenAmount);
    }

    if (_isERC1155(nftTokenAddress)) {
      if (nftTokenAmount == 0) { nftTokenAmount = 1; }
      IERC1155Upgradeable(nftTokenAddress).safeTransferFrom(address(this), wallet, nftTokenId, nftTokenAmount, "");
    } else {
      IERC721Upgradeable(nftTokenAddress).transferFrom(address(this), wallet, nftTokenId);
    }
    return basketMgr.addToBasket(contractAddress, tokenId, nftTokenAddress, nftTokenId);
  }

  /**
    * @dev Calculates the amount of Fees to be paid for a specific deposit amount
    *   Fees are calculated in Interest-Token as they are the type collected for Fees
    * @param assetAmount The Amount of Assets to calculate Fees on
    * @return protocolFee The amount of fees reserved for the protocol
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

  /// @dev Collects the Required ERC20 Token(s) from the users wallet
  ///   Be sure to Approve this Contract to transfer your Token(s)
  /// @param from         The owner address to collect the tokens from
  /// @param tokenAddress  The addres of the token to transfer
  /// @param tokenAmount  The amount of tokens to collect
  function _collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) internal virtual returns (uint256 protocolFee) {
    protocolFee = _getFeesForDeposit(tokenAmount);
    IERC20Upgradeable(tokenAddress).safeTransferFrom(from, address(this), tokenAmount.add(protocolFee));
  }

  /// @dev Collects the Required ERC721 Token(s) from the users wallet
  ///   Be sure to Approve this Contract to transfer your Token(s)
  /// @param from             The owner address to collect the tokens from
  /// @param nftTokenAddress  The address of the NFT token to transfer
  /// @param nftTokenId       The ID of the NFT token to transfer
  /// @param nftTokenAmount   The amount of Tokens to Transfer (ERC1155-specific)
  function _collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId, uint256 nftTokenAmount) internal virtual {
    if (_isERC1155(nftTokenAddress)) {
      IERC1155Upgradeable(nftTokenAddress).safeTransferFrom(from, address(this), nftTokenId, nftTokenAmount, "");
    } else {
      IERC721Upgradeable(nftTokenAddress).safeTransferFrom(from, address(this), nftTokenId);
    }
  }

  /// @dev Checks if an NFT token contract supports the ERC1155 standard interface
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
