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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/IChargedState.sol";

import "./lib/Bitwise.sol";
import "./lib/TokenInfo.sol";
import "./lib/RelayRecipient.sol";
import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Settings Contract
 */
contract ChargedState is
  IChargedState,
  Ownable,
  RelayRecipient,
  BlackholePrevention
{
  using SafeMath for uint256;
  using TokenInfo for address;
  using Bitwise for uint32;


  // NftState - actionPerms
  uint32 constant internal PERM_RESTRICT_ENERGIZE_FROM_ALL = 1;  // NFTs that have Restrictions on Energize
  uint32 constant internal PERM_ALLOW_DISCHARGE_FROM_ALL   = 2;  // NFTs that allow Discharge by anyone
  uint32 constant internal PERM_ALLOW_RELEASE_FROM_ALL     = 4;  // NFTs that allow Release by anyone
  uint32 constant internal PERM_RESTRICT_BOND_FROM_ALL     = 8;  // NFTs that have Restrictions on Covalent Bonds
  uint32 constant internal PERM_ALLOW_BREAK_BOND_FROM_ALL  = 16; // NFTs that allow Breaking Covalent Bonds by anyone

  struct NftTimelock {
    uint256 unlockBlock;
    address lockedBy;
  }

  struct NftState {
    uint32 actionPerms;

    NftTimelock dischargeTimelock;
    NftTimelock releaseTimelock;
    NftTimelock breakBondTimelock;
    uint256 tempLockExpiry;

    mapping (address => address) dischargeApproval;
    mapping (address => address) releaseApproval;
    mapping (address => address) breakBondApproval;
    mapping (address => address) timelockApproval;
  }

  IChargedSettings internal _chargedSettings;

  // State of individual NFTs (by Token UUID)
  mapping (uint256 => NftState) internal _nftState;


  /***********************************|
  |               Public              |
  |__________________________________*/

  function getDischargeTimelockExpiry(address contractAddress, uint256 tokenId) external view virtual override returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftState[tokenUuid].dischargeTimelock.unlockBlock > block.number) {
      lockExpiry = _nftState[tokenUuid].dischargeTimelock.unlockBlock;
    }
    if (_nftState[tokenUuid].tempLockExpiry > block.number && _nftState[tokenUuid].tempLockExpiry > lockExpiry) {
      lockExpiry = _nftState[tokenUuid].tempLockExpiry;
    }
  }

  function getReleaseTimelockExpiry(address contractAddress, uint256 tokenId) external view virtual override returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftState[tokenUuid].releaseTimelock.unlockBlock > block.number) {
      lockExpiry = _nftState[tokenUuid].releaseTimelock.unlockBlock;
    }
    if (_nftState[tokenUuid].tempLockExpiry > block.number && _nftState[tokenUuid].tempLockExpiry > lockExpiry) {
      lockExpiry = _nftState[tokenUuid].tempLockExpiry;
    }
  }

  function getBreakBondTimelockExpiry(address contractAddress, uint256 tokenId) external view virtual override returns (uint256 lockExpiry) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);

    if (_nftState[tokenUuid].breakBondTimelock.unlockBlock > block.number) {
      lockExpiry = _nftState[tokenUuid].breakBondTimelock.unlockBlock;
    }
    if (_nftState[tokenUuid].tempLockExpiry > block.number && _nftState[tokenUuid].tempLockExpiry > lockExpiry) {
      lockExpiry = _nftState[tokenUuid].tempLockExpiry;
    }
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


  function isEnergizeRestricted(address contractAddress, uint256 tokenId) external virtual override view returns (bool) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return _nftState[tokenUuid].actionPerms.hasBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
  }


  function isCovalentBondRestricted(address contractAddress, uint256 tokenId) external virtual override view returns (bool) {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return _nftState[tokenUuid].actionPerms.hasBit(PERM_RESTRICT_BOND_FROM_ALL);
  }


  function getDischargeState(address contractAddress, uint256 tokenId, address sender)
    external
    view
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
    allowFromAll = _nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    isApproved = _isApprovedForDischarge(contractAddress, tokenId, sender);
    timelock = _nftState[tokenUuid].dischargeTimelock.unlockBlock;
    tempLockExpiry = _nftState[tokenUuid].tempLockExpiry;
  }



  function getReleaseState(address contractAddress, uint256 tokenId, address sender)
    external
    view
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
    allowFromAll = _nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_RELEASE_FROM_ALL);
    isApproved = _isApprovedForRelease(contractAddress, tokenId, sender);
    timelock = _nftState[tokenUuid].releaseTimelock.unlockBlock;
    tempLockExpiry = _nftState[tokenUuid].tempLockExpiry;
  }



  function getBreakBondState(address contractAddress, uint256 tokenId, address sender)
    external
    view
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
    allowFromAll = _nftState[tokenUuid].actionPerms.hasBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    isApproved = _isApprovedForBreakBond(contractAddress, tokenId, sender);
    timelock = _nftState[tokenUuid].breakBondTimelock.unlockBlock;
    tempLockExpiry = _nftState[tokenUuid].tempLockExpiry;
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
    virtual
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
    virtual
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
    virtual
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
    virtual
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
    virtual
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForRestrictCharge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowDischarge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForAllowRelease(contractAddress, tokenId, state);
  }

  /// @dev Updates Restrictions on Covalent Bonds on an NFT
  function setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
  {
    _setPermsForRestrictBond(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone
  function setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)
    external
    virtual
    override
    onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender())
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
    if (unlockBlock == 0 && _nftState[tokenUuid].dischargeTimelock.lockedBy == sender) {
      delete _nftState[tokenUuid].dischargeTimelock.unlockBlock;
      delete _nftState[tokenUuid].dischargeTimelock.lockedBy;
    }

    // Set Timelock
    else {
      require(_isApprovedForTimelock(contractAddress, tokenId, sender), "CP:E-105");
      require(block.number >= _nftState[tokenUuid].dischargeTimelock.unlockBlock, "CP:E-302");

      _nftState[tokenUuid].dischargeTimelock.unlockBlock = unlockBlock;
      _nftState[tokenUuid].dischargeTimelock.lockedBy = sender;
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
    if (unlockBlock == 0 && _nftState[tokenUuid].releaseTimelock.lockedBy == sender) {
      delete _nftState[tokenUuid].releaseTimelock.unlockBlock;
      delete _nftState[tokenUuid].releaseTimelock.lockedBy;
    }

    // Set Timelock
    else {
      require(_isApprovedForTimelock(contractAddress, tokenId, sender), "CP:E-105");
      require(block.number >= _nftState[tokenUuid].releaseTimelock.unlockBlock, "CP:E-302");

      _nftState[tokenUuid].releaseTimelock.unlockBlock = unlockBlock;
      _nftState[tokenUuid].releaseTimelock.lockedBy = sender;
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
    if (unlockBlock == 0 && _nftState[tokenUuid].breakBondTimelock.lockedBy == sender) {
      delete _nftState[tokenUuid].breakBondTimelock.unlockBlock;
      delete _nftState[tokenUuid].breakBondTimelock.lockedBy;
    }

    // Set Timelock
    else {
      require(_isApprovedForTimelock(contractAddress, tokenId, sender), "CP:E-105");
      require(block.number >= _nftState[tokenUuid].breakBondTimelock.unlockBlock, "CP:E-302");

      _nftState[tokenUuid].breakBondTimelock.unlockBlock = unlockBlock;
      _nftState[tokenUuid].breakBondTimelock.lockedBy = sender;
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
    if (isLocked && _nftState[tokenUuid].tempLockExpiry == 0) {
      unlockBlock = block.number.add(_chargedSettings.getTempLockExpiryBlocks());
      _nftState[tokenUuid].tempLockExpiry = unlockBlock;
    }
    if (!isLocked) {
      _nftState[tokenUuid].tempLockExpiry = 0;
    }

    emit TokenTempLock(contractAddress, tokenId, unlockBlock);
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /// @dev Setup the Charged-Settings Controller
  function setChargedSettings(address settingsController) external virtual onlyOwner {
    _chargedSettings = IChargedSettings(settingsController);
    emit ChargedSettingsSet(settingsController);
  }

  function setTrustedForwarder(address _trustedForwarder) external onlyOwner {
    trustedForwarder = _trustedForwarder;
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


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /// @dev See {ChargedParticles-isApprovedForDischarge}.
  function _isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].dischargeApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForRelease}.
  function _isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].releaseApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForBreakBond}.
  function _isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return contractAddress == operator || tokenOwner == operator || _nftState[tokenUuid].breakBondApproval[tokenOwner] == operator;
  }

  /// @dev See {ChargedParticles-isApprovedForTimelock}.
  function _isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) internal view virtual returns (bool) {
    (bool timelockAny, bool timelockOwn) = _chargedSettings.getTimelockApprovals(operator);
    if (timelockAny || (timelockOwn && contractAddress == operator)) { return true; }

    address tokenOwner = contractAddress.getTokenOwner(tokenId);
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    return tokenOwner == operator || _nftState[tokenUuid].timelockApproval[tokenOwner] == operator;
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
    _nftState[tokenUuid].dischargeApproval[tokenOwner] = operator;
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
    _nftState[tokenUuid].releaseApproval[tokenOwner] = operator;
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
    _nftState[tokenUuid].breakBondApproval[tokenOwner] = operator;
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
    _nftState[tokenUuid].timelockApproval[tokenOwner] = operator;
    emit TimelockApproval(contractAddress, tokenId, tokenOwner, operator);
  }

  /// @dev Updates Restrictions on Energizing an NFT
  function _setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_RESTRICT_ENERGIZE_FROM_ALL);
    }
    emit PermsSetForRestrictCharge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function _setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_ALLOW_DISCHARGE_FROM_ALL);
    }
    emit PermsSetForAllowDischarge(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Discharging an NFT by Anyone
  function _setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_ALLOW_RELEASE_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_ALLOW_RELEASE_FROM_ALL);
    }
    emit PermsSetForAllowRelease(contractAddress, tokenId, state);
  }

  /// @dev Updates Restrictions on Covalent Bonds on an NFT
  function _setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_RESTRICT_BOND_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_RESTRICT_BOND_FROM_ALL);
    }
    emit PermsSetForRestrictBond(contractAddress, tokenId, state);
  }

  /// @dev Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone
  function _setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state) internal virtual {
    uint256 tokenUuid = contractAddress.getTokenUUID(tokenId);
    if (state) {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.setBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
    } else {
      _nftState[tokenUuid].actionPerms = _nftState[tokenUuid].actionPerms.clearBit(PERM_ALLOW_BREAK_BOND_FROM_ALL);
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
    override(BaseRelayRecipient, Context)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  /// @dev See {BaseRelayRecipient-_msgData}.
  function _msgData()
    internal
    view
    virtual
    override(BaseRelayRecipient, Context)
    returns (bytes memory)
  {
    return BaseRelayRecipient._msgData();
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  modifier onlyErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) {
    require(contractAddress.isErc721OwnerOrOperator(tokenId, sender), "CP:E-105");
    _;
  }
}
