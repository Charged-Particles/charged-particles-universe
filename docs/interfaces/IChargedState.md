## `IChargedState`

Interface for Charged State




### `getDischargeTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `getReleaseTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `getBreakBondTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) → bool` (external)





### `isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) → bool` (external)





### `isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) → bool` (external)





### `isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) → bool` (external)





### `isEnergizeRestricted(address contractAddress, uint256 tokenId) → bool` (external)





### `isCovalentBondRestricted(address contractAddress, uint256 tokenId) → bool` (external)





### `getDischargeState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `getReleaseState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `getBreakBondState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `setDischargeApproval(address contractAddress, uint256 tokenId, address operator)` (external)





### `setReleaseApproval(address contractAddress, uint256 tokenId, address operator)` (external)





### `setBreakBondApproval(address contractAddress, uint256 tokenId, address operator)` (external)





### `setTimelockApproval(address contractAddress, uint256 tokenId, address operator)` (external)





### `setApprovalForAll(address contractAddress, uint256 tokenId, address operator)` (external)





### `setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)` (external)





### `setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)` (external)





### `setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)` (external)





### `setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)` (external)





### `setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)` (external)





### `setDischargeTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)





### `setReleaseTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)





### `setBreakBondTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)





### `setTemporaryLock(address contractAddress, uint256 tokenId, bool isLocked)` (external)






### `Initialized(address initiator)`





### `ControllerSet(address controllerAddress, string controllerId)`





### `DischargeApproval(address contractAddress, uint256 tokenId, address owner, address operator)`





### `ReleaseApproval(address contractAddress, uint256 tokenId, address owner, address operator)`





### `BreakBondApproval(address contractAddress, uint256 tokenId, address owner, address operator)`





### `TimelockApproval(address contractAddress, uint256 tokenId, address owner, address operator)`





### `TokenDischargeTimelock(address contractAddress, uint256 tokenId, address operator, uint256 unlockBlock)`





### `TokenReleaseTimelock(address contractAddress, uint256 tokenId, address operator, uint256 unlockBlock)`





### `TokenBreakBondTimelock(address contractAddress, uint256 tokenId, address operator, uint256 unlockBlock)`





### `TokenTempLock(address contractAddress, uint256 tokenId, uint256 unlockBlock)`





### `PermsSetForRestrictCharge(address contractAddress, uint256 tokenId, bool state)`





### `PermsSetForAllowDischarge(address contractAddress, uint256 tokenId, bool state)`





### `PermsSetForAllowRelease(address contractAddress, uint256 tokenId, bool state)`





### `PermsSetForRestrictBond(address contractAddress, uint256 tokenId, bool state)`





### `PermsSetForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)`





