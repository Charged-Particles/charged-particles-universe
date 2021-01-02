// SPDX-License-Identifier: MIT

// ChargedParticles.sol -- Charged Particles
// Copyright (c) 2019, 2020 Rob Secord <robsecord.eth>
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

import "./interfaces/IERC721Chargeable.sol";
import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/IWalletManager.sol";

import "./lib/RelayRecipient.sol";


/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
contract ChargedParticles is IChargedParticles, Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, RelayRecipient, IERC721ReceiverUpgradeable {
  using SafeMathUpgradeable for uint256;

  //
  // Particle Terminology
  //
  //   Particle               - Non-fungible Token
  //   Mass                   - Underlying Asset of a Token (ex; DAI)
  //   Charge                 - Accrued Interest on the Underlying Asset of a Token
  //   Charged Particle       - A Token that has a Mass and a Positive Charge
  //   Neutral Particle       - A Token that has a Mass and No Charge
  //   Energize / Recharge    - Deposit of an Underlying Asset into a Token
  //   Discharge              - Withdraw the Accrued Interest of a Token leaving the Particle with its initial Mass
  //   Release                - Withdraw the Underlying Asset & Accrued Interest of a Token leaving the Particle with No Mass
  //

  uint256 constant internal PERCENTAGE_SCALE = 1e4;       // 10000  (100%)

  // Interface Signatures
  bytes4 constant internal INTERFACE_SIGNATURE_ERC721 = 0x80ac58cd;
  bytes4 constant internal INTERFACE_SIGNATURE_ERC1155 = 0xd9b67a26;

  // Linked Contracts
  IUniverse internal _universe;
  string[] internal _liquidityProviders;
  mapping (string => IWalletManager) internal _lpWalletManager;

  // Whitelisted External Token Contracts that are allowed to "Charge" tokens.
  mapping (address => bool) public whitelisted;

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

  // TokenUUID => NFT Owner => NFT State
  mapping (uint256 => mapping (address => address)) internal _dischargeApproval;
  mapping (uint256 => mapping (address => address)) internal _releaseApproval;
  mapping (uint256 => mapping (address => address)) internal _timelockApproval;
  // TokenUUID => NFT State
  mapping (uint256 => uint256) internal _dischargeTimelock;
  mapping (uint256 => uint256) internal _releaseTimelock;


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

  function isLiquidityProviderEnabled(string calldata liquidityProviderId) external override view returns (bool) {
    return _isLiquidityProviderEnabled(liquidityProviderId);
  }

  function getLiquidityProvidersCount() external override view returns (uint) {
    return _liquidityProviders.length;
  }

  function getLiquidityProviderByIndex(uint index) external override view returns (string memory) {
    require(index >= 0 && index < _liquidityProviders.length, "ChargedParticles: INVALID_INDEX");
    return _liquidityProviders[index];
  }

  function getWalletManager(string calldata liquidityProviderId) external override view returns (address) {
    return address(_lpWalletManager[liquidityProviderId]);
  }

  function getTokenUUID(address contractAddress, uint256 tokenId) external override pure returns (uint256) {
    return _getTokenUUID(contractAddress, tokenId);
  }

  function getOwnerUUID(string calldata liquidityProviderId, address ownerAddress) external override pure returns (uint256) {
    return _getOwnerUUID(liquidityProviderId, ownerAddress);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
    return IERC721ReceiverUpgradeable(0).onERC721Received.selector;
  }

  /// @notice Sets an Operator as Approved to Discharge a specific Token
  /// This allows an operator to withdraw the interest-portion only
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the Operator to Approve
  function setDischargeApproval(
    address contractAddress,
    uint256 tokenId,
    address operator
  )
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    require(operator != tokenOwner, "ChargedParticles: CANNOT_BE_SELF");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _dischargeApproval[tokenUuid][tokenOwner] = operator;
    emit DischargeApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Release a specific Token
  /// This allows an operator to withdraw the principal + interest
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the Operator to Approve
  function setReleaseApproval(
    address contractAddress,
    uint256 tokenId,
    address operator
  )
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    require(operator != tokenOwner, "ChargedParticles: CANNOT_BE_SELF");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _releaseApproval[tokenUuid][tokenOwner] = operator;
    emit ReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Timelock a specific Token
  /// This allows an operator to timelock the principal or interest
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the Operator to Approve
  function setTimelockApproval(
    address contractAddress,
    uint256 tokenId,
    address operator
  )
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    require(operator != tokenOwner, "ChargedParticles: CANNOT_BE_SELF");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    _timelockApproval[tokenUuid][tokenOwner] = operator;
    emit TimelockApproval(contractAddress, tokenId, tokenOwner, operator);
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
  /// @param liquidityProviderId  The Liquidity-Provider ID to check the Asset balance of
  /// @return The Amount of underlying Assets held within the Token
  function baseParticleMass(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    returns (uint256)
  {
    return _baseParticleMass(contractAddress, tokenId, liquidityProviderId, assetToken);
  }

  /// @notice Gets the amount of Interest that the Particle has generated representing
  /// the Charge of the Particle
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param liquidityProviderId  The Liquidity-Provider ID to check the Interest balance of
  /// @return The amount of interest the Token has generated (in Asset Token)
  function currentParticleCharge(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    returns (uint256)
  {
    return _currentParticleCharge(contractAddress, tokenId, liquidityProviderId, assetToken);
  }

  /// @notice Gets the amount of LP Tokens that the Particle has generated representing
  /// the Kinetics of the Particle
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param liquidityProviderId  The Liquidity-Provider ID to check the Kinetics balance of
  /// @return The amount of LP tokens that have been generated
  function currentParticleKinetics(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    returns (uint256)
  {
    return _currentParticleKinetics(contractAddress, tokenId, liquidityProviderId, assetToken);
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

  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external override view returns (bool) {
    return _isTokenCreator(contractAddress, tokenId, account, _msgSender());
  }

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

  function setCreatorConfigs(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent
  )
    external
    override
    onlyTokenCreator(contractAddress, tokenId, creator, _msgSender())
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    require(annuityPercent <= PERCENTAGE_SCALE, "ChargedParticles: INVALID_PCT");

    // Update Configs for External Token Creator
    _creatorAnnuityPercent[tokenUuid] = annuityPercent;

    emit TokenCreatorConfigsSet(
      contractAddress,
      tokenId,
      creator,
      annuityPercent
    );
  }

  /***********************************|
  |        Timelock Particles         |
  |__________________________________*/

  function setDischargeTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  )
    external
    override
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    require(_isApprovedForTimelock(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");
    require(block.number >= _dischargeTimelock[tokenUuid], "ChargedParticles: TOKEN_TIMELOCKED");

    _dischargeTimelock[tokenUuid] = unlockBlock;

    emit TokenDischargeTimelock(contractAddress, tokenId, _msgSender(), unlockBlock);
  }

  function setReleaseTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  )
    external
    override
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    require(_isApprovedForTimelock(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");
    require(block.number >= _releaseTimelock[tokenUuid], "ChargedParticles: TOKEN_TIMELOCKED");

    _releaseTimelock[tokenUuid] = unlockBlock;

    emit TokenReleaseTimelock(contractAddress, tokenId, _msgSender(), unlockBlock);
  }


  /***********************************|
  |        Energize Particles         |
  |__________________________________*/

  /// @notice Fund Particle with Asset Token
  ///    Must be called by the Owner providing the Asset
  ///    Owner must Approve THIS contract as Operator of Asset
  ///
  /// NOTE: DO NOT Energize an ERC20 Token, as anyone who holds any amount
  ///       of the same ERC20 token could discharge or release the funds.
  ///       All holders of the ERC20 token would essentially be owners of the Charged Particle.
  ///
  /// @param contractAddress The Address to the Contract of the Token to Energize
  /// @param tokenId The ID of the Token to Energize
  /// @param liquidityProviderId The Asset-Pair to Energize the Token with
  /// @param assetToken The Address of the Asset Token being used
  /// @param assetAmount The Amount of Asset Token to Energize the Token with
  /// @return yieldTokensAmount The amount of Yield-bearing Tokens added to the escrow for the Token
  function energizeParticle(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    lpEnabled(liquidityProviderId)
    nonReentrant
    returns (uint256 yieldTokensAmount)
  {
    require(whitelisted[contractAddress], "ChargedParticles: Invalid Token Contract");

    _validateDeposit(contractAddress, tokenId, liquidityProviderId, assetToken, assetAmount);

    // Transfer ERC20 Token from Caller to Contract (reverts on fail)
    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    yieldTokensAmount = _depositIntoWalletManager(contractAddress, tokenId, liquidityProviderId, assetToken, assetAmount);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onEnergize(contractAddress, tokenId, liquidityProviderId, assetToken, assetAmount);
    }
  }

  /***********************************|
  |        Discharge Particles        |
  |__________________________________*/

  /// @notice Allows the owner or operator of the Token to collect or transfer the interest generated
  ///         from the token without removing the underlying Asset that is held within the token.
  /// @param receiver         The Address to Receive the Discharged Asset Tokens
  /// @param contractAddress  The Address to the Contract of the Token to Discharge
  /// @param tokenId          The ID of the Token to Discharge
  /// @param liquidityProviderId      The Asset-Pair to Discharge from the Token
  /// @param assetToken The Address of the Asset Token being used
  /// @return creatorAmount Amount of Asset Token discharged to the Creator
  /// @return receiverAmount Amount of Asset Token discharged to the Receiver
  function dischargeParticle(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    require(_isApprovedForDischarge(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Timelock
    if (_dischargeTimelock[tokenUuid] > 0) {
      require(block.number >= _dischargeTimelock[tokenUuid], "ChargedParticles: TOKEN_TIMELOCKED");
    }

    (creatorAmount, receiverAmount) = _lpWalletManager[liquidityProviderId].discharge(receiver, contractAddress, tokenId, assetToken);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onDischarge(contractAddress, tokenId, liquidityProviderId, assetToken, creatorAmount, receiverAmount);
    }
  }

  /// @notice Allows the owner or operator of the Token to collect or transfer a specific amount the interest
  ///         generated from the token without removing the underlying Asset that is held within the token.
  /// @param receiver         The Address to Receive the Discharged Asset Tokens
  /// @param contractAddress  The Address to the Contract of the Token to Discharge
  /// @param tokenId          The ID of the Token to Discharge
  /// @param liquidityProviderId      The Asset-Pair to Discharge from the Token
  /// @param assetToken The Address of the Asset Token being used
  /// @param assetAmount      The specific amount of Asset Token to Discharge from the Token
  /// @return creatorAmount Amount of Asset Token discharged to the Creator
  /// @return receiverAmount Amount of Asset Token discharged to the Receiver
  function dischargeParticleAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    lpEnabled(liquidityProviderId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    require(_isApprovedForDischarge(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Timelock
    if (_dischargeTimelock[tokenUuid] > 0) {
      require(block.number >= _dischargeTimelock[tokenUuid], "ChargedParticles: TOKEN_TIMELOCKED");
    }

    (creatorAmount, receiverAmount) = _lpWalletManager[liquidityProviderId].dischargeAmount(receiver, contractAddress, tokenId, assetToken, assetAmount);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onDischarge(contractAddress, tokenId, liquidityProviderId, assetToken, creatorAmount, receiverAmount);
    }
  }


  /***********************************|
  |         Release Particles         |
  |__________________________________*/

  /// @notice Releases the Full amount of Asset + Interest held within the Particle by Asset-Pair
  /// @param receiver         The Address to Receive the Released Asset Tokens
  /// @param contractAddress  The Address to the Contract of the Token to Release
  /// @param tokenId          The ID of the Token to Release
  /// @param liquidityProviderId      The Asset-Pair to Release from the Token
  /// @return creatorAmount Amount of Asset Token released to the Creator
  /// @return receiverAmount Amount of Asset Token released to the Receiver (includes principalAmount)
  function releaseParticle(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    require(_isApprovedForRelease(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");
    // require(_baseParticleMass(contractAddress, tokenId, liquidityProviderId, assetToken) > 0, "ChargedParticles: INSUFF_MASS");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Timelock
    if (_releaseTimelock[tokenUuid] > 0) {
      require(block.number >= _releaseTimelock[tokenUuid], "ChargedParticles: TOKEN_TIMELOCKED");
    }

    // Release Particle to Receiver
    uint256 principalAmount;
    (principalAmount, creatorAmount, receiverAmount) = _lpWalletManager[liquidityProviderId].release(receiver, contractAddress, tokenId, assetToken);

    // Signal to Universe Controller
    if (address(_universe) != address(0)) {
      _universe.onRelease(contractAddress, tokenId, liquidityProviderId, assetToken, principalAmount, creatorAmount, receiverAmount);
    }
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the Universal Controller
  function setUniverse(address universe) external onlyOwner {
    _universe = IUniverse(universe);
    emit UniverseSet(universe);
  }

  /// @dev Register Contracts for Asset/Interest Pairs
  function registerLiquidityProvider(string calldata liquidityProviderId, address walletManager) external onlyOwner {
    // Validate Escrow
    IWalletManager newWalletMgr = IWalletManager(walletManager);
    require(newWalletMgr.isPaused() != true, "ChargedParticles: INVALID_WALLET_MGR");

    // Register Pair
    _liquidityProviders.push(liquidityProviderId);
    _lpWalletManager[liquidityProviderId] = newWalletMgr;
    emit LiquidityProviderRegistered(liquidityProviderId, walletManager);
  }

  function updateWhitelist(address contractAddress, bool state) external onlyOwner {
    whitelisted[contractAddress] = state;
    emit UpdateContractWhitelist(contractAddress, state);
  }


  // TODO: withdrawEth & withdrawErc20 & withdrawErc721


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _isLiquidityProviderEnabled(string calldata liquidityProviderId) internal view returns (bool) {
    return (address(_lpWalletManager[liquidityProviderId]) != address(0x0));
  }

  function _isLiquidityProviderPaused(string calldata liquidityProviderId) internal view returns (bool) {
    return _lpWalletManager[liquidityProviderId].isPaused();
  }

  function _getTokenUUID(address contractAddress, uint256 tokenId) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(contractAddress, tokenId)));
  }

  function _getOwnerUUID(string memory liquidityProviderId, address _owner) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(liquidityProviderId, _owner)));
  }

  function _getTokenOwner(address contractAddress, uint256 tokenId) internal view returns (address) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    return tokenInterface.ownerOf(tokenId);
  }

  /// @notice Checks if an operator is allowed to Discharge a specific Token
  /// @param contractAddress The Address to the Contract of the Token
  /// @param tokenId The ID of the Token
  /// @param operator The Address of the operator to check
  /// @return True if the operator is Approved
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _dischargeApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @notice Checks if an operator is allowed to Release a specific Token
  /// @param contractAddress The Address to the Contract of the Token
  /// @param tokenId The ID of the Token
  /// @param operator The Address of the operator to check
  /// @return True if the operator is Approved
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _releaseApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @notice Checks if an operator is allowed to Timelock a specific Token
  /// @param contractAddress The Address to the Contract of the Token
  /// @param tokenId The ID of the Token
  /// @param operator The Address of the operator to check
  /// @return True if the operator is Approved
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return contractAddress == operator || tokenOwner == operator || _timelockApproval[tokenUuid][tokenOwner] == operator;
  }

  function isValidExternalContract(address contractAddress) internal view returns (bool) {
    // Check Token Interface to ensure compliance
    IERC165Upgradeable tokenInterface = IERC165Upgradeable(contractAddress);
    bool _is721 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC721);
    bool _is1155 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC1155);
    return (_is721 || _is1155);
  }

  function isExternalTokenBurned(address contractAddress, uint256 tokenId) internal view returns (bool) {
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    return (tokenOwner == address(0x0));
  }

  /**
    * @notice Checks if an Account is the Owner of a Contract
    *    When Custom Contracts are registered, only the "owner" or operator of the Contract
    *    is allowed to register them and define custom rules for how their tokens are "Charged".
    *    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
    * @param account   The Account to check if it is the Owner of the specified Contract
    * @param contractAddress  The Address to the External Contract to check
    * @return True if the _account is the Owner of the _contract
    */
  function _isContractOwner(address contractAddress, address account) internal view returns (bool) {
    address contractOwner = IERC721Chargeable(contractAddress).owner();
    return contractOwner != address(0x0) && contractOwner == account;
  }

  function _isTokenCreator(address contractAddress, uint256 tokenId, address creator, address sender) internal view returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenCreator = tokenInterface.creatorOf(tokenId);
    if (sender == contractAddress && creator == tokenCreator) { return true; }
    return (sender == tokenCreator);
  }

  function _isErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) internal view returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    return (sender == tokenOwner || tokenInterface.isApprovedForAll(tokenOwner, sender));
  }

  function _validateDeposit(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    internal
  {
    IWalletManager lpWalletMgr = _lpWalletManager[liquidityProviderId];
    uint256 existingBalance = lpWalletMgr.getPrincipal(contractAddress, tokenId, assetToken);
    uint256 newBalance = assetAmount.add(existingBalance);

    // Valid LP?
    if (bytes(_nftLiquidityProvider[contractAddress]).length > 0) {
        require(keccak256(abi.encodePacked(_nftLiquidityProvider[contractAddress])) == keccak256(abi.encodePacked(liquidityProviderId)), "ChargedParticles: INVALID_LP");
    }

    // Valid Amount for Deposit?
    if (_nftAssetDepositMin[contractAddress] > 0) {
        require(newBalance >= _nftAssetDepositMin[contractAddress], "ChargedParticles: INSUFF_DEPOSIT");
    }
    if (_nftAssetDepositMax[contractAddress] > 0) {
        require(newBalance <= _nftAssetDepositMax[contractAddress], "ChargedParticles: EXCESS_DEPOSIT");
    }
  }

  function _depositIntoWalletManager(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    internal
    returns (uint256)
  {
    // Get Wallet-Manager for LP
    IWalletManager lpWalletMgr = _lpWalletManager[liquidityProviderId];
    (address creator, uint256 annuityPct) = _getCreatorAnnuity(contractAddress, tokenId);

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    address wallet = lpWalletMgr.getWalletAddressById(contractAddress, tokenId, creator, annuityPct);
    IERC20Upgradeable(assetToken).transfer(wallet, assetAmount);
    return lpWalletMgr.energize(contractAddress, tokenId, assetToken, assetAmount);
  }

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
  /// @param from         The owner address to collect the tokens from
  /// @param tokenAddress  The addres of the token to transfer
  /// @param tokenAmount  The amount of tokens to collect
  function _collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) internal {
    uint256 userBalance = IERC20Upgradeable(tokenAddress).balanceOf(from);
    require(tokenAmount <= userBalance, "ChargedParticles: INSUFF_ASSETS");
    // Be sure to Approve this Contract to transfer your Token(s)
    require(IERC20Upgradeable(tokenAddress).transferFrom(from, address(this), tokenAmount), "ChargedParticles: TRANSFER_FAILED");
  }

  /// @dev Gets the Amount of Asset Tokens that have been Deposited into the Particle
  ///    representing the Mass of the Particle.
  /// @param contractAddress  The Address to the External Contract of the Token
  /// @param tokenId          The ID of the Token within the External Contract
  /// @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
  /// @return  The Amount of underlying Assets held within the Token
  function _baseParticleMass(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256)
  {
    return _lpWalletManager[liquidityProviderId].getPrincipal(contractAddress, tokenId, assetToken);
  }

  /// @dev Gets the amount of Interest that the Particle has generated representing
  ///    the Charge of the Particle
  /// @param contractAddress  The Address to the External Contract of the Token
  /// @param tokenId          The ID of the Token within the External Contract
  /// @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
  /// @return  The amount of interest the Token has generated (in Asset Token)
  function _currentParticleCharge(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256)
  {
    (, uint256 ownerInterest) = _lpWalletManager[liquidityProviderId].getInterest(contractAddress, tokenId, assetToken);
    return ownerInterest;
  }

  /// @dev Gets the amount of LP Rewards that the Particle has generated representing
  ///    the Kinetics of the Particle
  /// @param contractAddress  The Address to the External Contract of the Token
  /// @param tokenId          The ID of the Token within the External Contract
  /// @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
  /// @return  The amount of LP rewards the Token has generated (in Asset Token)
  function _currentParticleKinetics(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256)
  {
    return _lpWalletManager[liquidityProviderId].getRewards(contractAddress, tokenId, assetToken);
  }

  function _msgSender()
    internal
    view
    virtual
    override(BaseRelayRecipient, ContextUpgradeable)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

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
    require(isValidExternalContract(contractAddress), "ChargedParticles: INVALID_INTERFACE");
    _;
  }

  modifier onlyContractOwner(address contractAddress, address sender) {
    require(_isContractOwner(contractAddress, sender), "ChargedParticles: NOT_OWNER");
    _;
  }

  modifier onlyContractOwnerOrAdmin(address contractAddress, address sender) {
    require(sender == owner() || _isContractOwner(contractAddress, sender), "ChargedParticles: NOT_OWNER_OR_ADMIN");
    _;
  }

  modifier onlyTokenCreator(address contractAddress, uint256 tokenId, address creator, address sender) {
    require(_isTokenCreator(contractAddress, tokenId, creator, sender), "ChargedParticles: NOT_TOKEN_CREATOR");
    _;
  }

  modifier onlyErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(_isErc721OwnerOrOperator(contractAddress, tokenId, sender), "ChargedParticles: NOT_TOKEN_OPERATOR");
    _;
  }

  modifier lpEnabled(string calldata liquidityProviderId) {
    require(_isLiquidityProviderEnabled(liquidityProviderId), "ChargedParticles: INVALID_LP");
    _;
  }

  modifier lpNotPaused(string calldata liquidityProviderId) {
    require(!_isLiquidityProviderPaused(liquidityProviderId), "ChargedParticles: LP_PAUSED");
    _;
  }
}
