# IChargedSettings

## Events

**DepositCapSet**
```
event DepositCapSet(address assetToken, uint256 depositCap);
```

**TempLockExpirySet**
```
event TempLockExpirySet(uint256 expiryBlocks);
```

**WalletManagerRegistered**
```
event WalletManagerRegistered(string indexed walletManagerId, address indexed walletManager);
```

**BasketManagerRegistered**
```
event BasketManagerRegistered(string indexed basketId, address indexed basketManager);
```

**RequiredWalletManagerSet**
```
event RequiredWalletManagerSet(address indexed contractAddress, string walletManager);
```

**RequiredBasketManagerSet**
```
event RequiredBasketManagerSet(address indexed contractAddress, string basketManager);
```

**AssetTokenRestrictionsSet**
```
event AssetTokenRestrictionsSet(address indexed contractAddress, bool restrictionsEnabled);
```

**AllowedAssetTokenSet**
```
event AllowedAssetTokenSet(address indexed contractAddress, address assetToken, bool isAllowed);
```

**AssetTokenLimitsSet**
```
event AssetTokenLimitsSet(
  address indexed contractAddress,
  address assetToken,
  uint256 assetDepositMin,
  uint256 assetDepositMax
);
```

**MaxNftsSet**
```
event MaxNftsSet(address indexed contractAddress, address indexed nftTokenAddress, uint256 maxNfts);
```

**TokenCreatorConfigsSet**
```
event TokenCreatorConfigsSet(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed creatorAddress,
  uint256 annuityPercent
);
```

**TokenCreatorAnnuitiesRedirected**
```
event TokenCreatorAnnuitiesRedirected(
  address indexed contractAddress,
  uint256 indexed tokenId,
  address indexed redirectAddress
);
```

**PermsForSetCharge**
```
event PermsSetForCharge(address indexed contractAddress, bool state);
```

**PermsSetForBasket**
```
event PermsSetForBasket(address indexed contractAddress, bool state);
```

**PermsSetForTimelockAny**
```
event PermsSetForTimelockAny(address indexed contractAddress, bool state);
```

**PermsSetForTimelockSelf**
```
event PermsSetForTimelockSelf(address indexed contractAddress, bool state);
```

## Public API

> ***Get info about settings*** 

**isContractOwner**
```
function isContractOwner(address contractAddress, address account) external view returns (bool);
```

**getCreatorAnnuities**
```
function getCreatorAnnuities(
  address contractAddress, 
  uint256 tokenId
) external view returns (address creator, uint256 annuityPct);
```

**getCreatorAnnuitiesRedirect**
```
function getCreatorAnnuitiesRedirect(
  address contractAddress,
  uint256 tokenId
) external view returns (address);
```

**getTempLockExpiryBlocks**
```
function getTempLockExpiryBlocks() external view returns (uint256);
```

**getTimelockApprovals**
```
function getTimelockApprovals(
  address operator
) external view returns (bool timelockAny, bool timelockOwn);
```

**getAssetRequirements**
```
function getAssetRequirements(
  address contractAddress,
  address assetToken
) external view
  returns (
    string memory requiredWalletManager,
    bool energizeEnabled,
    bool restrictedAssets,
    bool validAsset,
    uint256 depositCap,
    uint256 depositMin,
    uint256 depositMax
  );
```

**getNftAssetRequirements**
```
function getNftAssetRequirements(
  address contractAddress,
  address nftTokenAddress
) external view 
  returns (
    string memory requiredBasketManager,
    bool basketEnabled, 
    uint256 maxNfts
  );
```

### ERC20

**isWalletManagerEnabled**
```
function isWalletManagerEnabled(
  string calldata walletManagerId
) external view returns (bool);
```

**getWalletManager**
```
function getWalletManager(string calldata walletManagerId) external view returns (IWalletManager);
```

### ERC721


**isNftBasketEnabled**
```
function isNftBasketEnabled(string calldata basketId) external view returns (bool);
```

**getBasketManager**
```
function getBasketManager(string calldata basketId) external view returns (IBasketManager);
````

## Only NFT Creator

> ***Modify Creator Annuities settings***

**setCreatorAnnuities**
```
function setCreatorAnnuities(
  address contractAddress,
  uint256 tokenId, 
  address creator, 
  uint256 annuityPercent
) external;
```

**setCreatorAnnuitiesRedirect**
```
function setCreatorAnnuitiesRedirect(
  address contractAddress, 
  uint256 tokenId, 
  address creator, 
  address receiver
) external;
```

## Only NFT Contract Owner

**setRequiredWalletManager**
```
function setRequiredWalletManager(address contractAddress, string calldata walletManager) external;
```

**setRequiredBasketManager**
```
function setRequiredBasketManager(address contractAddress, string calldata basketManager) external;
```

**setAssetTokenRestrictions**
```
function setAssetTokenRestrictions(address contractAddress, bool restrictionsEnabled) external;
```

**setAllowedAssetToken**
```
function setAllowedAssetToken(address contractAddress, address assetToken, bool isAllowed) external;
```

**setAssetTokenLimits**
```
function setAssetTokenLimits(
  address contractAddress, 
  address assetToken, 
  uint256 depositMin, 
  uint256 depositMax
) external;
```

**setMaxNfts**
```
function setMaxNfts(address contractAddress, address nftTokenAddress, uint256 maxNfts) external;
  ```
