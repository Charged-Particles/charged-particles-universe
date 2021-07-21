# `IWalletManager`

The wallet-manager for underlying assets attached to Charged Particles
Manages the link between NFTs and their respective Smart-Wallets

## Events

**ControllerSet**
```
event ControllerSet(address controller);
```

**PausedStateSet**
```
event PausedStateSet(bool isPaused);
```

**NewSmartWallet**
```
event NewSmartWallet(
  address contractAddress, 
  uint256 tokenId, 
  address smartWallet, 
  address creator, 
  uint256 annuityPct
);
```

**WalletEnergized**
```
event WalletEnergized(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount, 
  uint256 yieldTokensAmount
);
```

**WalletDischarged**
```
event WalletDischarged(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 creatorAmount, 
  uint256 receiverAmount
);
```

**WalletDischargedForCreator**
```
event WalletDischargedForCreator(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  address creator, 
  uint256 receiverAmount
);
```

**WalletReleased(address contractAddress, uint256 tokenId, address receiver, address assetToken, uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)**
```
event WalletReleased(
  address contractAddress, 
  uint256 tokenId, 
  address receiver, 
  address assetToken, 
  uint256 principalAmount, 
  uint256 creatorAmount, 
  uint256 receiverAmount
);
```

**WalletRewarded(address contractAddress, uint256 tokenId, address receiver, address rewardsToken, uint256 rewardsAmount)**
```
event WalletRewarded(
  address contractAddress, 
  uint256 tokenId, 
  address receiver, 
  address rewardsToken, 
  uint256 rewardsAmount
);
```

## Methods

**isPaused**

```
function isPaused() external returns (bool);
```

**isReserveActive**

```
function isReserveActive(address contractAddress, uint256 tokenId, address assetToken) external returns (bool);
```

**getReserveInterestToken**
```
function getReserveInterestToken(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external view returns (address);
```

**getTotal**
```  
function getTotal(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external returns (uint256);
```
  
**getPrincipal**
```
function getPrincipal(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external returns (uint256);
```
  
**getInterest**
```
function getInterest(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external returns (uint256 creatorInterest, uint256 ownerInterest);
```

**getRewards**
```
function getRewards(
  address contractAddress, 
  uint256 tokenId, 
  address rewardToken
) external returns (uint256);
```

**energize**
```
function energize(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount
) external returns (uint256 yieldTokensAmount);
```
  
**discharge**
```  
function discharge(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  address creatorRedirect
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**dischargeAmount**
```
function dischargeAmount(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount, 
  address creatorRedirect
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**dischargeAmountForCreator**
```
function dischargeAmountForCreator(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address creator, 
  address assetToken, 
  uint256 assetAmount
) external returns (uint256 receiverAmount);
```

**release**
```  
function release(
  address receiver, 
  address contractAddress, 
  uint256 tokenId,
  address assetToken, 
  address creatorRedirect
) external returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount);
```

**releaseAmount**
```
function releaseAmount(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount, 
  address creatorRedirect
) external returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount);
```

**withdrawRewards**
```
function withdrawRewards(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address rewardsToken, 
  uint256 rewardsAmount
) external returns (uint256 amount);
```

**executeForAccount**
```
function executeForAccount(
  address contractAddress, 
  uint256 tokenId, 
  address externalAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```

**getWalletAddressById**
```
function getWalletAddressById(
  address contractAddress, 
  uint256 tokenId, 
  address creator, 
  uint256 annuityPct
) external returns (address);
```
