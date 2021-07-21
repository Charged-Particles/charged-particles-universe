## `GenericSmartWallet`

Generic ERC20-Token Smart-Wallet Bridge. Non-upgradeable Contract.
### isReserveActive
```
function isReserveActive(address assetToken) external returns bool;
```
### getReserveInterestToken

Get reserve token for a asset token. (e.g. get address of aUSDC)

```
function getReserveInterestToken(address assetToken) external returns address;
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| assetToken | address of reserve interest token (e.g aToken)|

### getPrincipal

Get principal held in wallet for a given token.

```
function getPrincipal(address assetToken) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| assetToken | address of token to check Mass (Principal) |
### getInterest

Get interest payable to wallet for a given token.

```
function getInterest(
  address
) external returns (
  uint256 creatorInterest, 
  uint256 ownerInterest
  );
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| address | address of token to check Charge (Interest)|
| creatorInterest | Charge (interest) payable to Creator |
| ownerInterest | Charge (interest) payable to Owner |

### getTotal

Get total amount of an asset held within the wallet.

```
function getTotal(address assetToken) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| assetToken | address of reserve token|


### getRewards

Get total amount of an rewards held by a wallet.

```
function getRewards(address assetToken) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| assetToken | address of reserve token|


## Particle Interactions

### deposit

Deposit into NFT's Smart Wallet.

```
function deposit(
  address assetToken, 
  uint256 assetAmount, 
  uint256 referralCode
) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| assetToken | address of reserve token|
| assetAmount | amount of reserve token to deposit |
| referralCode | referral code (if applicable, typically is not) |


### withdraw

Withdraw all of an asset from an NFT's Smart Wallet.

```
function withdraw(
  address receiver, 
  address assetToken
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | address to receive majority of withdrawal |
| assetToken | address of reserve token to withdraw |
| creatorAmount | amount for creator |
| receiverAmount | amount for owner / receiver |

### withdrawAmount

Withdraw a specific amount of an asset from an NFT's Smart Wallet.

```
function withdrawAmount(
  address receiver, 
  address assetToken, 
  uint256 assetAmount
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | address to receive majority of withdrawal |
| assetToken | address of reserve token to withdraw|
| assetAmount | amount of reserve token to withdraw|
| creatorAmount | amount for creator |
| receiverAmount | amount for owner / receiver |


### withdrawAmountForCreator

Withdraw a specific amount of a token (only the Creator portion).

```
function withdrawAmountForCreator(
  address // receiver, 
  address // assetToken, 
  uint256 // assetAmount
) external returns (uint256 receiverAmount);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | address to receive withdrawal |
| assetToken | address of reserve token to withdraw|
| assetAmount | amount of reserve token to withdraw|

### withdrawRewards

Withdraw rewards from Smart Wallet.

```
function withdrawRewards(
  address receiver, 
  address rewardsTokenAddress, 
  uint256 rewardsAmount
) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | address to receive withdrawal |
| rewardsTokenAddress | address of rewards token to withdraw|
| rewardsAmount | amount of rewards token to withdraw|