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
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/Address.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/introspection/IERC165.sol";

import "./interfaces/IERC721.sol";
import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/IWalletManager.sol";

import "./lib/RelayRecipient.sol";
import "./lib/Common.sol";


/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
contract ChargedParticles is IChargedParticles, Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe, RelayRecipient, Common {
  using SafeMath for uint256;

  //
  // Particle Terminology
  //
  //   Particle               - Non-fungible Token
  //   Plasma                 - Fungible Token
  //   Mass                   - Underlying Asset of a Token (ex; DAI)
  //   Charge                 - Accrued Interest on the Underlying Asset of a Token
  //   Charged Particle       - A Token that has a Mass and a Positive Charge
  //   Neutral Particle       - A Token that has a Mass and No Charge
  //   Energize / Recharge    - Deposit of an Underlying Asset into a Token
  //   Discharge              - Withdraw the Accrued Interest of a Token leaving the Particle with its initial Mass
  //   Release                - Withdraw the Underlying Asset & Accrued Interest of a Token leaving the Particle with No Mass
  //                              - Released Tokens are either Burned/Destroyed or left in their Original State as an NFT
  //

  IUniverse internal _universe;
  string[] internal _liquidityProviders;
  mapping (string => IWalletManager) internal _lpWalletManager;

  // Blacklisted External Token Contracts that are not allowed to "Charge" tokens.
  //  - This is usually due to a contract being upgradeable or mutable in some way by a single EOA.
  mapping (address => bool) public blacklisted;

  // To "Energize" Particles of any Type, there is a Deposit Fee, which is
  //  a small percentage of the Interest-bearing Asset of the token immediately after deposit.
  //  A value of "50" here would represent a Fee of 0.5% of the Funding Asset ((50 / 10000) * 100)
  //    This allows a fee as low as 0.01%  (value of "1")
  //  This means that a brand new particle would have 99.5% of its "Mass" and 0% of its "Charge".
  //    As the "Charge" increases over time, the particle will fill up the "Mass" to 100% and then
  //    the "Charge" will start building up.  Essentially, only a small portion of the interest
  //    is used to pay the deposit fee.  The particle will be in "cool-down" mode until the "Mass"
  //    of the particle returns to 100% (this should be a relatively short period of time).
  //    When the particle reaches 100% "Mass" or more it can be "Released" (or burned) to reclaim the underlying
  //    asset + interest.  Since the "Mass" will be back to 100%, "Releasing" will yield at least 100%
  //    of the underlying asset back to the owner (plus any interest accrued, the "charge").
  uint256 public depositFee;

  // Contract => Asset Token => Deposit Fees earned for Contract Owner (incudes this contract)
  mapping (address => mapping(address => uint256)) public depositFeesEarned;

  // Contract Address => Config for NFT Contracts set by Contract Onwer
  mapping (address => NftContractConfig) public nftContractConfig;

  // TokenUUID => Config for individual NFTs set by NFT Creator
  mapping (uint256 => NftCreatorConfig) public nftCreatorConfig;

  // TokenUUID => NFT State
  mapping (uint256 => NftState) public nftState;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize(address _trustedForwarder) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    trustedForwarder = _trustedForwarder;
  }


  /***********************************|
  |         Particle Physics          |
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

  // function getWalletManager(string calldata liquidityProviderId) external override view returns (address) {
  //   return address(_lpWalletManager[liquidityProviderId]);
  // }

  function getTokenUUID(address contractAddress, uint256 tokenId) external override pure returns (uint256) {
    return _getTokenUUID(contractAddress, tokenId);
  }

  function getOwnerUUID(string calldata liquidityProviderId, address ownerAddress) external override pure returns (uint256) {
    return _getOwnerUUID(liquidityProviderId, ownerAddress);
  }

  // function getAssetMinDeposit(address contractAddress) external override view returns (uint256) {
  //   return nftContractConfig[contractAddress].assetDepositMin;
  // }

  // function getAssetMaxDeposit(address contractAddress) external override view returns (uint256) {
  //   return nftContractConfig[contractAddress].assetDepositMax;
  // }

  // function getCustomLiquidityProviderId(address contractAddress) external override view returns (string memory) {
  //   string memory lpid = nftContractConfig[contractAddress].liquidityProvider;
  //   return lpid;
  // }

  // function getAnnuityPercent(uint256 tokenUuid) external override view returns (uint256) {
  //   return nftCreatorConfig[tokenUuid].annuityPercent;
  // }

  // function getReleaseTimelock(uint256 tokenUuid) external override view returns (uint256) {
  //   return nftCreatorConfig[tokenUuid].releaseTimelock;
  // }

  // function getBurnToRelease(uint256 tokenUuid) external override view returns (bool) {
  //   return nftCreatorConfig[tokenUuid].burnToRelease;
  // }

  /**
    * @notice Sets an Operator as Approved to Discharge a specific Token
    *    This allows an operator to release the interest-portion only
    * @param contractAddress  The Address to the Contract of the Token
    * @param tokenId          The ID of the Token
    * @param operator         The Address of the Operator to Approve
    */
  function setDischargeApproval(
    address contractAddress, 
    uint256 tokenId, 
    address operator
  ) 
    external 
    override 
    onlyTokenOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    require(operator != tokenOwner, "ChargedParticles: CANNOT_BE_SELF");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    nftState[tokenUuid].dischargeApproval = operator;
    emit DischargeApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /**
    * @notice Sets an Operator as Approved to Release a specific Token
    *    This allows an operator to release the principal + interest
    * @param contractAddress  The Address to the Contract of the Token
    * @param tokenId          The ID of the Token
    * @param operator         The Address of the Operator to Approve
    */
  function setReleaseApproval(
    address contractAddress, 
    uint256 tokenId, 
    address operator
  ) 
    external 
    override 
    onlyTokenOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    require(operator != tokenOwner, "ChargedParticles: CANNOT_BE_SELF");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    nftState[tokenUuid].releaseApproval = operator;
    emit ReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /**
    * @notice Sets an Operator as Approved to Timelock a specific Token
    *    This allows an operator to timelock the principal + interest
    * @param contractAddress  The Address to the Contract of the Token
    * @param tokenId          The ID of the Token
    * @param operator         The Address of the Operator to Approve
    */
  function setTimelockApproval(
    address contractAddress, 
    uint256 tokenId, 
    address operator
  ) 
    external 
    override 
    onlyTokenOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    require(operator != tokenOwner, "ChargedParticles: CANNOT_BE_SELF");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    nftState[tokenUuid].timelockApproval = operator;
    emit TimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /**
    * @notice Checks if an account is allowed to Discharge a specific Token
    * @param contractAddress The Address to the Contract of the Token
    * @param tokenId The ID of the Token
    * @param operator The Address of the account to check
    * @return True if the account is Approved
    */
  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external override view returns (bool) {
    return _isApprovedForDischarge(contractAddress, tokenId, operator);
  }

  /**
    * @notice Checks if an account is allowed to Release a specific Token
    * @param contractAddress The Address to the Contract of the Token
    * @param tokenId The ID of the Token
    * @param operator The Address of the account to check
    * @return True if the account is Approved
    */
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external override view returns (bool) {
    return _isApprovedForRelease(contractAddress, tokenId, operator);
  }

  /**
    * @notice Checks if an account is allowed to Timelock a specific Token
    * @param contractAddress The Address to the Contract of the Token
    * @param tokenId The ID of the Token
    * @param operator The Address of the account to check
    * @return True if the account is Approved
    */
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external override view returns (bool) {
    return _isApprovedForTimelock(contractAddress, tokenId, operator);
  }

  /**
    * @notice Calculates the amount of Fees to be paid for a specific deposit amount
    * @param contractAddress The Address to the Contract of the Token
    * @param assetAmount The Amount of Assets to calculate Fees on
    * @return protocolFee The amount of deposit fees for the protocol
    * @return externalFee The amount of custom fees for the external token contract
    */
  function getFeesForDeposit(
    address contractAddress,
    uint256 assetAmount
  )
    external
    override
    view
    returns (uint256 protocolFee, uint256 externalFee)
  {
    return _getFeesForDeposit(contractAddress, assetAmount);
  }

  /**
    * @notice Calculates the Total Fee to be paid for a specific deposit amount
    * @param contractAddress      The Address to the Contract of the Token
    * @param assetAmount  The Amount of Assets to calculate Fees on
    * @return  The total amount of protocol fees plus the amount of external token contract fees
    */
  function getFeeForDeposit(
    address contractAddress,
    uint256 assetAmount
  )
    external
    override
    view
    returns (uint256)
  {
    (uint256 protocolFee, uint256 externalFee) = _getFeesForDeposit(contractAddress, assetAmount);
    return protocolFee.add(externalFee);
  }

  /**
    * @notice Gets the Amount of Asset Tokens that have been Deposited into the Particle
    *    representing the Mass of the Particle.
    * @param contractAddress  The Address to the External Contract of the Token
    * @param tokenId          The ID of the Token within the External Contract
    * @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The Amount of underlying Assets held within the Token
    */
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

  /**
    * @notice Gets the amount of Interest that the Particle has generated representing
    *    the Charge of the Particle
    * @param contractAddress  The Address to the External Contract of the Token
    * @param tokenId          The ID of the Token within the External Contract
    * @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The amount of interest the Token has generated (in Asset Token)
    */
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

  /**
    * @notice Gets the amount of LP Tokens that the Particle has generated representing
    *    the Kinetics of the Particle
    * @param contractAddress  The Address to the External Contract of the Token
    * @param tokenId          The ID of the Token within the External Contract
    * @param liquidityProviderId      The Asset-Pair ID to check the Kinetics balance of
    * @return  The amount of LP tokens the Token has generated
    */
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

  /**
    * @notice Checks if an Account is the Owner of a Contract
    *    When Custom Contracts are registered, only the "owner" or operator of the Contract
    *    is allowed to register them and define custom rules for how their tokens are "Charged".
    *    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
    * @param contractAddress The Address to the External Contract to check
    * @param account The Account to check if it is the Owner of the specified Contract
    * @return True if the account is the Owner of the _contract
    */
  function isContractOwner(address contractAddress, address account) external override view returns (bool) {
    return _isContractOwner(contractAddress, account);
  }

  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external override view returns (bool) {
    return _isTokenCreator(contractAddress, tokenId, account);
  }

  function setExternalContractConfigs(
    address contractAddress,
    NftContractConfig calldata config
  ) 
    external 
    override
    onlyValidExternalContract(contractAddress)
    onlyContractOwnerOrAdmin(contractAddress, msg.sender)
  {
    require(config.assetDepositFee <= MAX_CUSTOM_DEPOSIT_FEE, "ChargedParticles: EXCEEDS_MAX_FEE");

    // Update Configs for External Token Contract
    nftContractConfig[contractAddress].liquidityProvider = config.liquidityProvider;
    nftContractConfig[contractAddress].assetDepositFee = config.assetDepositFee;
    nftContractConfig[contractAddress].assetDepositMin = config.assetDepositMin;
    nftContractConfig[contractAddress].assetDepositMax = config.assetDepositMax;

    emit TokenContractConfigsSet(
      contractAddress, 
      config.liquidityProvider, 
      config.assetDepositFee, 
      config.assetDepositMin, 
      config.assetDepositMax
    );
  }

  function setCreatorConfigs(
    address contractAddress,
    uint256 tokenId,
    NftCreatorConfig calldata config
  ) 
    external 
    override
    onlyTokenCreator(contractAddress, tokenId, _msgSender())
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Update Configs for External Token Creator
    nftCreatorConfig[tokenUuid].annuityPercent = config.annuityPercent;
    nftCreatorConfig[tokenUuid].burnToRelease = config.burnToRelease;

    emit TokenCreatorConfigsSet(
      contractAddress, 
      config.annuityPercent, 
      config.burnToRelease
    );
  }


  /***********************************|
  |           Collect Fees            |
  |__________________________________*/

  function getCollectedFees(
    address contractAddress,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    returns (uint256 balance, uint256 interestAccrued)
  {
    IWalletManager lpWalletMgr = _lpWalletManager[liquidityProviderId];
    uint256 ownerUuid = _getOwnerUUID(liquidityProviderId, contractAddress);

    interestAccrued = lpWalletMgr.getInterest(ownerUuid, assetToken);
    uint256 storedFees = lpWalletMgr.getBalance(ownerUuid, assetToken);
    uint256 unstoredFees = depositFeesEarned[contractAddress][assetToken];
    balance = storedFees.add(unstoredFees);
  }

  function storeCollectedFees(
    address contractAddress,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    lpNotPaused(liquidityProviderId)
    nonReentrant
    returns (uint256 amountStored)
  {
    // require(customRegisteredContract[contractAddress], "ChargedParticles: UNREGISTERED");
    IWalletManager lpWalletMgr = _lpWalletManager[liquidityProviderId];

    uint256 ownerUuid = _getOwnerUUID(liquidityProviderId, contractAddress);

    uint256 unstoredFees = depositFeesEarned[contractAddress][assetToken];
    depositFeesEarned[contractAddress][assetToken] = 0;

    // Deposit Asset Token into LP (reverts on fail)
    IERC20(assetToken).approve(address(lpWalletMgr), unstoredFees);
    amountStored = lpWalletMgr.energize(ownerUuid, assetToken, unstoredFees, address(0x0), 0);
  }

  /**
    * @notice Allows External Contract Owners to withdraw any Custom Fees earned
    * @param contractAddress  The Address to the External Contract to withdraw Collected Fees for
    * @param receiver         The Address of the Receiver of the Collected Fees
    * @param liquidityProviderId      The Asset-Pair ID to Withdraw Fees for
    */
  function withdrawContractFees(
    address contractAddress,
    address receiver,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    nonReentrant
    returns (uint256 amount)
  {
    require(_isContractOwner(contractAddress, msg.sender), "ChargedParticles: NOT_OWNER");
    IWalletManager lpWalletMgr = _lpWalletManager[liquidityProviderId];
    if (address(lpWalletMgr) == address(0)) {
      return 0;
    }

    uint256 ownerUuid = _getOwnerUUID(liquidityProviderId, contractAddress);

    uint256 unstoredFees = depositFeesEarned[contractAddress][address(assetToken)];
    depositFeesEarned[contractAddress][address(assetToken)] = 0;

    uint256 storedFees = lpWalletMgr.release(receiver, ownerUuid, assetToken);
    amount = storedFees.add(unstoredFees);

    require(IERC20(assetToken).transfer(receiver, unstoredFees), "ChargedParticles: WITHDRAW_TRANSFER_FAILED");

    emit FeesWithdrawn(contractAddress, receiver, liquidityProviderId, assetToken, amount);
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
    require(block.number >= nftState[tokenUuid].dischargeTimelock, "ChargedParticles: TOKEN_TIMELOCKED");

    nftState[tokenUuid].dischargeTimelock = unlockBlock;

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
    require(block.number >= nftState[tokenUuid].releaseTimelock, "ChargedParticles: TOKEN_TIMELOCKED");

    nftState[tokenUuid].releaseTimelock = unlockBlock;

    emit TokenReleaseTimelock(contractAddress, tokenId, _msgSender(), unlockBlock);
  }


  /***********************************|
  |        Energize Particles         |
  |__________________________________*/

  /**
    * @notice Fund Particle with Asset Token
    *    Must be called by the Owner providing the Asset
    *    Owner must Approve THIS contract as Operator of Asset
    *
    * NOTE: DO NOT Energize an ERC20 Token, as anyone who holds any amount
    *       of the same ERC20 token could discharge or release the funds.
    *       All holders of the ERC20 token would essentially be owners of the Charged Particle.
    *
    * @param contractAddress The Address to the Contract of the Token to Energize
    * @param tokenId The ID of the Token to Energize
    * @param liquidityProviderId The Asset-Pair to Energize the Token with
    * @param assetAmount The Amount of Asset Token to Energize the Token with
    * @return yieldTokensAmount The amount of Yield-bearing Tokens added to the escrow for the Token
    */
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
    // require(customRegisteredContract[contractAddress], "ChargedParticles: UNREGISTERED");
    require(!isBlacklistedExternalContract(contractAddress), "ChargedParticles: Contract Blacklisted");
    _validateDeposit(contractAddress, tokenId, liquidityProviderId, assetToken, assetAmount);

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Get Wallet-Manager for LP
    IWalletManager lpWalletMgr = _lpWalletManager[liquidityProviderId];

    // Transfer Asset Token from Caller to Contract
    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    uint256 amountForDeposit = _collectDepositFees(contractAddress, assetToken, assetAmount);
    (address creator, uint256 annuityPct) = _getCreatorAnnuity(contractAddress, tokenId);

    // Deposit Asset Token into LP (reverts on fail)
    IERC20(assetToken).approve(address(lpWalletMgr), amountForDeposit);
    yieldTokensAmount = lpWalletMgr.energize(tokenUuid, assetToken, amountForDeposit, creator, annuityPct);

    if (address(_universe) != address(0)) {
      _universe.onEnergize(contractAddress, tokenId, liquidityProviderId, assetToken, assetAmount);
    }

    emit EnergizedParticle(contractAddress, tokenId, liquidityProviderId, assetToken, assetAmount);
  }


  /***********************************|
  |        Discharge Particles        |
  |__________________________________*/

  /**
    * @notice Allows the owner or operator of the Token to collect or transfer the interest generated
    *         from the token without removing the underlying Asset that is held within the token.
    * @param receiver         The Address to Receive the Discharged Asset Tokens
    * @param contractAddress  The Address to the Contract of the Token to Discharge
    * @param tokenId          The ID of the Token to Discharge
    * @param liquidityProviderId      The Asset-Pair to Discharge from the Token
    * @return amount Amount of Asset Token Received
    */
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
    returns (uint256 amount)
  {
    require(_isApprovedForDischarge(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Timelock
    if (nftState[tokenUuid].dischargeTimelock > 0) {
      require(block.number >= nftState[tokenUuid].dischargeTimelock, "ChargedParticles: TOKEN_TIMELOCKED");
    }

    amount = _lpWalletManager[liquidityProviderId].discharge(receiver, tokenUuid, assetToken);

    if (address(_universe) != address(0)) {
      _universe.onDischarge(contractAddress, tokenId, liquidityProviderId, assetToken, amount);
    }

    emit DischargedParticle(contractAddress, tokenId, receiver, liquidityProviderId, assetToken, amount);
  }

  /**
    * @notice Allows the owner or operator of the Token to collect or transfer a specific amount the interest
    *         generated from the token without removing the underlying Asset that is held within the token.
    * @param receiver         The Address to Receive the Discharged Asset Tokens
    * @param contractAddress  The Address to the Contract of the Token to Discharge
    * @param tokenId          The ID of the Token to Discharge
    * @param liquidityProviderId      The Asset-Pair to Discharge from the Token
    * @param assetAmount      The specific amount of Asset Token to Discharge from the Token
    * @return amount Amount of Asset Token Received
    */
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
    returns (uint256 amount)
  {
    require(_isApprovedForDischarge(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Timelock
    if (nftState[tokenUuid].dischargeTimelock > 0) {
      require(block.number >= nftState[tokenUuid].dischargeTimelock, "ChargedParticles: TOKEN_TIMELOCKED");
    }

    amount = _lpWalletManager[liquidityProviderId].dischargeAmount(receiver, tokenUuid, assetToken, assetAmount);

    if (address(_universe) != address(0)) {
      _universe.onDischarge(contractAddress, tokenId, liquidityProviderId, assetToken, amount);
    }

    emit DischargedParticle(contractAddress, tokenId, receiver, liquidityProviderId, assetToken, amount);
  }


  /***********************************|
  |         Release Particles         |
  |__________________________________*/

  /**
    * @notice Releases the Full amount of Asset + Interest held within the Particle by Asset-Pair
    *    Tokens that require Burn before Release MUST call "finalizeRelease" after Burning the Token.
    *    In such cases, the Order of Operations should be:
    *       1. call "releaseParticle"
    *       2. Burn Token
    *       3. call "finalizeRelease"
    *    This should be done in a single, atomic transaction
    *
    * @param receiver         The Address to Receive the Released Asset Tokens
    * @param contractAddress  The Address to the Contract of the Token to Release
    * @param tokenId          The ID of the Token to Release
    * @param liquidityProviderId      The Asset-Pair to Release from the Token
    * @return amount The Total Amount of Asset Tokens Released including all converted Interest
    */
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
    returns (uint256 amount)
  {
    require(_isApprovedForRelease(contractAddress, tokenId, _msgSender()), "ChargedParticles: INVALID_OPERATOR");
    require(_baseParticleMass(contractAddress, tokenId, liquidityProviderId, assetToken) > 0, "ChargedParticles: INSUFF_MASS");

    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Timelock
    if (nftState[tokenUuid].releaseTimelock > 0) {
      require(block.number >= nftState[tokenUuid].releaseTimelock, "ChargedParticles: TOKEN_TIMELOCKED");
    }

    // Validate Token Burn before Release
    if (nftCreatorConfig[tokenUuid].burnToRelease) {
        nftState[tokenUuid].assetToBeReleasedBy = _msgSender();
        return 0; // Need to call "finalizeRelease" next, in order to prove token-burn
    }

    // Release Particle to Receiver
    amount = _lpWalletManager[liquidityProviderId].release(receiver, tokenUuid, assetToken);

    if (address(_universe) != address(0)) {
      _universe.onRelease(contractAddress, tokenId, liquidityProviderId, assetToken, amount);
    }

    emit ReleasedParticle(
      contractAddress, 
      tokenId, 
      receiver, 
      liquidityProviderId, 
      assetToken, 
      amount
    );
  }

  /**
    * @notice Finalizes the Release of a Particle when that Particle requires Burn before Release
    * @param receiver         The Address to Receive the Released Asset Tokens
    * @param contractAddress  The Address to the Contract of the Token to Release
    * @param tokenId          The ID of the Token to Release
    * @param liquidityProviderId      The Asset-Pair to Release from the Token
    * @return amount The Total Amount of Asset Token Released including all converted Interest
    */
  function finalizeRelease(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    external
    override
    lpEnabled(liquidityProviderId)
    returns (uint256 amount)
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);

    // Validate Release Operator
    address releaser = nftState[tokenUuid].assetToBeReleasedBy;
    require(releaser == _msgSender(), "ChargedParticles: NOT_RELEASE_OPERATOR");
    nftState[tokenUuid].assetToBeReleasedBy = address(0x0);

    // Validate Token Burn
    require(isExternalTokenBurned(contractAddress, tokenId), "ChargedParticles: INVALID_BURN");

    // Release Particle to Receiver
    amount = _lpWalletManager[liquidityProviderId].release(receiver, tokenUuid, assetToken);

    if (address(_universe) != address(0)) {
      _universe.onRelease(contractAddress, tokenId, liquidityProviderId, assetToken, amount);
    }

    emit ReleasedParticle(
      contractAddress, 
      tokenId, 
      receiver, 
      liquidityProviderId, 
      assetToken, 
      amount
    );
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the Universal Controller
    */
  function setUniverse(address universe) external onlyOwner {
    _universe = IUniverse(universe);
  }

  /**
    * @dev Setup the Base Deposit Fee for the Escrow
    */
  function setDepositFee(uint256 fee) external onlyOwner {
    depositFee = fee;
  }

  /**
    * @dev Register Contracts for Asset/Interest Pairs
    */
  function registerLiquidityProvider(string calldata liquidityProviderId, address walletManager) external onlyOwner {
    // Validate Escrow
    IWalletManager newWalletMgr = IWalletManager(walletManager);
    require(newWalletMgr.isPaused() != true, "ChargedParticles: INVALID_WALLET_MGR");

    // Register Pair
    _liquidityProviders.push(liquidityProviderId);
    _lpWalletManager[liquidityProviderId] = newWalletMgr;
  }

  function updateBlacklist(address contractAddress, bool state) external onlyOwner {
    blacklisted[contractAddress] = state;
    emit UpdateContractBlacklist(contractAddress, state);
  }


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

  /**
    * @notice Checks if an account is allowed to Discharge a specific Token
    * @param contractAddress The Address to the Contract of the Token
    * @param tokenId The ID of the Token
    * @param account The Address of the account to check
    * @return True if the account is Approved
    */
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address account) internal view returns (bool) {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return tokenOwner == account || nftState[tokenUuid].dischargeApproval == account;
  }

  /**
    * @notice Checks if an account is allowed to Release a specific Token
    * @param contractAddress The Address to the Contract of the Token
    * @param tokenId The ID of the Token
    * @param account The Address of the account to check
    * @return True if the account is Approved
    */
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address account) internal view returns (bool) {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return tokenOwner == account || nftState[tokenUuid].releaseApproval == account;
  }

  /**
    * @notice Checks if an account is allowed to Timelock a specific Token
    * @param contractAddress The Address to the Contract of the Token
    * @param tokenId The ID of the Token
    * @param account The Address of the account to check
    * @return True if the account is Approved
    */
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address account) internal view returns (bool) {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return tokenOwner == account || nftState[tokenUuid].timelockApproval == account;
  }

  function _collectDepositFees(
    address contractAddress,
    address assetToken,
    uint256 assetAmount
  )
    internal
    returns (uint256)
  {
    (uint256 protocolFee, uint256 externalFee) = _getFeesForDeposit(contractAddress, assetAmount);
    depositFeesEarned[address(this)][assetToken] = protocolFee;
    depositFeesEarned[contractAddress][assetToken] = externalFee;

    return assetAmount.sub(protocolFee.add(externalFee));
  }

  function isValidExternalContract(address contractAddress) internal view returns (bool) {
    // Check Token Interface to ensure compliance
    IERC165 tokenInterface = IERC165(contractAddress);
    bool _is721 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC721);
    bool _is1155 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC1155);
    return (_is721 || _is1155);
  }

  function isExternalTokenBurned(address contractAddress, uint256 tokenId) internal view returns (bool) {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenOwner = tokenInterface.ownerOf(tokenId);
    return (tokenOwner == address(0x0));
  }

  function isBlacklistedExternalContract(address contractAddress) internal view returns (bool) {
    return blacklisted[contractAddress];
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
    address contractOwner = IERC721(contractAddress).owner();
    return contractOwner != address(0x0) && contractOwner == account;
  }

  function _isTokenCreator(address contractAddress, uint256 tokenId, address sender) internal view returns (bool) {
    IERC721 tokenInterface = IERC721(contractAddress);
    address tokenCreator = tokenInterface.creatorOf(tokenId);
    return (sender == tokenCreator);
  }

  function _isTokenOwnerOrOperator(address contractAddress, uint256 tokenId, address sender) internal view returns (bool) {
    IERC721 tokenInterface = IERC721(contractAddress);
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
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    uint256 existingBalance = lpWalletMgr.getPrincipal(tokenUuid, assetToken);
    uint256 newBalance = assetAmount.add(existingBalance);

    // Valid LP?
    if (bytes(nftContractConfig[contractAddress].liquidityProvider).length > 0) {
        require(keccak256(abi.encodePacked(nftContractConfig[contractAddress].liquidityProvider)) == keccak256(abi.encodePacked(liquidityProviderId)), "ChargedParticles: INVALID_LP");
    }

    // Valid Amount for Deposit?
    if (nftContractConfig[contractAddress].assetDepositMin > 0) {
        require(newBalance >= nftContractConfig[contractAddress].assetDepositMin, "ChargedParticles: INSUFF_DEPOSIT");
    }
    if (nftContractConfig[contractAddress].assetDepositMax > 0) {
        require(newBalance <= nftContractConfig[contractAddress].assetDepositMax, "ChargedParticles: EXCESS_DEPOSIT");
    }
  }

  /**
    * @dev Calculates the amount of Fees to be paid for a specific deposit amount
    *   Fees are calculated in Interest-Token as they are the type collected for Fees
    * @param contractAddress The Address to the Contract of the Token
    * @param assetAmount The Amount of Assets to calculate Fees on
    * @return protocolFee The amount of fees reserved for the protocol
    * @return externalFee The amount fees reserved for the external NFT contract integration
    */
  function _getFeesForDeposit(
    address contractAddress,
    uint256 assetAmount
  )
    internal
    view
    returns (uint256 protocolFee, uint256 externalFee)
  {
    if (depositFee > 0) {
        protocolFee = assetAmount.mul(depositFee).div(PERCENTAGE_SCALE);
    }

    uint256 _externalFeeConfig = nftContractConfig[contractAddress].assetDepositFee;
    if (_externalFeeConfig > 0) {
        externalFee = assetAmount.mul(_externalFeeConfig).div(PERCENTAGE_SCALE);
    }
  }

  function _getCreatorAnnuity(
    address contractAddress,
    uint256 tokenId
  ) 
    internal 
    view 
    returns (address creator, uint256 annuityPct) 
  {
    IERC721 tokenInterface = IERC721(contractAddress);
    creator = tokenInterface.creatorOf(tokenId);
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    annuityPct = nftCreatorConfig[tokenUuid].annuityPercent;
  }

  /**
    * @dev Collects the Required Asset Token from the users wallet
    * @param _from         The owner address to collect the Assets from
    * @param assetAmount  The Amount of Asset Tokens to Collect
    */
  function _collectAssetToken(address _from, address assetToken, uint256 assetAmount) internal {
    uint256 _userAssetBalance = IERC20(assetToken).balanceOf(_from);
    require(assetAmount <= _userAssetBalance, "ChargedParticles: INSUFF_ASSETS");
    // Be sure to Approve this Contract to transfer your Asset Token
    require(IERC20(assetToken).transferFrom(_from, address(this), assetAmount), "ChargedParticles: TRANSFER_FAILED");
  }

  /**
    * @dev Gets the Amount of Asset Tokens that have been Deposited into the Particle
    *    representing the Mass of the Particle.
    * @param contractAddress  The Address to the External Contract of the Token
    * @param tokenId          The ID of the Token within the External Contract
    * @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The Amount of underlying Assets held within the Token
    */
  function _baseParticleMass(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256)
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return _lpWalletManager[liquidityProviderId].getPrincipal(tokenUuid, assetToken);
  }

  /**
    * @dev Gets the amount of Interest that the Particle has generated representing
    *    the Charge of the Particle
    * @param contractAddress  The Address to the External Contract of the Token
    * @param tokenId          The ID of the Token within the External Contract
    * @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The amount of interest the Token has generated (in Asset Token)
    */
  function _currentParticleCharge(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256)
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return _lpWalletManager[liquidityProviderId].getInterest(tokenUuid, assetToken);
  }

  /**
    * @dev Gets the amount of LP Rewards that the Particle has generated representing
    *    the Kinetics of the Particle
    * @param contractAddress  The Address to the External Contract of the Token
    * @param tokenId          The ID of the Token within the External Contract
    * @param liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The amount of LP rewards the Token has generated (in Asset Token)
    */
  function _currentParticleKinetics(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken
  )
    internal
    returns (uint256)
  {
    uint256 tokenUuid = _getTokenUUID(contractAddress, tokenId);
    return _lpWalletManager[liquidityProviderId].getRewards(tokenUuid, assetToken);
  }

  function _msgSender()
    internal
    view
    virtual
    override(BaseRelayRecipient, ContextUpgradeSafe)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  function _msgData()
    internal
    view
    virtual
    override(BaseRelayRecipient, ContextUpgradeSafe)
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

  modifier onlyTokenCreator(address contractAddress, uint256 tokenId, address sender) {
    require(_isTokenCreator(contractAddress, tokenId, sender), "ChargedParticles: NOT_TOKEN_CREATOR");
    _;
  }

  modifier onlyTokenOwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(_isTokenOwnerOrOperator(contractAddress, tokenId, sender), "ChargedParticles: NOT_TOKEN_OPERATOR");
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
