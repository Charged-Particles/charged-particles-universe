# AaveWalletManager

Wallet Manager for Aave. Non-upgradeable Contract.


## Read Contract Info

### isReserveActive

Checks if reserve is active for a given token and NFT.

```
function isReserveActive(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external returns (bool);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to check |


### getReserveInterestToken

Gets interest token for a reserve asset.

```
function getReserveInterestToken(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external view returns (address);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to check |

### getPrincipal

Gets the Principal-Amount of Assets held in the Smart Wallet.

```
function getPrincipal(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to check |

### getInterest

Gets the Interest-Amount that the Token has generated.

**getInterest**
```
function getInterest(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external 
  returns (
    uint256 creatorInterest, 
    uint256 ownerInterest
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to check |
| creatorInterest | interest amount generated for Creator |
| ownerInterest | interest amount generated for Owner |

### getTotal

Gets the Available Balance of Assets held in the Token.

```  
function getTotal(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken
) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to check |
### getRewards

Gets the Available Balance of Reward Assets held in the Token. Rewards tokens are generally the result of liquidity mining programs like COMP's. 

```
function getRewards(
  address contractAddress, 
  uint256 tokenId, 
  address rewardToken
) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| rewardToken | address of token to check |

## Particle Interactions

### energize

Add an asset to the Smart Wallet.

```
function energize(
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount
) external returns (uint256 yieldTokensAmount);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to deposit |
| assetAmount | amount of token to deposit |
| yieldTokensAmount | amount of yield tokens user receives in exchange for deposit |

### discharge

Remove all of the accrued interest for a given asset in a given NFT.

```  
function discharge(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  address creatorRedirect
) external 
  returns (
    uint256 creatorAmount,
    uint256 receiverAmount
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | NFT owner's address |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to withdraw |
| creatorRedirect | address to redirect creator annuities |
| creatorAmount | amount of tokens creator receives |
| receiverAmount | amount of tokens owner receives |

### dischargeAmount

Remove a specific amount of the accrued interest for a given asset in a given NFT.

```  
function dischargeAmount(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount, 
  address creatorRedirect
) external 
  returns (
    uint256 creatorAmount,
    uint256 receiverAmount
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | NFT owner's address |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to withdraw |
| assetAmount | amount of token to withdraw |
| creatorRedirect | address to redirect creator annuities |
| creatorAmount | amount of tokens creator receives |
| receiverAmount | amount of tokens owner receives |


### dischargeAmountForCreator

Remove a specific amount of the accrued interest for a given asset in a given NFT for the Creator only.

```  
function dischargeAmountForCreator(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address assetToken, 
  uint256 assetAmount, 
  address creator
) external 
  returns (
    uint256 receiverAmount
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | NFT owner's address |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to withdraw |
| assetAmount | amount of token to withdraw |
| creator | address to redirect creator annuities |
| receiverAmount | amount of tokens owner receives |

### release

Withdraw all of the principal for an asset in a given NFT.

```  
function release(
  address receiver, 
  address contractAddress, 
  uint256 tokenId,
  address assetToken, 
  address creatorRedirect
) external 
  returns (
    uint256 principalAmount, 
    uint256 creatorAmount, 
    uint256 receiverAmount
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | NFT owner's address |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to withdraw |
| creatorRedirect | address to redirect creator annuities |
| principalAmount | total amount of principal |
| creatorAmount | amount of tokens creator receives |
| receiverAmount | amount of tokens owner receives |


### releaseAmount

Withdraw a specific amount of the principal for an asset in a given NFT.

```  
function release(
  address receiver, 
  address contractAddress, 
  uint256 tokenId,
  address assetToken, 
  uint256 assetAmount,
  address creatorRedirect
) external 
  returns (
    uint256 principalAmount, 
    uint256 creatorAmount, 
    uint256 receiverAmount
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | NFT owner's address |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| assetToken | address of token to withdraw |
| assetAmount | amount of token to withdraw |
| creatorRedirect | address to redirect creator annuities |
| principalAmount | total amount of principal |
| creatorAmount | amount of tokens creator receives |
| receiverAmount | amount of tokens owner receives |

### withdrawRewards

Withdraw Rewards tokens earned by NFT's Smart Wallet.

```
function withdrawRewards(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address rewardsToken, 
  uint256 rewardsAmount
) external returns (uint256 amount);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | NFT owner's address |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| rewardsToken | address of reward token to withdraw |
| rewardsAmount | amount of reward token to withdraw |

### executeForAccount

Call a contract method from the Smart Wallet.

```
function executeForAccount(
  address contractAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```
