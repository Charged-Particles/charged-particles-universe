// SPDX-License-Identifier: MIT

// ChargedState.sol -- Part of the Charged Particles Protocol
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

import "./interfaces/IChargedState.sol";
import "./interfaces/ITokenInfoProxy.sol";

import "./lib/Bitwise.sol";
import "./lib/TokenInfo.sol";
import "./lib/RelayRecipient.sol";
import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Settings Contract
 */
contract ChargedState is
  IChargedState,
  Initializable,
  OwnableUpgradeable,
  RelayRecipient,
  BlackholePrevention
{
  using SafeMathUpgradeable for uint256;
  using TokenInfo for address;
  using Bitwise for uint32;

  // NftState - actionPerms
  uint32 constant internal PERM_RESTRICT_ENERGIZE_FROM_ALL = 1;  // NFTs that have Restrictions on Energize
  uint32 constant internal PERM_ALLOW_DISCHARGE_FROM_ALL   = 2;  // NFTs that allow Discharge by anyone
  uint32 constant internal PERM_ALLOW_RELEASE_FROM_ALL     = 4;  // NFTs that allow Release by anyone
  uint32 constant internal PERM_RESTRICT_BOND_FROM_ALL     = 8;  // NFTs that have Restrictions on Covalent Bonds
  uint32 constant internal PERM_ALLOW_BREAK_BOND_FROM_ALL  = 16; // NFTs that allow Breaking Covalent Bonds by anyone

  IChargedSettings internal _chargedSettings;
  ITokenInfoProxy internal _tokenInfoProxy;

  // NftTimelocks
  /// @dev discharge unlockBlock and lockedBy
  mapping (uint256 => uint256) internal _nftDischargeTimelockUnlockBlock;
  mapping (uint256 => address) internal _nftDischargeTimelockLockedBy;

  /// @dev release unlockBlock and lockedBy
  mapping (uint256 => uint256) internal _nftReleaseTimelockUnlockBlock;
  mapping (uint256 => address) internal _nftReleaseTimelockLockedBy;

  /// @dev release unlockBlock and lockedBy
  mapping (uint256 => uint256) internal _nftBreakBondTimelockUnlockBlock;
  mapping (uint256 => address) internal _nftBreakBondTimelockLockedBy;

  // NftState
  /// @dev maps nft by tokenId to actionPermissions uint32 which is a composite of all possible NftState - actionPerms
  mapping (uint256 => uint32) internal _nftActionPerms;

  /// @dev maps nft by tokenId to its tempLockExpiry
  mapping (uint256 => uint256) internal _nftTempLockExpiry;

  /// @dev maps tokenId to user address to operator address for approving various actions
  mapping (uint256 => mapping(address => address)) internal _nftDischargeApproval;
  mapping (uint256 => mapping(address => address)) internal _nftReleaseApproval;
  mapping (uint256 => mapping(address => address)) internal _nftBreakBondApproval;
  mapping (uint256 => mapping(address => address)) internal _nftTimelockApproval;


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

  function getDischargeTimelockExpiry(address contractAddress, uint256 tokenId) external view virtual override returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftDischargeTimelockUnlockBlock[tokenUuid] > block.number) {
      lockExpiry = _nftDischargeTimelockUnlockBlock[tokenUuid];
    }
    if (_nftTempLockExpiry[tokenUuid] > block.number && _nftTempLockExpiry[tokenUuid] > lockExpiry) {
      lockExpiry = _nftTempLockExpiry[tokenUuid];
    }
  }

  function getReleaseTimelockExpiry(address contractAddress, uint256 tokenId) external view virtual override returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftReleaseTimelockUnlockBlock[tokenUuid] > block.number) {
      lockExpiry = _nftReleaseTimelockUnlockBlock[tokenUuid];
    }
    if (_nftTempLockExpiry[tokenUuid] > block.number && _nftTempLockExpiry[tokenUuid] > lockExpiry) {
      lockExpiry = _nftTempLockExpiry[tokenUuid];
    }
  }

  function getBreakBondTimelockExpiry(address contractAddress, uint256 tokenId) external view virtual override returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftBreakBondTimelockUnlockBlock[tokenUuid] > block.number) {
      lockExpiry = _nftBreakBondTimelockUnlockBlock[tokenUuid];
    }
    if (_nftTempLockExpiry[tokenUuid] > block.number && _nftTempLockExpiry[tokenUuid] > lockExpiry) {
      lockExpiry = _nftTempLockExpiry[tokenUuid];
    }
  }


  /// @notice Checks if an operator is allowed to Discharge a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external virtual override returns (bool) {
    return _isApprovedForDischarge(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Release a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external virtual override returns (bool) {
    return _isApprovedForRelease(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Break Covalent Bonds on a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) external virtual override returns (bool) {
    return _isApprovedForBreakBond(contractAddress, tokenId, operator);
  }

  /// @notice Checks if an operator is allowed to Timelock a specific Token
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param operator         The Address of the operator to check
  /// @return True if the operator is Approved
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external virtual override returns (bool) {
    return _isApprovedForTimelock(contractAddress, tokenId, operator);
  }


  function isEnergizeRestricted(address contractAddress, uint256 tokenId) external virtual override view returns (bool) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return _nftActionPerms[tokenUuid].hasBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
  }


  function isCovalentBondRestricted(address contractAddress, uint256 tokenId) external virtual override view returns (bool) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return _nftActionPerms[tokenUuid].hasBit(PERM_RESTRICT_BOND_FROM_ALL);
  }


  function getDischargeState(address contractAddress, uint256 tokenId, address sender)
    external
    virtual
    override
    returns (
      bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    )
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    allowFromAll = _nftActionPerms[tokenUuid].hasBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    isApproved = _isApprovedForDischarge(contractAddress, tokenId, sender);
    timelock = _nftDischargeTimelockUnlockBlock[tokenUuid];
    tempLockExpiry = _nftTempLockExpiry[tokenUuid];
  }



  function getReleaseState(address contractAddress, uint256 tokenId, address sender)
    external
    virtual
    override
    returns (
      bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    )
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    allowFromAll = _nftActionPerms[tokenUuid].hasBit(PERM_ALLOW_RELEASE_FROM_ALL);
    isApproved = _isApprovedForRelease(contractAddress, tokenId, sender);
    timelock = _nftReleaseTimelockUnlockBlock[tokenUuid];
    tempLockExpiry = _nftTempLockExpiry[tokenUuid];
  }



  function getBreakBondState(address contractAddress, uint256 tokenId, address sender)
    external
    virtual
    override
    returns (
      bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    )
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    allowFromAll = _nftActionPerms[tokenUuid].hasBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    isApproved = _isApprovedForBreakBond(contractAddress, tokenId, sender);
    timelock = _nftBreakBondTimelockUnlockBlock[tokenUuid];
    tempLockExpiry = _nftTempLockExpiry[tokenUuid];
  }




  /***********************************|
  |      Only NFT Owner/Operator      |
  |__________________________________*/

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
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
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
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
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
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
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
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
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
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
    require(operator != tokenOwner, "CP:E-106");
    _setDischargeApproval(contractAddress, tokenId, tokenOwner, operator);
    _setReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
    _setBreakBondApproval(contractAddress, tokenId, tokenOwner, operator);
    _setTimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @dev Updates Restrictions on Energizing an NFT
  function setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForRestrictCharge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowDischarge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowRelease(contractAddress, tokenId, state);
  }

  /// @dev Updates Restrictions on Covalent Bonds on an NFT
  function setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForRestrictBond(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone
  function setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyNFTOwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowBreakBond(contractAddress, tokenId, state);
  }

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
    virtual
  {
    address sender = _msgSender();
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    // Clear Timelock
    if (unlockBlock == 0 && _nftDischargeTimelockLockedBy[tokenUuid] == sender) {
      delete _nftDischargeTimelockUnlockBlock[tokenUuid];
      delete _nftDischargeTimelockLockedBy[tokenUuid];
    }

    // Set Timelock
    else {
      require(_isApprovedForTimelock(contractAddress, tokenId, sender), "CP:E-105");
      require(block.number >= _nftDischargeTimelockUnlockBlock[tokenUuid], "CP:E-302");

      _nftDischargeTimelockUnlockBlock[tokenUuid] = unlockBlock;
      _nftDischargeTimelockLockedBy[tokenUuid] = sender;
    }

    emit TokenDischargeTimelock(contractAddress, tokenId, sender, unlockBlock);
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
    virtual
  {
    address sender = _msgSender();
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    // Clear Timelock
    if (unlockBlock == 0 && _nftReleaseTimelockLockedBy[tokenUuid] == sender) {
      delete _nftReleaseTimelockUnlockBlock[tokenUuid];
      delete _nftReleaseTimelockLockedBy[tokenUuid];
    }

    // Set Timelock
    else {
      require(_isApprovedForTimelock(contractAddress, tokenId, sender), "CP:E-105");
      require(block.number >= _nftReleaseTimelockUnlockBlock[tokenUuid], "CP:E-302");

      _nftReleaseTimelockUnlockBlock[tokenUuid] = unlockBlock;
      _nftReleaseTimelockLockedBy[tokenUuid] = sender;
    }

    emit TokenReleaseTimelock(contractAddress, tokenId, sender, unlockBlock);
  }

  /// @notice Sets a Timelock on the ability to Break the Covalent Bond of a Particle
  /// @param contractAddress  The Address to the NFT to Timelock
  /// @param tokenId          The token ID of the NFT to Timelock
  /// @param unlockBlock      The Ethereum Block-number to Timelock until (~15 seconds per block)
  function setBreakBondTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  )
    external
    override
    virtual
  {
    address sender = _msgSender();
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    // Clear Timelock
    if (unlockBlock == 0 && _nftBreakBondTimelockLockedBy[tokenUuid] == sender) {
      delete _nftBreakBondTimelockUnlockBlock[tokenUuid];
      delete _nftBreakBondTimelockLockedBy[tokenUuid];
    }

    // Set Timelock
    else {
      require(_isApprovedForTimelock(contractAddress, tokenId, sender), "CP:E-105");
      require(block.number >= _nftBreakBondTimelockUnlockBlock[tokenUuid], "CP:E-302");

      _nftBreakBondTimelockUnlockBlock[tokenUuid] = unlockBlock;
      _nftBreakBondTimelockLockedBy[tokenUuid] = sender;
    }

    emit TokenBreakBondTimelock(contractAddress, tokenId, sender, unlockBlock);
  }


  /***********************************|
  |         Only NFT Contract         |
  |__________________________________*/

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
    virtual
  {
    require(msg.sender == contractAddress, "CP:E-112");

    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    uint256 unlockBlock;
    if (isLocked && _nftTempLockExpiry[tokenUuid] == 0) {
      unlockBlock = block.number.add(_chargedSettings.getTempLockExpiryBlocks());
      _nftTempLockExpiry[tokenUuid] = unlockBlock;
    }
    if (!isLocked) {
      _nftTempLockExpiry[tokenUuid] = 0;
    }

    emit TokenTempLock(contractAddress, tokenId, unlockBlock);
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
    else if (controllerIdStr == keccak256(abi.encodePacked("tokeninfo"))) {
      _tokenInfoProxy = ITokenInfoProxy(controller);
    }

    emit ControllerSet(controller, controllerId);
  }

  function migrateToken(
    address contractAddress,
    uint256 tokenId,
    uint256 releaseTimelockExpiry,
    address releaseTimelockLockedBy,
    uint256 tempLockExpiry
  )
    external
    onlyOwner
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (releaseTimelockExpiry > block.number && releaseTimelockLockedBy != address(0)) {
      _nftReleaseTimelockUnlockBlock[tokenUuid] = releaseTimelockExpiry;
      _nftReleaseTimelockLockedBy[tokenUuid] = releaseTimelockLockedBy;
      emit TokenReleaseTimelock(contractAddress, tokenId, releaseTimelockLockedBy, releaseTimelockExpiry);
    }

    if (tempLockExpiry > 0) {
      _nftTempLockExpiry[tokenUuid] = tempLockExpiry;
      emit TokenTempLock(contractAddress, tokenId, tempLockExpiry);
    }
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

  /// @dev See {ChargedParticles-isApprovedForDischarge}.
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) internal virtual returns (bool) {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftDischargeApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForRelease}.
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) internal virtual returns (bool) {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftReleaseApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForBreakBond}.
  function _isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) internal virtual returns (bool) {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftBreakBondApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForTimelock}.
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) internal virtual returns (bool) {
    (bool timelockAny, bool timelockOwn) = _chargedSettings.getTimelockApprovals(operator);
    if (timelockAny || (timelockOwn && contractAddress == operator)) { return true; }

    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return tokenOwner == operator || _nftTimelockApproval[tokenUuid][tokenOwner] == operator;
  }

  /// @notice Sets an Operator as Approved to Discharge a specific Token
  /// This allows an operator to withdraw the interest-portion only
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setDischargeApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
    virtual
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftDischargeApproval[tokenUuid][tokenOwner] = operator;
    emit DischargeApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Release a specific Token
  /// This allows an operator to withdraw the principal + interest
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setReleaseApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
    virtual
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftReleaseApproval[tokenUuid][tokenOwner] = operator;
    emit ReleaseApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Break Covalent Bonds on a specific Token
  /// This allows an operator to withdraw Basket NFTs
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setBreakBondApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
    virtual
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftBreakBondApproval[tokenUuid][tokenOwner] = operator;
    emit BreakBondApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @notice Sets an Operator as Approved to Timelock a specific Token
  /// This allows an operator to timelock the principal or interest
  /// @param contractAddress  The Address to the Contract of the Token
  /// @param tokenId          The ID of the Token
  /// @param tokenOwner       The Owner Address of the Token
  /// @param operator         The Address of the Operator to Approve
  function _setTimelockApproval(
    address contractAddress,
    uint256 tokenId,
    address tokenOwner,
    address operator
  )
    internal
    virtual
  {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    _nftTimelockApproval[tokenUuid][tokenOwner] = operator;
    emit TimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @dev Updates Restrictions on Energizing an NFT
  function _setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].setBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
    } else {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].clearBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
    }
    emit PermsSetForRestrictCharge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function _setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].setBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    } else {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].clearBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    }
    emit PermsSetForAllowDischarge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function _setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].setBit(PERM_ALLOW_RELEASE_FROM_ALL);
    } else {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].clearBit(PERM_ALLOW_RELEASE_FROM_ALL);
    }
    emit PermsSetForAllowRelease(contractAddress, tokenId, state);
  }

  /// @dev Updates Restrictions on Covalent Bonds on an NFT
  function _setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].setBit(PERM_RESTRICT_BOND_FROM_ALL);
    } else {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].clearBit(PERM_RESTRICT_BOND_FROM_ALL);
    }
    emit PermsSetForRestrictBond(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone
  function _setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].setBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    } else {
      _nftActionPerms[tokenUuid] = _nftActionPerms[tokenUuid].clearBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    }
    emit PermsSetForAllowBreakBond(contractAddress, tokenId, state);
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

  modifier onlyNFTOwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(_tokenInfoProxy.isNFTOwnerOrOperator(contractAddress, tokenId, sender), "CP:E-105");
    _;
  }
}
