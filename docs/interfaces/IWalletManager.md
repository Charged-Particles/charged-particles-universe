## `IWalletManager`



The wallet-manager for underlying assets attached to Charged Particles
Manages the link between NFTs and their respective Smart-Wallets


### `isPaused() → bool` (external)





### `isReserveActive(address contractAddress, uint256 tokenId, address assetToken) → bool` (external)





### `getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken) → address` (external)





### `getTotal(address contractAddress, uint256 tokenId, address assetToken) → uint256` (external)





### `getPrincipal(address contractAddress, uint256 tokenId, address assetToken) → uint256` (external)





### `getInterest(address contractAddress, uint256 tokenId, address assetToken) → uint256 creatorInterest, uint256 ownerInterest` (external)





### `getRewards(address contractAddress, uint256 tokenId, address rewardToken) → uint256` (external)





### `energize(address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount) → uint256 yieldTokensAmount` (external)





### `discharge(address receiver, address contractAddress, uint256 tokenId, address assetToken, address creatorRedirect) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeAmount(address receiver, address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount, address creatorRedirect) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeAmountForCreator(address receiver, address contractAddress, uint256 tokenId, address creator, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)





### `release(address receiver, address contractAddress, uint256 tokenId, address assetToken, address creatorRedirect) → uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount` (external)





### `releaseAmount(address receiver, address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount, address creatorRedirect) → uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsAmount) → uint256 amount` (external)





### `executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `getWalletAddressById(address contractAddress, uint256 tokenId, address creator, uint256 annuityPct) → address` (external)





### `withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address contractAddress, uint256 tokenId, address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId)` (external)






### `ControllerSet(address controller)`





### `PausedStateSet(bool isPaused)`





### `NewSmartWallet(address contractAddress, uint256 tokenId, address smartWallet, address creator, uint256 annuityPct)`





### `WalletEnergized(address contractAddress, uint256 tokenId, address assetToken, uint256 assetAmount, uint256 yieldTokensAmount)`





### `WalletDischarged(address contractAddress, uint256 tokenId, address assetToken, uint256 creatorAmount, uint256 receiverAmount)`





### `WalletDischargedForCreator(address contractAddress, uint256 tokenId, address assetToken, address creator, uint256 receiverAmount)`





### `WalletReleased(address contractAddress, uint256 tokenId, address receiver, address assetToken, uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)`





### `WalletRewarded(address contractAddress, uint256 tokenId, address receiver, address rewardsToken, uint256 rewardsAmount)`





