## `GenericWalletManagerB`

Generic ERC20 Wallet Manager B


Non-upgradeable Contract


### `isReserveActive(address contractAddress, uint256 tokenId, address assetToken) → bool` (external)





### `getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken) → address` (external)





### `getTotal(address contractAddress, uint256 tokenId, address assetToken) → uint256` (external)

Gets the Available Balance of Assets held in the Token




### `getPrincipal(address contractAddress, uint256 tokenId, address assetToken) → uint256` (external)

Gets the Principal-Amount of Assets held in the Smart-Wallet




### `getInterest(address contractAddress, uint256 tokenId, address assetToken) → uint256 creatorInterest, uint256 ownerInterest` (external)

Gets the Interest-Amount that the Token has generated




### `getRewards(address contractAddress, uint256 tokenId, address rewardToken) → uint256` (external)





### `energize(address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount) → uint256 yieldTokensAmount` (external)





### `discharge(address, address, uint256, address, address) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeAmount(address, address, uint256, address, uint256, address) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeAmountForCreator(address, address, uint256, address, address, uint256) → uint256 receiverAmount` (external)





### `release(address receiver, address contractAddress, uint256 tokenId, address assetToken, address creatorRedirect) → uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount` (external)





### `releaseAmount(address receiver, address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount, address creatorRedirect) → uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsAmount) → uint256 amount` (external)





### `executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `refreshPrincipal(address contractAddress, uint256 tokenId, address assetToken)` (external)





### `getWalletAddressById(address contractAddress, uint256 tokenId, address creator, uint256 annuityPct) → address` (external)





### `_createWallet() → address` (internal)






