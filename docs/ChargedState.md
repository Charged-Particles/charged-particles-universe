# ChargedState

## Get State Data

> Get info on time locks, approvals, and permissions.
### getDischargeTimelockExpiry

Gets unlock block for Discharge time lock.

```
function getDischargeTimelockExpiry(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256 lockExpiry);
```


| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| lockExpiry  | unlock block for Particle's Charge (interest)     | uint256 |

### getReleaseTimelockExpiry

Gets unlock block for Release time lock.

```
function getReleaseTimelockExpiry(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256 lockExpiry);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| lockExpiry  | unlock block for Particle's Mass (principal + interest)     | uint256 |

### getBreakBondTimelockExpiry

Gets unlock block for restrictions on withdrawing NFTs (Covalent Bonds) from a Particle.

```
function getBreakBondTimelockExpiry(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256 lockExpiry);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| lockExpiry  | unlock block for Particle's Covalent Bonds (nested NFTs)     | uint256 |


### isApprovedForDischarge

Checks if an operator is allowed to Discharge a specific token (Particle).

```
function isApprovedForDischarge(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |  address of the operator to check approval for | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| isApproved | true if operator approved, false if not approved     | bool |


### isApprovedForRelease

Checks if an operator is allowed to Release a specific token (Particle).

```
function isApprovedForRelease(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |  address of the operator to check approval for | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| isApproved | true if operator approved, false if not approved     | bool |

### isApprovedForBreakBond

Checks if an operator is allowed to break Covalent Bonds on a specific token (Particle).

```
function isApprovedForBreakBond(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |  address of the operator to check approval for | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| isApproved | true if operator approved, false if not approved     | bool |

### isApprovedForTimelock

Checks if an operator is allowed to Timelock a specific token (Particle).

```
function isApprovedForTimelock(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |  address of the operator to check approval for | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| isApproved | true if operator approved, false if not approved     | bool |

### isEnergizeRestricted

Checks if energizing a specific Particle is restricted.

```
function isEnergizeRestricted(
  address contractAddress, 
  uint256 tokenId
) external view returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |


| Return Value | Description | Type |
| --------- | ----------- | ---- |
| isApproved | true if operator approved, false if not approved     | bool |

### isCovalentBondRestricted

Checks if covalent bonding (depositing NFTs into a Particle) for a specific Particle is restricted.

```
function isCovalentBondRestricted(
  address contractAddress, 
  uint256 tokenId
) external view returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |


| Return Value | Description | Type |
| --------- | ----------- | ---- |
| isApproved | true if operator approved, false if not approved     | bool |

### getDischargeState

Gets state of discharge settings / permissions for a Particle.

```
function getDischargeState(
  address contractAddress, 
  uint256 tokenId, 
  address sender
  ) external returns (
    bool allowFromAll, 
    bool isApproved, 
    uint256 timelock, 
    uint256 tempLockExpiry
  );
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| sender |
address of transaction sender | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| allowFromAll | whether or not any address can release a Particle | bool |
| isApproved | true if operator approved, false if not approved     | bool |
| timelock | unlock block for Particle's Charge (interest only)     | uint256 |
| tempLockExpiry | unlock block for temporary time lock     | uint256 |

### getReleaseState

Gets state of release settings / permissions for a Particle.

```
function getReleaseState(
  address contractAddress, 
  uint256 tokenId, 
  address sender
) external returns (
  bool allowFromAll, 
  bool isApproved, 
  uint256 timelock, 
  uint256 tempLockExpiry
);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| sender |
address of transaction sender | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| allowFromAll | whether or not any address can release a Particle | bool |
| isApproved | true if operator approved, false if not approved     | bool |
| timelock | unlock block for Particle's Mass (principal + interest)     | uint256 |
| tempLockExpiry | unlock block for temporary time lock     | uint256 |

### getBreakBondState

Gets state of covalent bond breaking (releasing an NFT) settings / permissions for a Particle.

```
function getBreakBondState(
  address contractAddress, 
  uint256 tokenId, 
  address sender
) external returns (
  bool allowFromAll,
  bool isApproved,
  uint256 timelock,
  uint256 tempLockExpiry
);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| sender |
address of transaction sender | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| allowFromAll | whether or not any address can release a Particle | bool |
| isApproved | true if operator approved, false if not approved     | bool |
| timelock | unlock block for Particle's Covalent Bonds (nested NFTs)     | uint256 |
| tempLockExpiry | unlock block for temporary time lock     | uint256 |

## Set Permissions + Approvals

> Update a Particle's permissions and approvals. Only the owner or operator of an NFT can call these functions.

### setDischargeApproval

Sets an operator as approved to Discharge a specific token (Particle); This allows an operator to withdraw the interest-portion only.

```
function setDischargeApproval(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |
Particle's operator | address |

### setReleaseApproval

Sets an operator as approved to Release a specific token (Particle); This allows an operator to withdraw the principal + interest.

```
function setReleaseApproval(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |
Particle's operator | address |

### setBreakBondApproval

Sets an operator as approved to break Covalent Bonds on a specific token (Particle); This allows an operator to withdraw NFTs.

```
function setBreakBondApproval(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |
Particle's operator | address |

### setTimelockApproval

Sets an operator as approved to Timelock a specific token (Particle); This allows an operator to timelock the principal or interest.

```
function setTimelockApproval(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |
Particle's operator | address |
### setApprovalForAll

Sets an operator as approved to Discharge/Release/Timelock a specific token (Particle).

```
function setApprovalForAll(
  address contractAddress, 
  uint256 tokenId, 
  address operator
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| operator |
Particle's operator | address |

### setPermsForRestrictCharge

Updates restrictions on Energizing an NFT.

```
function setPermsForRestrictCharge(
  address contractAddress, 
  uint256 tokenId, 
  bool state
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| state |
state of permissions for action | bool |

### setPermsForAllowDischarge

Updates allowance on Discharging an NFT by anyone.

```
function setPermsForAllowDischarge(
  address contractAddress, 
  uint256 tokenId, 
  bool state
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| state |
state of permissions for action | bool |

### setPermsForAllowRelease

Updates allowance on Discharging an NFT by anyone.

```
function setPermsForAllowRelease(
  address contractAddress, 
  uint256 tokenId, 
  bool state
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| state |
state of permissions for action | bool |

### setPermsForRestrictBond

Updates restrictions on Covalent Bonds on an NFT.

```
function setPermsForRestrictBond(
  address contractAddress, 
  uint256 tokenId, 
  bool state
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| state |
state of permissions for action | bool |

### setPermsForAllowBreakBond

Updates allowance on Breaking Covalent Bonds on an NFT by anyone.

```
function setPermsForAllowBreakBond(
  address contractAddress, 
  uint256 tokenId, 
  bool state
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| state |
state of permissions for action | bool |

### setDischargeTimelock

Sets a Timelock on the ability to Discharge the interest of a Particle.

```
function setDischargeTimelock(
  address contractAddress,
  uint256 tokenId,
  uint256 unlockBlock
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| unlockBlock |
unlock block for Discharge time lock (interest only) | uint256 |

### setReleaseTimelock

Sets a Timelock on the ability to Release the assets of a Particle.

```
function setReleaseTimelock(
  address contractAddress,
  uint256 tokenId,
  uint256 unlockBlock
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| unlockBlock |
unlock block for Release time lock (principal + interest) | uint256 |

### setBreakBondTimelock

Sets a Timelock on the ability to break the Covalent Bond of a Particle.

```
function setBreakBondTimelock(
  address contractAddress,
  uint256 tokenId,
  uint256 unlockBlock
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| unlockBlock |
unlock block for Covalent Bonds (nested NFTs) time lock | uint256 |

### setTemporaryLock

Sets a temporary Timelock on the ability to Release/Discharge the assets of a Particle.

```
function setTemporaryLock(
  address contractAddress,
  uint256 tokenId,
  bool isLocked
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| isLocked |
state of time lock | bool |

## Other

### Events

```
event Initialized(address indexed initiator);
```

```
  event ControllerSet(address indexed controllerAddress, string controllerId);
```

```
  event DischargeApproval(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, address operator);
```

```
  event ReleaseApproval(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, address operator);
```

```
  event BreakBondApproval(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, address operator);
```

```
  event TimelockApproval(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, address operator);
```

```
  event TokenDischargeTimelock(address indexed contractAddress, uint256 indexed tokenId, address indexed operator, uint256 unlockBlock);
```

```
  event TokenReleaseTimelock(address indexed contractAddress, uint256 indexed tokenId, address indexed operator, uint256 unlockBlock);
```

```
  event TokenBreakBondTimelock(address indexed contractAddress, uint256 indexed tokenId, address indexed operator, uint256 unlockBlock);
```

```
  event TokenTempLock(address indexed contractAddress, uint256 indexed tokenId, uint256 unlockBlock);
```

```
  event PermsSetForRestrictCharge(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

```
  event PermsSetForAllowDischarge(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

```
  event PermsSetForAllowRelease(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

```
  event PermsSetForRestrictBond(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

```
  event PermsSetForAllowBreakBond(address indexed contractAddress, uint256 indexed tokenId, bool state);
```
