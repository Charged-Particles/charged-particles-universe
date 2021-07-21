## `AaveWalletManager`

Wallet Manager for Aave


Non-upgradeable Contract


### `isReserveActive(address contractAddress, uint256 tokenId, address assetToken) → bool` (external)





### `getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken) → address` (external)





### `getPrincipal(address contractAddress, uint256 tokenId, address assetToken) → uint256` (external)

Gets the Principal-Amount of Assets held in the Smart-Wallet




### `getInterest(address contractAddress, uint256 tokenId, address assetToken) → uint256 creatorInterest, uint256 ownerInterest` (external)

Gets the Interest-Amount that the Token has generated




### `getTotal(address contractAddress, uint256 tokenId, address assetToken) → uint256` (external)

Gets the Available Balance of Assets held in the Token




### `getRewards(address contractAddress, uint256 tokenId, address _rewardToken) → uint256` (external)





### `energize(address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount) → uint256 yieldTokensAmount` (external)





### `discharge(address receiver, address contractAddress, uint256 tokenId, address assetToken, address creatorRedirect) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeAmount(address receiver, address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount, address creatorRedirect) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeAmountForCreator(address receiver, address contractAddress, uint256 tokenId, address creator, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)





### `release(address receiver, address contractAddress, uint256 tokenId, address assetToken, address creatorRedirect) → uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount` (external)





### `releaseAmount(address receiver, address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount, address creatorRedirect) → uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsAmount) → uint256 amount` (external)





### `executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `getWalletAddressById(address contractAddress, uint256 tokenId, address creator, uint256 annuityPct) → address` (external)





### `setAaveBridge(address aaveBridge)` (external)





### `setReferralCode(uint256 referralCode)` (external)





### `setValidRewardsToken(address rewardsToken, bool state)` (external)





### `_createWallet() → address` (internal)






### `AaveBridgeSet(address aaveBridge)`





### `ValidRewardsTokenSet(address rewardsToken, bool state)`





