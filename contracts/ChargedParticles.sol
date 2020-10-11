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

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/Address.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/IERC721Ownable.sol";
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

  IUniverse internal universe;

  string[] internal liquidityProviders;
  mapping (string => IWalletManager) internal lpWalletManager;


  //     TokenUUID => Operator Approval per Token
  mapping (uint256 => address) internal tokenDischargeApprovals;
  mapping (uint256 => address) internal tokenReleaseApprovals;

  //     TokenUUID => Token Release Operator
  mapping (uint256 => address) internal assetToBeReleasedBy;

  // Optional Limits set by Owner of External Token Contracts;
  //  - Any user can add any ERC721 or ERC1155 token as a Charged Particle without Limits,
  //    unless the Owner of the ERC721 or ERC1155 token contract registers the token here
  //    and sets the Custom Limits for their token(s)

  //      Contract => Has this contract address been Registered with Custom Limits?
  mapping (address => bool) internal customRegisteredContract;

  //      Contract => Does the Release-Action require the Charged Particle Token to be burned first?
  mapping (address => bool) internal customReleaseRequiresBurn;

  //      Contract => Specific Liquidity-Provider that is allowed (otherwise, any Liquidity-Provider is allowed)
  mapping (address => string) internal customLiquidityProvider;

  //      Contract => Deposit Fees to be earned for Contract Owner
  mapping (address => uint256) internal customAssetDepositFee;

  //      Contract => Allowed Limit of Asset Token [min, max]
  mapping (address => uint256) internal customAssetDepositMin;
  mapping (address => uint256) internal customAssetDepositMax;

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

  //      Contract => Asset Token     => Deposit Fees earned for Contract Owner (incudes this contract)
  mapping (address => mapping(address => uint256)) internal depositFeesEarned;


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

  function isLiquidityProviderEnabled(string calldata _liquidityProviderId) external override view returns (bool) {
    return _isLiquidityProviderEnabled(_liquidityProviderId);
  }

  function getLiquidityProvidersCount() external override view returns (uint) {
    return liquidityProviders.length;
  }

  function getLiquidityProviderByIndex(uint _index) external override view returns (string memory) {
    require(_index >= 0 && _index < liquidityProviders.length, "ChargedParticles: INVALID_INDEX");
    return liquidityProviders[_index];
  }

  function getWalletManager(string calldata _liquidityProviderId) external override view returns (address) {
    return address(lpWalletManager[_liquidityProviderId]);
  }

  function getTokenUUID(address _contractAddress, uint256 _tokenId) external override pure returns (uint256) {
    return _getTokenUUID(_contractAddress, _tokenId);
  }

  function getOwnerUUID(string calldata _liquidityProviderId, address _owner) external override pure returns (uint256) {
    return _getOwnerUUID(_liquidityProviderId, _owner);
  }

  function getAssetMinDeposit(address _contractAddress) external override view returns (uint256) {
    return customAssetDepositMin[_contractAddress];
  }

  function getAssetMaxDeposit(address _contractAddress) external override view returns (uint256) {
    return customAssetDepositMax[_contractAddress];
  }

  function getCustomLiquidityProviderId(address _contractAddress) external override view returns (string memory) {
    string memory lpid = customLiquidityProvider[_contractAddress];
    return lpid;
  }

  function getCustomReleaseRequiresBurn(address _contractAddress) external override view returns (bool) {
    return customReleaseRequiresBurn[_contractAddress];
  }

  /**
    * @notice Sets an Operator as Approved to Discharge a specific Token
    *    This allows an operator to release the interest-portion only
    * @param _contractAddress  The Address to the Contract of the Token
    * @param _tokenId          The ID of the Token
    * @param _operator         The Address of the Operator to Approve
    */
  function setDischargeApproval(address _contractAddress, uint256 _tokenId, address _operator) external override {
    IERC721Ownable _tokenInterface = IERC721Ownable(_contractAddress);
    address _tokenOwner = _tokenInterface.ownerOf(_tokenId);
    require(_operator != _tokenOwner, "ChargedParticles: CANNOT_BE_SELF");
    require(_msgSender() == _tokenOwner || _tokenInterface.isApprovedForAll(_tokenOwner, _msgSender()), "ChargedParticles: NOT_OPERATOR");

    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    tokenDischargeApprovals[_tokenUuid] = _operator;
    emit DischargeApproval(_contractAddress, _tokenId, _tokenOwner, _operator);
  }

  /**
    * @notice Sets an Operator as Approved to Release a specific Token
    *    This allows an operator to release the principal + interest
    * @param _contractAddress  The Address to the Contract of the Token
    * @param _tokenId          The ID of the Token
    * @param _operator         The Address of the Operator to Approve
    */
  function setReleaseApproval(address _contractAddress, uint256 _tokenId, address _operator) external override {
    IERC721Ownable _tokenInterface = IERC721Ownable(_contractAddress);
    address _tokenOwner = _tokenInterface.ownerOf(_tokenId);
    require(_operator != _tokenOwner, "ChargedParticles: CANNOT_BE_SELF");
    require(_msgSender() == _tokenOwner || _tokenInterface.isApprovedForAll(_tokenOwner, _msgSender()), "ChargedParticles: NOT_OPERATOR");

    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    tokenReleaseApprovals[_tokenUuid] = _operator;
    emit ReleaseApproval(_contractAddress, _tokenId, _tokenOwner, _operator);
  }

  /**
    * @notice Gets the Approved Discharge-Operator of a specific Token
    * @param _contractAddress  The Address to the Contract of the Token
    * @param _tokenId          The ID of the Token
    * @param _operator         The Address of the Operator to check
    * @return  True if the _operator is Approved
    */
  function isApprovedForDischarge(address _contractAddress, uint256 _tokenId, address _operator) external override view returns (bool) {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    return tokenDischargeApprovals[_tokenUuid] == _operator;
  }

  /**
    * @notice Gets the Approved Release-Operator of a specific Token
    * @param _contractAddress  The Address to the Contract of the Token
    * @param _tokenId          The ID of the Token
    * @param _operator         The Address of the Operator to check
    * @return  True if the _operator is Approved
    */
  function isApprovedForRelease(address _contractAddress, uint256 _tokenId, address _operator) external override view returns (bool) {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    return tokenReleaseApprovals[_tokenUuid] == _operator;
  }

  /**
    * @notice Calculates the amount of Fees to be paid for a specific deposit amount
    * @param _contractAddress The Address to the Contract of the Token
    * @param _assetAmount The Amount of Assets to calculate Fees on
    * @return _depositFee The amount of deposit fees for the protocol
    * @return _customFee The amount of custom fees for the token contract
    */
  function getFeesForDeposit(
    address _contractAddress,
    uint256 _assetAmount
  )
    external
    override
    view
    returns (uint256 _depositFee, uint256 _customFee)
  {
    return _getFeesForDeposit(_contractAddress, _assetAmount);
  }

  /**
    * @notice Calculates the Total Fee to be paid for a specific deposit amount
    * @param _contractAddress      The Address to the Contract of the Token
    * @param _assetAmount  The Amount of Assets to calculate Fees on
    * @return  The total amount of protocol fees plus the amount of custom contract fees
    */
  function getFeeForDeposit(
    address _contractAddress,
    uint256 _assetAmount
  )
    external
    override
    view
    returns (uint256)
  {
    (uint256 _depositFee, uint256 _customFee) = _getFeesForDeposit(_contractAddress, _assetAmount);
    return _depositFee.add(_customFee);
  }

  /**
    * @notice Gets the Amount of Asset Tokens that have been Deposited into the Particle
    *    representing the Mass of the Particle.
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _tokenId          The ID of the Token within the External Contract
    * @param _liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The Amount of underlying Assets held within the Token
    */
  function baseParticleMass(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    returns (uint256)
  {
    return _baseParticleMass(_contractAddress, _tokenId, _liquidityProviderId, _assetToken);
  }

  /**
    * @notice Gets the amount of Interest that the Particle has generated representing
    *    the Charge of the Particle
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _tokenId          The ID of the Token within the External Contract
    * @param _liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The amount of interest the Token has generated (in Asset Token)
    */
  function currentParticleCharge(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    returns (uint256)
  {
    return _currentParticleCharge(_contractAddress, _tokenId, _liquidityProviderId, _assetToken);
  }

  /**
    * @notice Gets the amount of LP Tokens that the Particle has generated representing
    *    the Kinetics of the Particle
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _tokenId          The ID of the Token within the External Contract
    * @param _liquidityProviderId      The Asset-Pair ID to check the Kinetics balance of
    * @return  The amount of LP tokens the Token has generated
    */
  function currentParticleKinetics(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    returns (uint256)
  {
    return _currentParticleKinetics(_contractAddress, _tokenId, _liquidityProviderId, _assetToken);
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
    * @param _account The Account to check if it is the Owner of the specified Contract
    * @param _contractAddress The Address to the External Contract to check
    * @return True if the _account is the Owner of the _contract
    */
  function isContractOwner(address _account, address _contractAddress) external override view returns (bool) {
    return _isContractOwner(_account, _contractAddress);
  }

  /**
    * @notice Registers a external ERC-721 Contract in order to define Custom Rules for Tokens
    * @param _contractAddress  The Address to the External Contract of the Token
    */
  function registerContractType(address _contractAddress) external override {
    // Check Token Interface to ensure compliance
    // IERC165 _tokenInterface = IERC165(_contractAddress);
    // bool _is721 = _tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC721);
    // bool _is1155 = _tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC1155);
    // require(_is721 || _is1155, "ChargedParticles: INVALID_INTERFACE");

    // Check Contract Owner to prevent random people from setting Limits
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");

    // Contract Registered!
    customRegisteredContract[_contractAddress] = true;

    emit RegisterParticleContract(_contractAddress);
  }

  /**
    * @notice Registers the "Release-Burn" Custom Rule on an external ERC-721 Token Contract
    *   When enabled, tokens that are "Charged" will require the Token to be Burned before
    *   the underlying asset is Released.
    * @param _contractAddress       The Address to the External Contract of the Token
    * @param _releaseRequiresBurn   True if the External Contract requires tokens to be Burned before Release
    */
  function registerContractSettingReleaseBurn(address _contractAddress, bool _releaseRequiresBurn) external override {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");
    require(bytes(customLiquidityProvider[_contractAddress]).length > 0, "ChargedParticles: REQUIRES_SINGLE_ASSET_PAIR");

    customReleaseRequiresBurn[_contractAddress] = _releaseRequiresBurn;
  }

  /**
    * @notice Registers the "Asset-Pair" Custom Rule on an external ERC-721 Token Contract
    *   The Asset-Pair Rule defines which Asset-Token & Interest-bearing Token Pair can be used to
    *   "Charge" the Token.  If not set, any enabled Asset-Pair can be used.
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _liquidityProviderId      The Asset-Pair required for Energizing a Token; otherwise Any Asset-Pair is allowed
    */
  function registerContractSettingLiquidityProvider(address _contractAddress, string calldata _liquidityProviderId) external override {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");

    if (bytes(_liquidityProviderId).length > 0) {
        require(_isLiquidityProviderEnabled(_liquidityProviderId), "ChargedParticles: INVALID_LP");
    } else {
        require(customReleaseRequiresBurn[_contractAddress] != true, "ChargedParticles: CANNOT_REQUIRE_RELEASE_BURN");
    }

    customLiquidityProvider[_contractAddress] = _liquidityProviderId;
  }

  /**
    * @notice Registers the "Deposit Fee" Custom Rule on an external ERC-721 Token Contract
    *    When set, every Token of the Custom ERC-721 Contract that is "Energized" pays a Fee to the
    *    Contract Owner denominated in the Interest-bearing Token of the Asset-Pair
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _depositFee       The Deposit Fee as a Percentage represented as 10000 = 100%
    *    A value of "50" would represent a Fee of 0.5% of the Funding Asset ((50 / 10000) * 100)
    *    This allows a fee as low as 0.01%  (value of "1")
    */
  function registerContractSettingDepositFee(address _contractAddress, uint256 _depositFee) external override {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");
    require(_depositFee <= MAX_CUSTOM_DEPOSIT_FEE, "ChargedParticles: AMOUNT_INVALID");

    customAssetDepositFee[_contractAddress] = _depositFee;
  }

  /**
    * @notice Registers the "Minimum Deposit Amount" Custom Rule on an external ERC-721 Token Contract
    *    When set, every Token of the Custom ERC-721 Contract must be "Energized" with at least this
    *    amount of Asset Token.
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _minDeposit       The Minimum Deposit required for a Token
    */
  function registerContractSettingMinDeposit(address _contractAddress, uint256 _minDeposit) external override {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");
    require(_minDeposit == 0 || _minDeposit > MIN_DEPOSIT_FEE, "ChargedParticles: AMOUNT_INVALID");

    customAssetDepositMin[_contractAddress] = _minDeposit;
  }

  /**
    * @notice Registers the "Maximum Deposit Amount" Custom Rule on an external ERC-721 Token Contract
    *    When set, every Token of the Custom ERC-721 Contract must be "Energized" with at most this
    *    amount of Asset Token.
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _maxDeposit       The Maximum Deposit allowed for a Token
    */
  function registerContractSettingMaxDeposit(address _contractAddress, uint256 _maxDeposit) external override {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");

    customAssetDepositMax[_contractAddress] = _maxDeposit;
  }


  /***********************************|
  |           Collect Fees            |
  |__________________________________*/

  function getCollectedFees(
    address _contractAddress,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    returns (uint256 _balance, uint256 _interestAccrued)
  {
    IWalletManager _lpWalletMgr = lpWalletManager[_liquidityProviderId];
    uint256 _ownerUuid = _getOwnerUUID(_liquidityProviderId, _contractAddress);

    _interestAccrued = _lpWalletMgr.getInterest(_ownerUuid, _assetToken);
    uint256 _storedFees = _lpWalletMgr.getBalance(_ownerUuid, _assetToken);
    uint256 unstoredFees = depositFeesEarned[_contractAddress][_assetToken];
    _balance = _storedFees.add(unstoredFees);
  }

  function storeCollectedFees(
    address _contractAddress,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    lpNotPaused(_liquidityProviderId)
    nonReentrant
    returns (uint256 _amountStored)
  {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    IWalletManager _lpWalletMgr = lpWalletManager[_liquidityProviderId];

    uint256 _ownerUuid = _getOwnerUUID(_liquidityProviderId, _contractAddress);

    uint256 unstoredFees = depositFeesEarned[_contractAddress][_assetToken];
    depositFeesEarned[_contractAddress][_assetToken] = 0;

    // Deposit Asset Token into LP (reverts on fail)
    IERC20(_assetToken).approve(address(_lpWalletMgr), unstoredFees);
    _amountStored = _lpWalletMgr.energize(_ownerUuid, _assetToken, unstoredFees);
  }

  /**
    * @notice Allows External Contract Owners to withdraw any Custom Fees earned
    * @param _contractAddress  The Address to the External Contract to withdraw Collected Fees for
    * @param _receiver         The Address of the Receiver of the Collected Fees
    * @param _liquidityProviderId      The Asset-Pair ID to Withdraw Fees for
    */
  function withdrawContractFees(
    address _contractAddress,
    address _receiver,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    nonReentrant
    returns (uint256 _amount)
  {
    require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");
    require(_isContractOwner(_msgSender(), _contractAddress), "ChargedParticles: NOT_OWNER");
    IWalletManager _lpWalletMgr = lpWalletManager[_liquidityProviderId];
    if (address(_lpWalletMgr) == address(0)) {
      return 0;
    }

    uint256 _ownerUuid = _getOwnerUUID(_liquidityProviderId, _contractAddress);

    uint256 unstoredFees = depositFeesEarned[_contractAddress][address(_assetToken)];
    depositFeesEarned[_contractAddress][address(_assetToken)] = 0;

    uint256 _storedFees = _lpWalletMgr.release(_receiver, _ownerUuid, _assetToken);
    _amount = _storedFees.add(unstoredFees);

    require(IERC20(_assetToken).transfer(_receiver, unstoredFees), "ChargedParticles: WITHDRAW_TRANSFER_FAILED");

    emit FeesWithdrawn(_contractAddress, _receiver, _liquidityProviderId, _assetToken, _amount);
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
    * @param _contractAddress The Address to the Contract of the Token to Energize
    * @param _tokenId The ID of the Token to Energize
    * @param _liquidityProviderId The Asset-Pair to Energize the Token with
    * @param _assetAmount The Amount of Asset Token to Energize the Token with
    * @return _interestAmount The amount of Interest-bearing Tokens added to the escrow for the Token
    */
  function energizeParticle(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken,
    uint256 _assetAmount
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    nonReentrant
    returns (uint256 _interestAmount)
  {
    // require(customRegisteredContract[_contractAddress], "ChargedParticles: UNREGISTERED");

    // Get Wallet-Manager for LP
    IWalletManager _lpWalletMgr = lpWalletManager[_liquidityProviderId];

    // Get Token UUID & Balance
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    uint256 _existingBalance = _lpWalletMgr.getPrincipal(_tokenUuid, _assetToken);
    uint256 _newBalance = _assetAmount.add(_existingBalance);

    // Validate Custom Contract Settings
    // Valid LP?
    if (bytes(customLiquidityProvider[_contractAddress]).length > 0) {
        require(keccak256(abi.encodePacked(customLiquidityProvider[_contractAddress])) == keccak256(abi.encodePacked(_liquidityProviderId)), "ChargedParticles: INVALID_LP");
    }

    // Valid Amount?
    if (customAssetDepositMin[_contractAddress] > 0) {
        require(_newBalance >= customAssetDepositMin[_contractAddress], "ChargedParticles: INSUFF_DEPOSIT");
    }

    if (customAssetDepositMax[_contractAddress] > 0) {
        require(_newBalance <= customAssetDepositMax[_contractAddress], "ChargedParticles: INSUFF_DEPOSIT");
    }

    // Transfer Asset Token from Caller to Contract
    _collectAssetToken(_msgSender(), _assetToken, _assetAmount);

    uint256 amountForDeposit = _collectDepositFees(_contractAddress, _assetToken, _assetAmount);

    // Deposit Asset Token into LP (reverts on fail)
    IERC20(_assetToken).approve(address(_lpWalletMgr), amountForDeposit);
    _interestAmount = _lpWalletMgr.energize(_tokenUuid, _assetToken, amountForDeposit);

    if (address(universe) != address(0)) {
      universe.onEnergize(_contractAddress, _tokenId, _liquidityProviderId, _assetToken, _assetAmount);
    }

    emit EnergizedParticle(_contractAddress, _tokenId, _liquidityProviderId, _assetToken, _newBalance);
  }


  /***********************************|
  |        Discharge Particles        |
  |__________________________________*/

  /**
    * @notice Allows the owner or operator of the Token to collect or transfer the interest generated
    *         from the token without removing the underlying Asset that is held within the token.
    * @param _receiver         The Address to Receive the Discharged Asset Tokens
    * @param _contractAddress  The Address to the Contract of the Token to Discharge
    * @param _tokenId          The ID of the Token to Discharge
    * @param _liquidityProviderId      The Asset-Pair to Discharge from the Token
    * @return _amount Amount of Asset Token Received
    */
  function dischargeParticle(
    address _receiver,
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    nonReentrant
    returns (uint256 _amount)
  {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    _amount = lpWalletManager[_liquidityProviderId].discharge(_receiver, _tokenUuid, _assetToken);

    if (address(universe) != address(0)) {
      universe.onDischarge(_contractAddress, _tokenId, _liquidityProviderId, _assetToken, _amount);
    }

    emit DischargedParticle(_contractAddress, _tokenId, _receiver, _liquidityProviderId, _assetToken, _amount);
  }

  /**
    * @notice Allows the owner or operator of the Token to collect or transfer a specific amount the interest
    *         generated from the token without removing the underlying Asset that is held within the token.
    * @param _receiver         The Address to Receive the Discharged Asset Tokens
    * @param _contractAddress  The Address to the Contract of the Token to Discharge
    * @param _tokenId          The ID of the Token to Discharge
    * @param _liquidityProviderId      The Asset-Pair to Discharge from the Token
    * @param _assetAmount      The specific amount of Asset Token to Discharge from the Token
    * @return _amount Amount of Asset Token Received
    */
  function dischargeParticleAmount(
    address _receiver,
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken,
    uint256 _assetAmount
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    nonReentrant
    returns (uint256 _amount)
  {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    _amount = lpWalletManager[_liquidityProviderId].dischargeAmount(_receiver, _tokenUuid, _assetToken, _assetAmount);

    if (address(universe) != address(0)) {
      universe.onDischarge(_contractAddress, _tokenId, _liquidityProviderId, _assetToken, _amount);
    }

    emit DischargedParticle(_contractAddress, _tokenId, _receiver, _liquidityProviderId, _assetToken, _amount);
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
    * @param _receiver         The Address to Receive the Released Asset Tokens
    * @param _contractAddress  The Address to the Contract of the Token to Release
    * @param _tokenId          The ID of the Token to Release
    * @param _liquidityProviderId      The Asset-Pair to Release from the Token
    * @return _amount The Total Amount of Asset Tokens Released including all converted Interest
    */
  function releaseParticle(
    address _receiver,
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    nonReentrant
    returns (uint256 _amount)
  {
    require(_baseParticleMass(_contractAddress, _tokenId, _liquidityProviderId, _assetToken) > 0, "ChargedParticles: INSUFF_MASS");
    IERC721Ownable _tokenInterface = IERC721Ownable(_contractAddress);

    // Validate Token Owner/Operator
    address _tokenOwner = _tokenInterface.ownerOf(_tokenId);
    require((_tokenOwner == _msgSender()) || _tokenInterface.isApprovedForAll(_tokenOwner, _msgSender()), "ChargedParticles: NOT_OPERATOR");

    // Validate Token Burn before Release
    bool requiresBurn;
    if (customRegisteredContract[_contractAddress]) {
        // Does Release Require Token Burn first?
        if (customReleaseRequiresBurn[_contractAddress]) {
            requiresBurn = true;
        }
    }

    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    if (requiresBurn) {
        assetToBeReleasedBy[_tokenUuid] = _msgSender();
        return 0; // Need to call "finalizeRelease" next, in order to prove token-burn
    }

    // TODO: claim and release rewards too?

    // Release Particle to Receiver
    _amount = lpWalletManager[_liquidityProviderId].release(_receiver, _tokenUuid, _assetToken);

    if (address(universe) != address(0)) {
      universe.onRelease(_contractAddress, _tokenId, _liquidityProviderId, _assetToken, _amount);
    }

    emit ReleasedParticle(_contractAddress, _tokenId, _receiver, _liquidityProviderId, _assetToken, _amount);
  }

  /**
    * @notice Finalizes the Release of a Particle when that Particle requires Burn before Release
    * @param _receiver         The Address to Receive the Released Asset Tokens
    * @param _contractAddress  The Address to the Contract of the Token to Release
    * @param _tokenId          The ID of the Token to Release
    * @param _liquidityProviderId      The Asset-Pair to Release from the Token
    * @return _amount The Total Amount of Asset Token Released including all converted Interest
    */
  function finalizeRelease(
    address _receiver,
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    external
    override
    lpEnabled(_liquidityProviderId)
    returns (uint256 _amount)
  {
    IERC721Ownable _tokenInterface = IERC721Ownable(_contractAddress);
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    address releaser = assetToBeReleasedBy[_tokenUuid];

    // Validate Release Operator
    require(releaser == _msgSender(), "ChargedParticles: NOT_RELEASE_OPERATOR");

    // Validate Token Burn
    address _tokenOwner = _tokenInterface.ownerOf(_tokenId);
    require(_tokenOwner == address(0x0), "ChargedParticles: INVALID_BURN");

    // TODO: claim and release rewards too?

    // Release Particle to Receiver
    assetToBeReleasedBy[_tokenUuid] = address(0x0);
    _amount = lpWalletManager[_liquidityProviderId].release(_receiver, _tokenUuid, _assetToken);

    if (address(universe) != address(0)) {
      universe.onRelease(_contractAddress, _tokenId, _liquidityProviderId, _assetToken, _amount);
    }
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the Universal Controller
    */
  function setUniverse(address _universe) external onlyOwner {
    universe = IUniverse(_universe);
  }

  /**
    * @dev Setup the Base Deposit Fee for the Escrow
    */
  function setDepositFee(uint256 _depositFee) external onlyOwner {
    depositFee = _depositFee;
  }

  /**
    * @dev Register Contracts for Asset/Interest Pairs
    */
  function registerLiquidityProvider(string calldata _liquidityProviderId, address _walletManager) external onlyOwner {
    // Validate Escrow
    IWalletManager _newWalletMgr = IWalletManager(_walletManager);
    require(_newWalletMgr.isPaused() != true, "ChargedParticles: INVALID_WALLET_MGR");

    // Register Pair
    liquidityProviders.push(_liquidityProviderId);
    lpWalletManager[_liquidityProviderId] = _newWalletMgr;
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _isLiquidityProviderEnabled(string calldata _liquidityProviderId) internal view returns (bool) {
    return (address(lpWalletManager[_liquidityProviderId]) != address(0x0));
  }

  function _isLiquidityProviderPaused(string calldata _liquidityProviderId) internal view returns (bool) {
    return lpWalletManager[_liquidityProviderId].isPaused();
  }

  function _getTokenUUID(address _contractAddress, uint256 _tokenId) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(_contractAddress, _tokenId)));
  }

  function _getOwnerUUID(string memory _liquidityProviderId, address _owner) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(_liquidityProviderId, _owner)));
  }

  function _collectDepositFees(
    address _contractAddress,
    address _assetToken,
    uint256 _assetAmount
  )
    internal
    returns (uint256)
  {
    (uint256 _depositFee, uint256 _customFee) = _getFeesForDeposit(_contractAddress, _assetAmount);
    depositFeesEarned[address(this)][_assetToken] = _depositFee;
    depositFeesEarned[_contractAddress][_assetToken] = _customFee;

    return _assetAmount.sub(_depositFee.add(_customFee));
  }

  /**
    * @notice Checks if an Account is the Owner of a Contract
    *    When Custom Contracts are registered, only the "owner" or operator of the Contract
    *    is allowed to register them and define custom rules for how their tokens are "Charged".
    *    Otherwise, any token can be "Charged" according to the default rules of Charged Particles.
    * @param _account   The Account to check if it is the Owner of the specified Contract
    * @param _contract  The Address to the External Contract to check
    * @return True if the _account is the Owner of the _contract
    */
  function _isContractOwner(address _account, address _contract) internal view returns (bool) {
    address _contractOwner = IERC721Ownable(_contract).owner();
    return _contractOwner != address(0x0) && _contractOwner == _account;
  }

  /**
    * @dev Calculates the amount of Fees to be paid for a specific deposit amount
    *   Fees are calculated in Interest-Token as they are the type collected for Fees
    * @param _contractAddress      The Address to the Contract of the Token
    * @param _assetAmount  The Amount of Assets to calculate Fees on
    * @return  The amount of base fees and the amount of custom/creator fees
    */
  function _getFeesForDeposit(
    address _contractAddress,
    uint256 _assetAmount
  )
    internal
    view
    returns (uint256, uint256)
  {
    uint256 _depositFee;
    uint256 _customFee;

    if (depositFee > 0) {
        _depositFee = _assetAmount.mul(depositFee).div(DEPOSIT_FEE_MODIFIER);
    }

    uint256 _customFeeSetting = customAssetDepositFee[_contractAddress];
    if (_customFeeSetting > 0) {
        _customFee = _assetAmount.mul(_customFeeSetting).div(DEPOSIT_FEE_MODIFIER);
    }

    return (_depositFee, _customFee);
  }

  /**
    * @dev Collects the Required Asset Token from the users wallet
    * @param _from         The owner address to collect the Assets from
    * @param _assetAmount  The Amount of Asset Tokens to Collect
    */
  function _collectAssetToken(address _from, address _assetToken, uint256 _assetAmount) internal {
    uint256 _userAssetBalance = IERC20(_assetToken).balanceOf(_from);
    require(_assetAmount <= _userAssetBalance, "ChargedParticles: INSUFF_ASSETS");
    // Be sure to Approve this Contract to transfer your Asset Token
    require(IERC20(_assetToken).transferFrom(_from, address(this), _assetAmount), "ChargedParticles: TRANSFER_FAILED");
  }

  /**
    * @dev Gets the Amount of Asset Tokens that have been Deposited into the Particle
    *    representing the Mass of the Particle.
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _tokenId          The ID of the Token within the External Contract
    * @param _liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The Amount of underlying Assets held within the Token
    */
  function _baseParticleMass(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    internal
    returns (uint256)
  {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    return lpWalletManager[_liquidityProviderId].getPrincipal(_tokenUuid, _assetToken);
  }

  /**
    * @dev Gets the amount of Interest that the Particle has generated representing
    *    the Charge of the Particle
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _tokenId          The ID of the Token within the External Contract
    * @param _liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The amount of interest the Token has generated (in Asset Token)
    */
  function _currentParticleCharge(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    internal
    returns (uint256)
  {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    return lpWalletManager[_liquidityProviderId].getInterest(_tokenUuid, _assetToken);
  }

  /**
    * @dev Gets the amount of LP Rewards that the Particle has generated representing
    *    the Kinetics of the Particle
    * @param _contractAddress  The Address to the External Contract of the Token
    * @param _tokenId          The ID of the Token within the External Contract
    * @param _liquidityProviderId      The Asset-Pair ID to check the Asset balance of
    * @return  The amount of LP rewards the Token has generated (in Asset Token)
    */
  function _currentParticleKinetics(
    address _contractAddress,
    uint256 _tokenId,
    string calldata _liquidityProviderId,
    address _assetToken
  )
    internal
    returns (uint256)
  {
    uint256 _tokenUuid = _getTokenUUID(_contractAddress, _tokenId);
    return lpWalletManager[_liquidityProviderId].getRewards(_tokenUuid, _assetToken);
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

  modifier lpEnabled(string calldata _liquidityProviderId) {
    require(_isLiquidityProviderEnabled(_liquidityProviderId), "ChargedParticles: INVALID_LP");
    _;
  }

  modifier lpNotPaused(string calldata _liquidityProviderId) {
    require(!_isLiquidityProviderPaused(_liquidityProviderId), "ChargedParticles: LP_PAUSED");
    _;
  }
}
