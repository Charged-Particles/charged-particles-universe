## `ChargedState`

Charged Particles Settings Contract



### `onlyNFTOwnerOrOperator(address contractAddress, uint256 tokenId, address sender)`






### `initialize(address initiator)` (public)





### `getDischargeTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `getReleaseTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `getBreakBondTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Discharge a specific token (Particle)




### `isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Release a specific token (Particle)




### `isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to break Covalent Bonds on a specific token (Particle)




### `isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Timelock a specific token (Particle)




### `isEnergizeRestricted(address contractAddress, uint256 tokenId) → bool` (external)





### `isCovalentBondRestricted(address contractAddress, uint256 tokenId) → bool` (external)





### `getDischargeState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `getReleaseState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `getBreakBondState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `setDischargeApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an operator as approved to Discharge a specific token (Particle); This allows an operator to withdraw the interest-portion only




### `setReleaseApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an operator as approved to Release a specific token (Particle); This allows an operator to withdraw the principal + interest




### `setBreakBondApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an operator as approved to break Covalent Bonds on a specific token (Particle); This allows an operator to withdraw NFTs




### `setTimelockApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an operator as approved to Timelock a specific token (Particle); This allows an operator to timelock the principal or interest




### `setApprovalForAll(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an operator as approved to Discharge/Release/Timelock a specific token (Particle)




### `setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)` (external)



Updates restrictions on Energizing an NFT

### `setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)` (external)



Updates allowance on Discharging an NFT by anyone

### `setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)` (external)



Updates allowance on Discharging an NFT by anyone

### `setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)` (external)



Updates restrictions on Covalent Bonds on an NFT

### `setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)` (external)



Updates allowance on Breaking Covalent Bonds on an NFT by anyone

### `setDischargeTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)

Sets a Timelock on the ability to Discharge the interest of a Particle




### `setReleaseTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)

Sets a Timelock on the ability to Release the assets of a Particle




### `setBreakBondTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)

Sets a Timelock on the ability to break the Covalent Bond of a Particle




### `setTemporaryLock(address contractAddress, uint256 tokenId, bool isLocked)` (external)

Sets a temporary Timelock on the ability to Release/Discharge the assets of a Particle




### `setController(address controller, string controllerId)` (external)



Setup the various Charged-Controllers

### `migrateToken(address contractAddress, uint256 tokenId, uint256 releaseTimelockExpiry, address releaseTimelockLockedBy, uint256 tempLockExpiry)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)





### `_isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForDischarge}.

### `_isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForRelease}.

### `_isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForBreakBond}.

### `_isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForTimelock}.

### `_setDischargeApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an operator as approved to Discharge a specific token; This allows an operator to withdraw the interest only




### `_setReleaseApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an Operator as Approved to Release a specific Token; This allows an operator to withdraw the principal + interest




### `_setBreakBondApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an operator as approved to break Covalent Bonds on a specific Token; This allows an operator to withdraw NFTs




### `_setTimelockApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an operator as approved to Timelock a specific Token; This allows an operator to timelock the principal or interest




### `_setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates restrictions on Energizing an NFT

### `_setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates allowance on Discharging an NFT by anyone

### `_setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates allowance on Discharging an NFT by anyone

### `_setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates restrictions on Covalent Bonds on an NFT

### `_setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates allowance on Breaking Covalent Bonds on an NFT by anyone

### `_msgSender() → address payable` (internal)



See {BaseRelayRecipient-_msgSender}.

### `_msgData() → bytes` (internal)



See {BaseRelayRecipient-_msgData}.


