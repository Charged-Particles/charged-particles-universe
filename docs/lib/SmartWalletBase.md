## `SmartWalletBase`

ERC20-Token Smart-Wallet Base Contract


Non-upgradeable Contract

### `onlyWalletManager()`



Throws if called by any account other than the wallet manager


### `initializeBase()` (public)





### `getAssetTokenCount() → uint256` (external)





### `getAssetTokenByIndex(uint256 index) → address` (external)





### `setNftCreator(address creator, uint256 annuityPct)` (external)





### `executeForAccount(address contractAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `refreshPrincipal(address assetToken)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_getPrincipal(address assetToken) → uint256` (internal)





### `_trackAssetToken(address assetToken)` (internal)






