## `IProtonB`






### `creatorOf(uint256 tokenId) → address` (external)





### `getSalePrice(uint256 tokenId) → uint256` (external)





### `getLastSellPrice(uint256 tokenId) → uint256` (external)





### `getCreatorRoyalties(address account) → uint256` (external)





### `getCreatorRoyaltiesPct(uint256 tokenId) → uint256` (external)





### `getCreatorRoyaltiesReceiver(uint256 tokenId) → address` (external)





### `buyProton(uint256 tokenId, uint256 gasLimit) → bool` (external)





### `claimCreatorRoyalties() → uint256` (external)





### `createChargedParticle(address creator, address receiver, address referrer, string tokenMetaUri, string walletManagerId, address assetToken, uint256 assetAmount, uint256 annuityPercent) → uint256 newTokenId` (external)





### `createBasicProton(address creator, address receiver, string tokenMetaUri) → uint256 newTokenId` (external)





### `createProton(address creator, address receiver, string tokenMetaUri, uint256 annuityPercent) → uint256 newTokenId` (external)





### `createProtonForSale(address creator, address receiver, string tokenMetaUri, uint256 annuityPercent, uint256 royaltiesPercent, uint256 salePrice) → uint256 newTokenId` (external)





### `batchProtonsForSale(address creator, uint256 annuityPercent, uint256 royaltiesPercent, string[] tokenMetaUris, uint256[] salePrices)` (external)





### `setSalePrice(uint256 tokenId, uint256 salePrice)` (external)





### `setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct)` (external)





### `setCreatorRoyaltiesReceiver(uint256 tokenId, address receiver)` (external)






### `UniverseSet(address universe)`





### `ChargedStateSet(address chargedState)`





### `ChargedSettingsSet(address chargedSettings)`





### `ChargedParticlesSet(address chargedParticles)`





### `PausedStateSet(bool isPaused)`





### `SalePriceSet(uint256 tokenId, uint256 salePrice)`





### `CreatorRoyaltiesSet(uint256 tokenId, uint256 royaltiesPct)`





### `FeesWithdrawn(address receiver, uint256 amount)`





### `ProtonSold(uint256 tokenId, address oldOwner, address newOwner, uint256 salePrice, address creator, uint256 creatorRoyalties)`





### `RoyaltiesClaimed(address receiver, uint256 amountClaimed)`





