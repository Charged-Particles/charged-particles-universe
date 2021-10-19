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
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedState.sol";
import "./interfaces/IChargedSettings.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/IWalletManager.sol";
import "./interfaces/IBasketManager.sol";

import "./lib/Bitwise.sol";
import "./lib/TokenInfo.sol";
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
  BlackholePrevention
{
  using SafeMathUpgradeable for uint256;
  using SafeERC20Upgradeable for IERC20Upgradeable;
  using TokenInfo for address;
  using Bitwise for uint32;

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
  //   WBoson                 - Membership Classification
  //                            - The wBoson is a type of elementary particle. It is the quantum of the electromagnetic field including
  //                              electromagnetic radiation such as light and radio waves, and the force carrier for the electromagnetic force.
  //                              WBosons are massless, so they always move at the speed of light in vacuum.
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

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(address _trustedForwarder) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    trustedForwarder = _trustedForwarder;
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

  function onERC721Received(address, address, uint256, bytes calldata) external virtual override returns (bytes4) {
    return IERC721ReceiverUpgradeable(0).onERC721Received.selector;
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
    (creatorAmount, receiverAmount) = _chargedSettings.getWalletManager(walletManagerId).discharge(
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
    (creatorAmount, receiverAmount) = _chargedSettings.getWalletManager(walletManagerId).dischargeAmount(
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
    require(contractAddress.isTokenCreator(tokenId, sender), "CP:E-104");

    receiverAmount = _chargedSettings.getWalletManager(walletManagerId).dischargeAmountForCreator(
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
    (principalAmount, creatorAmount, receiverAmount) = _chargedSettings.getWalletManager(walletManagerId).release(
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
    (principalAmount, creatorAmount, receiverAmount) = _chargedSettings.getWalletManager(walletManagerId).releaseAmount(
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

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    success = _depositIntoBasketManager(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onCovalentBond(contractAddress, tokenId, basketManagerId, nftTokenAddress, nftTokenId);
    }
  }

  /// @notice Release NFT Assets from the Particle
  /// @param receiver             The Address to Receive the Released Asset Tokens
  /// @param contractAddress      The Address to the Contract of the Token to Energize
  /// @param tokenId              The ID of the Token to Energize
  /// @param basketManagerId      The Basket to Deposit the NFT into
  /// @param nftTokenAddress      The Address of the NFT Token being deposited
  /// @param nftTokenId           The ID of the NFT Token being deposited
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
    success = _chargedSettings.getBasketManager(basketManagerId).removeFromBasket(
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

  /// @dev Setup the Charged-Settings Controller
  function setChargedSettings(address settingsController) external virtual onlyOwner {
    _chargedSettings = IChargedSettings(settingsController);
    emit ChargedSettingsSet(settingsController);
  }

  /// @dev Setup the Charged-State Controller
  function setChargedState(address stateController) external virtual onlyOwner {
    _chargedState = IChargedState(stateController);
    emit ChargedStateSet(stateController);
  }

  /// @dev Setup the Universal Controller
  function setUniverse(address universe) external virtual onlyOwner {
    _universe = IUniverse(universe);
    emit UniverseSet(universe);
  }

  function setLeptonToken(address token) external virtual onlyOwner {
    _lepton = token;
    emit LeptonTokenSet(token);
  }

  function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
    trustedForwarder = _trustedForwarder;
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
    if (_chargedState.isEnergizeRestricted(contractAddress, tokenId)) {
      require(contractAddress.isErc721OwnerOrOperator(tokenId, _msgSender()), "CP:E-105");
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

    require(!invalidAsset, "Invalid Asset");

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
    IWalletManager lpWalletMgr = _chargedSettings.getWalletManager(walletManagerId);
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
  {
    if (_chargedState.isCovalentBondRestricted(contractAddress, tokenId)) {
      require(contractAddress.isErc721OwnerOrOperator(tokenId, _msgSender()), "CP:E-105");
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

    if (maxNfts > 0 || _lepton == nftTokenAddress) {
      IBasketManager basketMgr = _chargedSettings.getBasketManager(basketManagerId);
      uint256 tokenCountByType = basketMgr.getTokenCountByType(contractAddress, tokenId, nftTokenAddress, nftTokenId);

      if (maxNfts > 0) {
        require(maxNfts > tokenCountByType, "CP:E-427");
      }

      if (_lepton == nftTokenAddress) {
        require(tokenCountByType == 0, "CP:E-430");
      }
    }
  }

  function _validateDischarge(address contractAddress, uint256 tokenId) internal view virtual {
    ( bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    ) = _chargedState.getDischargeState(contractAddress, tokenId, _msgSender());
    _validateState(allowFromAll, isApproved, timelock, tempLockExpiry);
  }

  function _validateRelease(address contractAddress, uint256 tokenId) internal view virtual {
    ( bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    ) = _chargedState.getReleaseState(contractAddress, tokenId, _msgSender());
    _validateState(allowFromAll, isApproved, timelock, tempLockExpiry);
  }

  function _validateBreakBond(address contractAddress, uint256 tokenId) internal view virtual {
    ( bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    ) = _chargedState.getBreakBondState(contractAddress, tokenId, _msgSender());
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
    IWalletManager lpWalletMgr = _chargedSettings.getWalletManager(walletManagerId);

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
    IBasketManager basketMgr = _chargedSettings.getBasketManager(basketManagerId);
    address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);
    IERC721Upgradeable(nftTokenAddress).safeTransferFrom(address(this), wallet, nftTokenId);
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
    return _chargedSettings.getWalletManager(walletManagerId).getPrincipal(contractAddress, tokenId, assetToken);
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
    (, uint256 ownerInterest) = _chargedSettings.getWalletManager(walletManagerId).getInterest(contractAddress, tokenId, assetToken);
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
    return _chargedSettings.getWalletManager(walletManagerId).getRewards(contractAddress, tokenId, assetToken);
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
    return _chargedSettings.getBasketManager(basketManagerId).getTokenTotalCount(contractAddress, tokenId);
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
    require(_chargedSettings.isWalletManagerEnabled(walletManagerId), "CP:E-419");
    _;
  }

  modifier basketEnabled(string calldata basketManagerId) {
    require(_chargedSettings.isNftBasketEnabled(basketManagerId), "CP:E-419");
    _;
  }
}
