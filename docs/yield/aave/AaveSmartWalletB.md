## `AaveSmartWalletB`

ERC20-Token Smart-Wallet for Aave Assets


Non-upgradeable Contract


### `initialize(address aaveBridge)` (public)





### `isReserveActive(address assetToken) → bool` (external)





### `getReserveInterestToken(address assetToken) → address` (external)





### `getPrincipal(address assetToken) → uint256` (external)





### `getInterest(address assetToken, uint256 creatorPct) → uint256 creatorInterest, uint256 ownerInterest` (external)





### `getTotal(address assetToken) → uint256` (external)





### `getRewards(address rewardToken) → uint256` (external)





### `deposit(address assetToken, uint256 assetAmount, uint256 referralCode) → uint256` (external)





### `withdraw(address receiver, address creator, uint256 creatorPct, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawAmount(address receiver, address creator, uint256 creatorPct, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawAmountForCreator(address receiver, uint256 creatorPct, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)





### `withdrawRewards(address receiver, address rewardsToken, uint256 rewardsAmount) → uint256` (external)





### `refreshPrincipal(address assetToken)` (external)





### `_deposit(address assetToken, uint256 assetAmount, uint256 referralCode) → uint256` (internal)





### `_withdraw(address receiver, address creator, uint256 creatorPct, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (internal)





### `_withdrawForCreator(address receiver, uint256 creatorPct, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (internal)





### `_withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsAmount) → uint256` (internal)





### `_getTotal(address assetToken) → uint256` (internal)





### `_getInterest(address assetToken, uint256 creatorPct) → uint256 creatorInterest, uint256 ownerInterest` (internal)





### `_trackAssetToken(address assetToken)` (internal)





### `_sendToken(address to, address token, uint256 amount)` (internal)






