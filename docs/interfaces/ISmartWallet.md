# `ISmartWallet`

Manages holding and transferring assets of an NFT to a specific LP for Yield (if any),

## Methods

**getAssetTokenCount**
```
  function getAssetTokenCount() external view returns (uint256);
```
  
**getAssetTokenByIndex**
```
function getAssetTokenByIndex(uint256 index) external view returns (address);
```

**setNftCreator**
```
function setNftCreator(address creator, uint256 annuityPct) external;
```

**isReserveActive**
```
function isReserveActive(address assetToken) external view returns (bool);
```

**getReserveInterestToken**
```
function getReserveInterestToken(address assetToken) external view returns (address);
```

**getPrincipal**
```
function getPrincipal(address assetToken) external returns (uint256);
```

**getInterest**
```
function getInterest(address assetToken) external returns (uint256 creatorInterest, uint256 ownerInterest);
```

**getTotal**
```
function getTotal(address assetToken) external returns (uint256);
```

**getRewards**
```
function getRewards(address assetToken) external returns (uint256);
```

**deposit**
```
function deposit(
  address assetToken, 
  uint256 assetAmount, 
  uint256 referralCode
) external returns (uint256);
```

**withdraw**
```
function withdraw(
  address receiver, 
  address creatorRedirect, 
  address assetToken
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**withdrawAmount**
```
function withdrawAmount(
  address receiver, 
  address creatorRedirect, 
  address assetToken, 
  uint256 assetAmount
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**withdrawAmountForCreator**
```
function withdrawAmountForCreator(
  address receiver, 
  address assetToken, 
  uint256 assetAmount
) external returns (uint256 receiverAmount);
```

**withdrawRewards**
```
function withdrawRewards(
  address receiver, 
  address rewardsToken, 
  uint256 rewardsAmount
) external returns (uint256);
```

**executeForAccount**
```
function executeForAccount(
  address contractAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```