## `ParticleSplitter`

Charged Particles Contract


Upgradeable Contract

### `onlyTokenOwner(address contractAddress, uint256 tokenId)`






### `executeForWallet(address contractAddress, uint256 tokenId, string walletManagerId, address externalAddress, bytes encodedParams) → bytes` (external)

Executes an arbitrary command on an NFT Wallet




### `executeForBasket(address contractAddress, uint256 tokenId, string basketManagerId, address externalAddress, bytes encodedParams) → bytes` (external)

Executes an arbitrary command on an NFT Basket




### `withdrawWalletRewards(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address rewardsToken, uint256 rewardsAmount) → uint256 amountWithdrawn` (external)





### `withdrawBasketRewards(address receiver, address contractAddress, uint256 tokenId, string basketManagerId, address rewardsToken, uint256 rewardsAmount) → uint256 amountWithdrawn` (external)





### `refreshWalletPrincipal(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken)` (external)





### `setChargedManagers(address chargedManagers)` (external)



Setup the ChargedManagers Interface

### `setTokenInfoProxy(address tokenInfoProxy)` (external)



Setup the ChargedManagers Interface

### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)






