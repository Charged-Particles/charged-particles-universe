# `ChargedState`

> Charged Particles State Contract
## Get State Data

> Get info on time locks, approvals, and permissions.

#### getDischargeTimelockExpiry

Gets unlock block for Discharge time lock.

```
function getDischargeTimelockExpiry(
  address contractAddress,
  uint256 tokenId
) external view virtual override returns (uint256 lockExpiry)
```

| Parameter / Return Value  | Description                                   |
|---------------------------|-----------------------------------------------|
| contractAddress           | address of contract for Particle              |
| tokenId                   | id of Particle to check time lock for         |
| lockExpiry                | unlock block for Particle's Charge (interest) |

#### getReleaseTimelockExpiry

Gets unlock block for Release time lock.

```
function getReleaseTimelockExpiry(
  address contractAddress,
  uint256 tokenId
) external view virtual override returns (uint256 lockExpiry);
```

| Parameter / Return Value  | Description                                   |
|---------------------------|-----------------------------------------------|
| contractAddress           | address of contract for Particle              |
| tokenId                   | id of Particle to check time lock for         |
| lockExpiry                | unlock block for Particle's Mass (principal)  |

#### getBreakBondTimelockExpiry

Gets unlock block for restrictions on withdrawing NFTs from a Particle (covalent bonds).

```
function getBreakBondTimelockExpiry(
  address contractAddress,
  uint256 tokenId
) external view virtual override returns (uint256 lockExpiry);
```

| Parameter / Return Value  | Description                                        |
|---------------------------|----------------------------------------------------|
| contractAddress           | address of contract for Particle                   |
| tokenId                   | id of Particle to check time lock for              |
| lockExpiry                | unlock block for Particle's covalent bonds (NFTs)  |

#### isApprovedForDischarge

Checks if an operator is allowed to Discharge a specific Particle.

```
function isApprovedForDischarge(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override view returns (bool);`
```

| Parameter / Return Value  | Description                           |
|---------------------------|---------------------------------------|
| contractAddress           | address of contract for Particle      |
| tokenId                   | id of Particle to check approval of   |
| operator                  | address of the operator to check      |
| return                    | True if operator approved             |

#### isApprovedForRelease

Checks if an operator is allowed to Release a specific Particle.

```
function isApprovedForRelease(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override view returns (bool);`
```

| Parameter / Return Value  | Description                           |
|---------------------------|---------------------------------------|
| contractAddress           | address of contract for Particle      |
| tokenId                   | id of Particle to check approval of   |
| operator                  | address of the operator to check      |
| return                    | True if operator approved             |

### isApprovedForBreakBond

Checks if an operator is allowed to Break Covalent Bonds on a specific Particle.

```
function isApprovedForBreakBond(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override view returns (bool);`
```

| Parameter / Return Value  | Description                           |
|---------------------------|---------------------------------------|
| contractAddress           | address of contract for Particle      |
| tokenId                   | id of Particle to check approval of   |
| operator                  | address of the operator to check      |
| return                    | True if operator approved             |

#### isApprovedForTimelock

Checks if an operator is allowed to Timelock a specific Particle.

```
function isApprovedForTimelock(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override view returns (bool);`
```

| Parameter / Return Value  | Description                           |
|---------------------------|---------------------------------------|
| contractAddress           | address of contract for Particle      |
| tokenId                   | id of Particle to check approval of   |
| operator                  | address of the operator to check      |
| return                    | True if operator approved             |

#### isEnergizeRestricted

Checks if energizing a specific Particle is restricted.

```
function isEnergizeRestricted(
  address contractAddress,
  uint256 tokenId
) external virtual override view returns (bool);'
```

| Parameter / Return Value  | Description                           |
|---------------------------|---------------------------------------|
| contractAddress           | address of contract for Particle      |
| tokenId                   | id of Particle to check restriction of|
| return                    | whether or not energizing restricted  |

#### isCovalentBondRestricted

Checks if covalent bonding (depositing NFTs into a Particle) for a specific Particle is restricted.

```
function isCovalentBondRestricted(
  address contractAddress,
  uint256 tokenId
) external virtual override view returns (bool);
```

| Parameter / Return Value  | Description                            |
|---------------------------|----------------------------------------|
| contractAddress           | address of contract for Particle       |
| tokenId                   | id of Particle to check restriction of |
| return                    | whether or not bonding restricted      |


#### getDischargeState

Gets state of discharge settings / permissions for a Particle.

```
function getDischargeState(
  address contractAddress, 
  uint256 tokenId,
  address sender
) external view virtual override 
  returns (
    bool allowFromAll, 
    bool isApproved, 
    uint256 timelock, 
    uint256 tempLockExpiry
  );
```

| Parameter / Return Value  | Description                                    |
|---------------------------|------------------------------------------------|
| contractAddress           | address of contract for Particle               |
| tokenId                   | id of Particle to check state of               |
| sender                    | address of transaction sender                  |
| allowFromAll              | whether or not all can discharge from Particle |
| isApproved                | discharge approval status                      |
| timelock                  | unlock block for charge (interest)             |
| tempLockExpiry            | unlock block for temporary time lock           |


#### getReleaseState

Gets state of release settings / permissions for a Particle.

```
function getDischargeState(
  address contractAddress, 
  uint256 tokenId,
  address sender
) external view virtual override 
  returns (
    bool allowFromAll, 
    bool isApproved, 
    uint256 timelock, 
    uint256 tempLockExpiry
  );
```

| Parameter / Return Value  | Description                                    |
|---------------------------|------------------------------------------------|
| contractAddress           | address of contract for Particle               |
| tokenId                   | id of Particle to check state of               |
| sender                    | address of transaction sender                  |
| allowFromAll              | whether or not all can release a Particle      |
| isApproved                | discharge approval status                      |
| timelock                  | unlock block for mass (principal)              |
| tempLockExpiry            | unlock block for temporary time lock           |


#### getBreakBondState

Gets state of covalent bond breaking (releasing an NFT) settings / permissions for a Particle.

```
function getBreakBondState(
  address contractAddress,
  uint256 tokenId,
  address sender
) external view virtual override 
  returns (
    bool allowFromAll, 
    bool isApproved,
    uint256 timelock,
    uint256 tempLockExpiry
  );
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to check state of                    |
| sender                    | address of transaction sender                       |
| allowFromAll              | whether or not all can release an NFT from Particle |
| isApproved                | discharge approval status                           |
| timelock                  | unlock block for mass (principal)                   |
| tempLockExpiry            | unlock block for temporary time lock                |


## Set Permissions + Approvals

> Update a Particle's permissions and approvals

#### setDischargeApproval

Sets an Operator as Approved to Discharge a specific Token. This allows an operator to withdraw the interest-portion only.

```
function setDischargeApproval(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender()); 
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set approval for                  |
| operator                  | address of Particle operator                        |

#### setReleaseApproval

Sets an Operator as Approved to Release a specific Token. This allows an operator to withdraw the principal + interest.

```
function setReleaseApproval(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle set approval for                     |
| operator                  | address of Particle operator                        |

#### setBreakBondApproval

Sets an Operator as Approved to Break Covalent Bonds on a specific Token. This allows an operator to withdraw Basket NFTs.

```
function setBreakBondApproval(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set approval for                  |
| operator                  | address of Particle operator                        |

#### setTimelockApproval

Sets an Operator as Approved to Timelock a specific Token. This allows an operator to timelock the principal or interest.

```
function setTimelockApproval(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set approval for                  |
| operator                  | address of Particle operator                        |

#### setApprovalForAll

Sets an Operator as Approved to Discharge/Release/Timelock a specific Token.

```
function setApprovalForAll(
  address contractAddress,
  uint256 tokenId,
  address operator
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set approval for                  |
| operator                  | address of Particle operator                        |

#### setPermsForRestrictCharge

Updates Restrictions on Energizing an NFT.

```
function setPermsForRestrictCharge(
  address contractAddress,
  uint256 tokenId,
  bool state
  ) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set permissions for               |
| state                     | state of restrictions                               |

#### setPermsForAllowDischarge

Updates Allowance on Discharging an NFT by Anyone.

```
function setPermsForAllowDischarge(
  address contractAddress,
  uint256 tokenId,
  bool state
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set permissions for               |
| state                     | state of discharge permissions                      |

#### setPermsForAllowRelease

Updates Allowance on Releasing an NFT by Anyone.

```
function setPermsForAllowRelease(
  address contractAddress,
  uint256 tokenId,
  bool state
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set permissions for               |
| state                     | state of discharge permissions                      |

#### setPermsForRestrictBond

Updates Restrictions on Covalent Bonds on an NFT.

```
function setPermsForRestrictBreakBond(
  address contractAddress,
  uint256 tokenId,
  bool state
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set permissions for               |
| state                     | state of discharge permissions                      |

#### setPermsForAllowBreakBond

Updates Allowance on Breaking Covalent Bonds on an NFT by Anyone.

```
function setPermsForAllowBreakBond(
  address contractAddress,
  uint256 tokenId,
  bool state
) external virtual override onlyErc721OwnerOrOperator(contractAddress, tokenId, _msgSender());
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set permissions for               |
| state                     | state of discharge permissions                      |


## Set Timelocks

> Update time locks for a particles Mass (principal), Charge (interest), or Bonds (locked NFTs)

#### setDischargeTimelock

Sets a Timelock on the ability to Discharge the Interest of a Particle.

```
function setDischargeTimelock(
  address contractAddress,
  uint256 tokenId,
  uint256 unlockBlock
) external override virtual;
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set time lock for                 |
| state                     | Ethereum Block-number to Timelock until             |

#### setReleaseTimelock

Sets a Timelock on the ability to Release the Assets of a Particle.

```
function setReleaseTimelock(
  address contractAddress,
  uint256 tokenId,
  uint256 unlockBlock
) external override virtual;
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set time lock for                 |
| unlockBlock               | Ethereum Block-number to Timelock until             |

#### setBreakBondTimelock

Sets a Timelock on the ability to Break the Covalent Bond of a Particle.

```
function setBreakBondTimelock(
  address contractAddress,
  uint256 tokenId,
  uint256 unlockBlock
) external override virtual;
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| contractAddress           | address of contract for Particle                    |
| tokenId                   | id of Particle to set time lock for                 |
| unlockBlock               | Ethereum Block-number to Timelock until             |