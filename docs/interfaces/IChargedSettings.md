## `IChargedSettings`

Interface for Charged Settings




### `isContractOwner(address contractAddress, address account) → bool` (external)





### `getCreatorAnnuities(address contractAddress, uint256 tokenId) → address creator, uint256 annuityPct` (external)





### `getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) → address` (external)





### `getTempLockExpiryBlocks() → uint256` (external)





### `getTimelockApprovals(address operator) → bool timelockAny, bool timelockOwn` (external)





### `getAssetRequirements(address contractAddress, address assetToken) → string requiredWalletManager, bool energizeEnabled, bool restrictedAssets, bool validAsset, uint256 depositCap, uint256 depositMin, uint256 depositMax` (external)





### `getNftAssetRequirements(address contractAddress, address nftTokenAddress) → string requiredBasketManager, bool basketEnabled, uint256 maxNfts` (external)





### `isWalletManagerEnabled(string walletManagerId) → bool` (external)





### `getWalletManager(string walletManagerId) → contract IWalletManager` (external)





### `isNftBasketEnabled(string basketId) → bool` (external)





### `getBasketManager(string basketId) → contract IBasketManager` (external)





### `setCreatorAnnuities(address contractAddress, uint256 tokenId, address creator, uint256 annuityPercent)` (external)





### `setCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId, address creator, address receiver)` (external)





### `setRequiredWalletManager(address contractAddress, string walletManager)` (external)





### `setRequiredBasketManager(address contractAddress, string basketManager)` (external)





### `setAssetTokenRestrictions(address contractAddress, bool restrictionsEnabled)` (external)





### `setAllowedAssetToken(address contractAddress, address assetToken, bool isAllowed)` (external)





### `setAssetTokenLimits(address contractAddress, address assetToken, uint256 depositMin, uint256 depositMax)` (external)





### `setMaxNfts(address contractAddress, address nftTokenAddress, uint256 maxNfts)` (external)





### `enableNftContracts(address[] contracts)` (external)





### `setPermsForCharge(address contractAddress, bool state)` (external)





### `setPermsForBasket(address contractAddress, bool state)` (external)





### `setPermsForTimelockAny(address contractAddress, bool state)` (external)





### `setPermsForTimelockSelf(address contractAddress, bool state)` (external)






### `DepositCapSet(address assetToken, uint256 depositCap)`





### `TempLockExpirySet(uint256 expiryBlocks)`





### `WalletManagerRegistered(string walletManagerId, address walletManager)`





### `BasketManagerRegistered(string basketId, address basketManager)`





### `RequiredWalletManagerSet(address contractAddress, string walletManager)`





### `RequiredBasketManagerSet(address contractAddress, string basketManager)`





### `AssetTokenRestrictionsSet(address contractAddress, bool restrictionsEnabled)`





### `AllowedAssetTokenSet(address contractAddress, address assetToken, bool isAllowed)`





### `AssetTokenLimitsSet(address contractAddress, address assetToken, uint256 assetDepositMin, uint256 assetDepositMax)`





### `MaxNftsSet(address contractAddress, address nftTokenAddress, uint256 maxNfts)`





### `TokenCreatorConfigsSet(address contractAddress, uint256 tokenId, address creatorAddress, uint256 annuityPercent)`





### `TokenCreatorAnnuitiesRedirected(address contractAddress, uint256 tokenId, address redirectAddress)`





### `PermsSetForCharge(address contractAddress, bool state)`





### `PermsSetForBasket(address contractAddress, bool state)`





### `PermsSetForTimelockAny(address contractAddress, bool state)`





### `PermsSetForTimelockSelf(address contractAddress, bool state)`





