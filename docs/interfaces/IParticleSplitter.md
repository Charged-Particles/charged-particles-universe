## `IParticleSplitter`

Interface for Particle Splitter




### `executeForWallet(address contractAddress, uint256 tokenId, string walletManagerId, address externalAddress, bytes encodedParams) → bytes` (external)





### `executeForBasket(address contractAddress, uint256 tokenId, string basketManagerId, address externalAddress, bytes encodedParams) → bytes` (external)





### `withdrawWalletRewards(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address rewardsToken, uint256 rewardsAmount) → uint256 amountWithdrawn` (external)





### `withdrawBasketRewards(address receiver, address contractAddress, uint256 tokenId, string basketManagerId, address rewardsToken, uint256 rewardsAmount) → uint256 amountWithdrawn` (external)





### `refreshWalletPrincipal(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken)` (external)






### `ChargedManagersSet(address chargedManagers)`





### `TokenInfoProxySet(address tokenInfoProxy)`





### `ExecuteForWallet(address contractAddress, uint256 tokenId, string walletManagerId, address externalAddress, bytes encodedParams, uint256 ethValue)`





### `ExecuteForBasket(address contractAddress, uint256 tokenId, string basketManagerId, address externalAddress, bytes encodedParams, uint256 ethValue)`





### `PrincipalRefreshed(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken)`





