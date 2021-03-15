## `GenericSmartWallet`

Generic ERC20-Token Smart-Wallet Bridge


Non-upgradeable Contract


### `initialize()` (public)





### `isReserveActive(address assetToken) → bool` (external)





### `getReserveInterestToken(address assetToken) → address` (external)





### `getPrincipal(address assetToken) → uint256` (external)





### `getInterest(address) → uint256 creatorInterest, uint256 ownerInterest` (external)





### `getTotal(address assetToken) → uint256` (external)





### `getRewards(address assetToken) → uint256` (external)





### `deposit(address assetToken, uint256 assetAmount, uint256) → uint256` (external)





### `withdraw(address receiver, address, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawAmount(address receiver, address, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawAmountForCreator(address, address, uint256) → uint256 receiverAmount` (external)





### `withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsAmount) → uint256` (external)






