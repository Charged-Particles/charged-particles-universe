## `ChargedState`

Charged Particles Settings Contract



### `onlyErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender)`






### `getDischargeTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `getReleaseTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `getBreakBondTimelockExpiry(address contractAddress, uint256 tokenId) → uint256 lockExpiry` (external)





### `isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Discharge a specific Token




### `isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Release a specific Token




### `isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Break Covalent Bonds on a specific Token




### `isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) → bool` (external)

Checks if an operator is allowed to Timelock a specific Token




### `isEnergizeRestricted(address contractAddress, uint256 tokenId) → bool` (external)





### `isCovalentBondRestricted(address contractAddress, uint256 tokenId) → bool` (external)





### `getDischargeState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `getReleaseState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `getBreakBondState(address contractAddress, uint256 tokenId, address sender) → bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry` (external)





### `setDischargeApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an Operator as Approved to Discharge a specific Token
This allows an operator to withdraw the interest-portion only




### `setReleaseApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an Operator as Approved to Release a specific Token
This allows an operator to withdraw the principal + interest




### `setBreakBondApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an Operator as Approved to Break Covalent Bonds on a specific Token
This allows an operator to withdraw Basket NFTs




### `setTimelockApproval(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an Operator as Approved to Timelock a specific Token
This allows an operator to timelock the principal or interest




### `setApprovalForAll(address contractAddress, uint256 tokenId, address operator)` (external)

Sets an Operator as Approved to Discharge/Release/Timelock a specific Token




### `setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)` (external)



Updates Restrictions on Energizing an NFT

### `setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)` (external)



Updates Allowance on Discharging an NFT by Anyone

### `setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)` (external)



Updates Allowance on Discharging an NFT by Anyone

### `setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)` (external)



Updates Restrictions on Covalent Bonds on an NFT

### `setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)` (external)



Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone

### `setDischargeTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)

Sets a Timelock on the ability to Discharge the Interest of a Particle




### `setReleaseTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)

Sets a Timelock on the ability to Release the Assets of a Particle




### `setBreakBondTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock)` (external)

Sets a Timelock on the ability to Break the Covalent Bond of a Particle




### `setTemporaryLock(address contractAddress, uint256 tokenId, bool isLocked)` (external)

Sets a Temporary-Lock on the ability to Release/Discharge the Assets of a Particle




### `setChargedSettings(address settingsController)` (external)



Setup the Charged-Settings Controller

### `setTrustedForwarder(address _trustedForwarder)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForDischarge}.

### `_isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForRelease}.

### `_isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForBreakBond}.

### `_isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) → bool` (internal)



See {ChargedParticles-isApprovedForTimelock}.

### `_setDischargeApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an Operator as Approved to Discharge a specific Token
This allows an operator to withdraw the interest-portion only




### `_setReleaseApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an Operator as Approved to Release a specific Token
This allows an operator to withdraw the principal + interest




### `_setBreakBondApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an Operator as Approved to Break Covalent Bonds on a specific Token
This allows an operator to withdraw Basket NFTs




### `_setTimelockApproval(address contractAddress, uint256 tokenId, address tokenOwner, address operator)` (internal)

Sets an Operator as Approved to Timelock a specific Token
This allows an operator to timelock the principal or interest




### `_setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates Restrictions on Energizing an NFT

### `_setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates Allowance on Discharging an NFT by Anyone

### `_setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates Allowance on Discharging an NFT by Anyone

### `_setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates Restrictions on Covalent Bonds on an NFT

### `_setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state)` (internal)



Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone

### `_msgSender() → address payable` (internal)



See {BaseRelayRecipient-_msgSender}.

### `_msgData() → bytes` (internal)



See {BaseRelayRecipient-_msgData}.


