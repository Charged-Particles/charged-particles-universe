## `ISmartWallet`



Manages holding and transferring assets of an NFT to a specific LP for Yield (if any),


### `getAssetTokenCount() → uint256` (external)





### `getAssetTokenByIndex(uint256 index) → address` (external)





### `setNftCreator(address creator, uint256 annuityPct)` (external)





### `isReserveActive(address assetToken) → bool` (external)





### `getReserveInterestToken(address assetToken) → address` (external)





### `getPrincipal(address assetToken) → uint256` (external)





### `getInterest(address assetToken) → uint256 creatorInterest, uint256 ownerInterest` (external)





### `getTotal(address assetToken) → uint256` (external)





### `getRewards(address assetToken) → uint256` (external)





### `deposit(address assetToken, uint256 assetAmount, uint256 referralCode) → uint256` (external)





### `withdraw(address receiver, address creatorRedirect, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawAmount(address receiver, address creatorRedirect, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `withdrawAmountForCreator(address receiver, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)





### `withdrawRewards(address receiver, address rewardsToken, uint256 rewardsAmount) → uint256` (external)





### `executeForAccount(address contractAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)






