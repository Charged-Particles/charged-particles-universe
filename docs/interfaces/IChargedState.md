# IChargedState


## Events

**ChargedSettingsSet**
```
event ChargedSettingsSet(address indexed settingsController);
```

**DischargeApproval**
```
event DischargeApproval(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed owner,
  address operator
);
```

**ReleaseApproval**
```
event ReleaseApproval(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed owner,
  address operator
);
```

**BreakBondApproval**
```
event BreakBondApproval(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed owner,
  address operator
);
```

**TimelockApproval**
```
event TimelockApproval(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed owner,
  address operator
);
```

**TokenDischargeTimelock**
```
event TokenDischargeTimelock(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed operator,
  uint256 unlockBlock
);
```

**TokenReleaseTimelock**
```
event TokenReleaseTimelock(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed operator,
  uint256 unlockBlock
);
```

**TokenBreakBondTimelock**
```
event TokenBreakBondTimelock(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed operator, 
  uint256 unlockBlock
);
```

**TokenTempLock**
```
event TokenTempLock(
  address indexed contractAddress,
  uint256 indexed tokenId,
  uint256 unlockBlock
);
```

**PermsSetForRestrictCharge**
```
event PermsSetForRestrictCharge(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

**PermsSetForAllowDischarge**
```
event PermsSetForAllowDischarge(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

**PermsSetForAllowRelease**
```
event PermsSetForAllowRelease(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

**PermsSetForRestrictBond**
```
event PermsSetForRestrictBond(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

**PermsSetForAllowBreakBond**
```
event PermsSetForAllowBreakBond(address indexed contractAddress, uint256 indexed tokenId, bool state);
```

## Public API

> ***Get info about Particle(s) State***

**getDischargeTimelockExpiry**
```
function getDischargeTimelockExpiry(
  address contractAddress,
  uint256 tokenId
) external view returns (uint256 lockExpiry);
```

**getReleaseTimelockExpiry**
```
function getReleaseTimelockExpiry(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256 lockExpiry);
```

**getBreakBondTimelockExpiry**
```
function getBreakBondTimelockExpiry(
  address contractAddress,
  uint256 tokenId
) external view returns (uint256 lockExpiry);
```


**isApprovedForDischarge**
```
function isApprovedForDischarge(
  address contractAddress,
  uint256 tokenId,
  address operator
) external view returns (bool);
```

**isApprovedForRelease**
```
function isApprovedForRelease(
  address contractAddress,
  uint256 tokenId,
  address operator
) external view returns (bool);
```

**isApprovedForBreakBond**
```
function isApprovedForBreakBond(
  address contractAddress,
  uint256 tokenId,
  address operator
) external view returns (bool);
```

**isApprovedForTimelock**
```
function isApprovedForTimelock(
  address contractAddress,
  uint256 tokenId,
  address operator
) external view returns (bool);
```

**isEnergizeRestricted**
```
function isEnergizeRestricted(
  address contractAddress,
  uint256 tokenId
) external view returns (bool);
```

**isCovalentBondRestricted**
```
function isCovalentBondRestricted(
  address contractAddress,
  uint256 tokenId
) external view returns (bool);
```

**getDischargeState**
```
function getDischargeState(
  address contractAddress,
  uint256 tokenId,
  address sender
) external view
  returns (
    bool allowFromAll,
    bool isApproved,
    uint256 timelock,
    uint256 tempLockExpiry
  );
```

**getReleaseState**
```
function getReleaseState(
  address contractAddress,
  uint256 tokenId, 
  address sender
  ) external view
    returns (
      bool allowFromAll,
      bool isApproved,
      uint256 timelock,
      uint256 tempLockExpiry
    );
```

**getBreakBondState**
```
function getBreakBondState(
  address contractAddress,
  uint256 tokenId,
  address sender
  ) external view
  returns (
    bool allowFromAll,
    bool isApproved,
    uint256 timelock,
    uint256 tempLockExpiry
  );
```


## Only NFT Owner / Operator

> ***Modify a Particle's State***

**setDischargeApproval**
```
function setDischargeApproval(address contractAddress, uint256 tokenId, address operator) external;
```

**setReleaseApproval**
```
function setReleaseApproval(address contractAddress, uint256 tokenId, address operator) external;
```

**setBreakBondApproval**
```
function setBreakBondApproval(address contractAddress, uint256 tokenId, address operator) external;
```

**setTimelockApproval**
```
function setTimelockApproval(address contractAddress, uint256 tokenId, address operator) external;
```

**setApprovalForAll**
```
function setApprovalForAll(address contractAddress, uint256 tokenId, address operator) external;
```

**setPermsForRestrictCharge**
```
function setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state) external;
```

**setPermsForAllowDischarge**
```
function setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state) external;
```

**setPermsForAllowRelease**
```
function setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state) external;
```

**setPermsForRestrictBond**
```
function setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state) external;
```

**setPermsForAllowBreakBond**
```
function setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state) external;
```

**setDischargeTimelock**
```
function setDischargeTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock) external;
```

**setReleaseTimelock**
```
function setReleaseTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock) external;
```

**setBreakBondTimelock**
```
function setBreakBondTimelock(address contractAddress, uint256 tokenId, uint256 unlockBlock) external;
```

## Only NFT Contract

**setTemporaryLock**
```
function setTemporaryLock(address contractAddress, uint256 tokenId, bool isLocked) external;
```