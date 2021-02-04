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

import "./lib/ChargedParticlesBase.sol";
import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
contract ChargedParticles is ChargedParticlesBase, BlackholePrevention {
  using SafeMathUpgradeable for uint256;


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

  function getTokenLockExpiry(address contractAddress, uint256 tokenId) external virtual override view returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftState[tokenUuid].dischargeTimelock > block.number) {
      lockExpiry = _nftState[tokenUuid].dischargeTimelock;
    }

    if (_nftState[tokenUuid].releaseTimelock > block.number) {
      lockExpiry = _nftState[tokenUuid].releaseTimelock;
    }

    if (_nftState[tokenUuid].tempLockExpiry > block.number) {
      lockExpiry = _nftState[tokenUuid].tempLockExpiry;
    }
  }

  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external virtual override view returns (bool) {
    return contractAddress.isTokenCreator(tokenId, account);
  }

  function getCreatorAnnuities(address contractAddress, uint256 tokenId) external virtual override view returns (address creator, uint256 annuityPct) {
    return _getCreatorAnnuity(contractAddress, tokenId);
  }

  function getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) external virtual override view returns (address) {
    return _getCreatorAnnuitiesRedirect(contractAddress, tokenId);
  }

  function isWalletManagerEnabled(string calldata walletManagerId) external virtual override view returns (bool) {
    return _isWalletManagerEnabled(walletManagerId);
  }

  function getWalletManager(string calldata walletManagerId) external virtual override view returns (address) {
    return address(_ftWalletManager[walletManagerId]);
  }

  function isNftBasketEnabled(string calldata basketId) external virtual override view returns (bool) {
    return _isNftBasketEnabled(basketId);
  }

  function getBasketManager(string calldata basketId) external virtual override view returns (address) {
    return address(_nftBasketManager[basketId]);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external virtual override returns (bytes4) {
    return IERC721ReceiverUpgradeable(0).onERC721Received.selector;
  }

  /// @notice Checks if an operator is allowed to Discharge a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForDischarge(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Release a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForRelease(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Break Covalent Bonds on a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForBreakBond(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Timelock a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external virtual override view returns (bool) {
    return _isApprovedForTimelock(contractAddress, tokenId, operator);
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
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    require(operator != tokenOwner, "CP:E-106");
    _setDischargeApproval(contractAddress, tokenId, tokenOwner, operator);
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
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    require(operator != tokenOwner, "CP:E-106");
    _setReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Break Covalent Bonds on a specific Token
  /// This allows an operator to withdraw Basket NFTs
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the Operator to Approve
  function setBreakBondApproval(
    address contractAddress,
    uint256 tokenId,
    address operator
  )
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    require(operator != tokenOwner, "CP:E-106");
    _setBreakBondApproval(contractAddress, tokenId, tokenOwner, operator);
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
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    require(operator != tokenOwner, "CP:E-106");
    _setTimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Discharge/Release/Timelock a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the Operator to Approve
  function setApprovalForAll(
    address contractAddress,
    uint256 tokenId,
    address operator
  )
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    require(operator != tokenOwner, "CP:E-106");
    _setDischargeApproval(contractAddress, tokenId, tokenOwner, operator);
    _setReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
    _setBreakBondApproval(contractAddress, tokenId, tokenOwner, operator);
    _setTimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @dev Updates Restrictions on Energizing an NFT
  function setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForRestrictCharge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowDischarge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowRelease(contractAddress, tokenId, state);
  }

  /// @dev Updates Restrictions on Covalent Bonds on an NFT
  function setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForRestrictBond(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone
  function setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)
    external
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowBreakBond(contractAddress, tokenId, state);
  }


  /***********************************|
  |        Timelock Particles         |
  |__________________________________*/

  /// @notice Sets a Timelock on the ability to Discharge the Interest of a Particle
  /// @param contractAddress  The Address to the NFT to Timelock
  /// @param tokenId          The token ID of the NFT to Timelock
  /// @param unlockBlock      The Ethereum Block-number to Timelock until (~15 seconds per block)
  function setDischargeTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  )
    external
    override
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    require(_isApprovedForTimelock(contractAddress, tokenId, _msgSender()), "CP:E-105");
    require(block.number >= _nftState[tokenUuid].dischargeTimelock, "CP:E-302");

    _nftState[tokenUuid].dischargeTimelock = unlockBlock;

    emit TokenDischargeTimelock(contractAddress, tokenId, _msgSender(), unlockBlock);
  }

  /// @notice Sets a Timelock on the ability to Release the Assets of a Particle
  /// @param contractAddress  The Address to the NFT to Timelock
  /// @param tokenId          The token ID of the NFT to Timelock
  /// @param unlockBlock      The Ethereum Block-number to Timelock until (~15 seconds per block)
  function setReleaseTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  )
    external
    override
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    require(_isApprovedForTimelock(contractAddress, tokenId, _msgSender()), "CP:E-105");
    require(block.number >= _nftState[tokenUuid].releaseTimelock, "CP:E-302");

    _nftState[tokenUuid].releaseTimelock = unlockBlock;

    emit TokenReleaseTimelock(contractAddress, tokenId, _msgSender(), unlockBlock);
  }

  /// @notice Sets a Temporary-Lock on the ability to Release/Discharge the Assets of a Particle
  /// @param contractAddress  The Address to the NFT to Timelock
  /// @param tokenId          The token ID of the NFT to Timelock
  /// @param isLocked         The locked state; contracts are expected to disable this lock before expiry
  function setTemporaryLock(
    address contractAddress,
    uint256 tokenId,
    bool isLocked
  )
    external
    override
  {
    require(msg.sender == contractAddress, "CP:E-112");

    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    uint256 unlockBlock;
    if (isLocked && _nftState[tokenUuid].tempLockExpiry == 0) {
      unlockBlock = _tempLockExpiryBlocks.add(block.number);
      _nftState[tokenUuid].tempLockExpiry = unlockBlock;
    }
    if (!isLocked) {
      _nftState[tokenUuid].tempLockExpiry = 0;
    }

    emit TokenTempLock(contractAddress, tokenId, unlockBlock);
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
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 yieldTokensAmount)
  {
    require(_nftSettings[contractAddress].actionPerms.hasBit(PERM_CHARGE_NFT), "CP:E-417");

    _validateDeposit(contractAddress, tokenId, walletManagerId, assetToken, assetAmount);

    // Transfer ERC20 Token from Caller to Contract (reverts on fail)
    _collectAssetToken(_msgSender(), assetToken, assetAmount);

    // Deposit Asset Token directly into Smart Wallet (reverts on fail) and Update WalletManager
    yieldTokensAmount = _depositIntoWalletManager(contractAddress, tokenId, walletManagerId, assetToken, assetAmount);

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
  /// @param walletManagerId  The LP of the Assets to Discharge from the Token
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
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (!_nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_DISCHARGE_FROM_ALL)) {
      require(_isApprovedForDischarge(contractAddress, tokenId, _msgSender()), "CP:E-105");
    }

    // Validate Timelock
    if (_nftState[tokenUuid].dischargeTimelock > 0) {
      require(block.number >= _nftState[tokenUuid].dischargeTimelock, "CP:E-302");
    }
    if (_nftState[tokenUuid].tempLockExpiry > 0) {
      require(block.number >= _nftState[tokenUuid].tempLockExpiry, "CP:E-303");
    }

    address creatorRedirect = _creatorSettings[tokenUuid].annuityRedirect;
    (creatorAmount, receiverAmount) = _ftWalletManager[walletManagerId].discharge(receiver, contractAddress, tokenId, assetToken, creatorRedirect);

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
  /// @param walletManagerId  The LP of the Assets to Discharge from the Token
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
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (!_nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_DISCHARGE_FROM_ALL)) {
      require(_isApprovedForDischarge(contractAddress, tokenId, _msgSender()), "CP:E-105");
    }

    // Validate Timelock
    if (_nftState[tokenUuid].dischargeTimelock > 0) {
      require(block.number >= _nftState[tokenUuid].dischargeTimelock, "CP:E-302");
    }
    if (_nftState[tokenUuid].tempLockExpiry > 0) {
      require(block.number >= _nftState[tokenUuid].tempLockExpiry, "CP:E-303");
    }

    address creatorRedirect = _creatorSettings[tokenUuid].annuityRedirect;
    (creatorAmount, receiverAmount) = _ftWalletManager[walletManagerId].dischargeAmount(
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
  /// @param walletManagerId  The LP of the Assets to Discharge from the Token
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
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 receiverAmount)
  {
    address sender = _msgSender();
    require(contractAddress.isTokenCreator(tokenId, sender), "CP:E-104");

    receiverAmount = _ftWalletManager[walletManagerId].dischargeAmountForCreator(
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
  /// @param walletManagerId  The LP of the Assets to Release from the Token
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
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (!_nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_RELEASE_FROM_ALL)) {
      require(_isApprovedForRelease(contractAddress, tokenId, _msgSender()), "CP:E-105");
    }

    // Validate Timelock
    if (_nftState[tokenUuid].releaseTimelock > 0) {
      require(block.number >= _nftState[tokenUuid].releaseTimelock, "CP:E-302");
    }
    if (_nftState[tokenUuid].tempLockExpiry > 0) {
      require(block.number >= _nftState[tokenUuid].tempLockExpiry, "CP:E-303");
    }

    // Release Particle to Receiver
    uint256 principalAmount;
    address creatorRedirect = _creatorSettings[tokenUuid].annuityRedirect;
    (principalAmount, creatorAmount, receiverAmount) = _ftWalletManager[walletManagerId].release(
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
  /// @param walletManagerId  The LP of the Assets to Release from the Token
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
    override
    managerEnabled(walletManagerId)
    nonReentrant
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (!_nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_RELEASE_FROM_ALL)) {
      require(_isApprovedForRelease(contractAddress, tokenId, _msgSender()), "CP:E-105");
    }

    // Validate Timelock
    if (_nftState[tokenUuid].releaseTimelock > 0) {
      require(block.number >= _nftState[tokenUuid].releaseTimelock, "CP:E-302");
    }
    if (_nftState[tokenUuid].tempLockExpiry > 0) {
      require(block.number >= _nftState[tokenUuid].tempLockExpiry, "CP:E-303");
    }

    // Release Particle to Receiver
    uint256 principalAmount;
    address creatorRedirect = _creatorSettings[tokenUuid].annuityRedirect;
    (principalAmount, creatorAmount, receiverAmount) = _ftWalletManager[walletManagerId].releaseAmount(
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
    override
    basketEnabled(basketManagerId)
    nonReentrant
    returns (bool success)
  {
    require(_nftSettings[contractAddress].actionPerms.hasBit(PERM_BASKET_NFT), "CP:E-417");

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
    override
    basketEnabled(basketManagerId)
    nonReentrant
    returns (bool success)
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (!_nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_BREAK_BOND_FROM_ALL)) {
      require(_isApprovedForBreakBond(contractAddress, tokenId, _msgSender()), "CP:E-105");
    }

    // Validate Timelock
    if (_nftState[tokenUuid].releaseTimelock > 0) {
      require(block.number >= _nftState[tokenUuid].releaseTimelock, "CP:E-302");
    }
    if (_nftState[tokenUuid].tempLockExpiry > 0) {
      require(block.number >= _nftState[tokenUuid].tempLockExpiry, "CP:E-303");
    }

    // Release Particle to Receiver
    success = _nftBasketManager[basketManagerId].removeFromBasket(
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
}
