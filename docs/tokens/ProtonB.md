## `ProtonB`





### `whenNotPaused()`





### `onlyTokenOwnerOrApproved(uint256 tokenId)`





### `onlyTokenCreator(uint256 tokenId)`






### `creatorOf(uint256 tokenId) → address` (external)





### `getSalePrice(uint256 tokenId) → uint256` (external)





### `getLastSellPrice(uint256 tokenId) → uint256` (external)





### `getCreatorRoyalties(address account) → uint256` (external)





### `getCreatorRoyaltiesPct(uint256 tokenId) → uint256` (external)





### `getCreatorRoyaltiesReceiver(uint256 tokenId) → address` (external)





### `claimCreatorRoyalties() → uint256` (external)





### `createChargedParticle(address creator, address receiver, address referrer, string tokenMetaUri, string walletManagerId, address assetToken, uint256 assetAmount, uint256 annuityPercent) → uint256 newTokenId` (external)





### `createBasicProton(address creator, address receiver, string tokenMetaUri) → uint256 newTokenId` (external)





### `createProton(address creator, address receiver, string tokenMetaUri, uint256 annuityPercent) → uint256 newTokenId` (external)





### `createProtonForSale(address creator, address receiver, string tokenMetaUri, uint256 annuityPercent, uint256 royaltiesPercent, uint256 salePrice) → uint256 newTokenId` (external)





### `batchProtonsForSale(address creator, uint256 annuityPercent, uint256 royaltiesPercent, string[] tokenMetaUris, uint256[] salePrices)` (external)





### `buyProton(uint256 tokenId, uint256 gasLimit) → bool` (external)





### `setSalePrice(uint256 tokenId, uint256 salePrice)` (external)





### `setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct)` (external)





### `setCreatorRoyaltiesReceiver(uint256 tokenId, address receiver)` (external)





### `setPausedState(bool state)` (external)





### `setUniverse(address universe)` (external)



Setup the ChargedParticles Interface

### `setChargedParticles(address chargedParticles)` (external)



Setup the ChargedParticles Interface

### `setChargedState(address stateController)` (external)



Setup the Charged-State Controller

### `setChargedSettings(address settings)` (external)



Setup the Charged-Settings Controller

### `setTrustedForwarder(address _trustedForwarder)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_setSalePrice(uint256 tokenId, uint256 salePrice)` (internal)





### `_setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct)` (internal)





### `_creatorRoyaltiesReceiver(uint256 tokenId) → address` (internal)





### `_createChargedParticle(address creator, address receiver, address referrer, string tokenMetaUri, string walletManagerId, address assetToken, uint256 assetAmount, uint256 annuityPercent) → uint256 newTokenId` (internal)





### `_createProton(address creator, address receiver, string tokenMetaUri, uint256 annuityPercent, uint256 royaltiesPercent, uint256 salePrice) → uint256 newTokenId` (internal)





### `_batchProtonsForSale(address creator, uint256 annuityPercent, uint256 royaltiesPercent, string[] tokenMetaUris, uint256[] salePrices)` (internal)





### `_chargeParticle(uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, address referrer)` (internal)





### `_buyProton(uint256 tokenId, uint256 gasLimit) → bool` (internal)





### `_claimCreatorRoyalties(address receiver) → uint256` (internal)



Pays out the Creator Royalties of the calling account


### `_collectAssetToken(address from, address assetToken, uint256 assetAmount)` (internal)



Collects the Required Asset Token from the users wallet


### `_refundOverpayment(uint256 threshold, uint256 gasLimit)` (internal)





### `_transfer(address from, address to, uint256 tokenId)` (internal)





### `_msgSender() → address payable` (internal)



See {BaseRelayRecipient-_msgSender}.

### `_msgData() → bytes` (internal)



See {BaseRelayRecipient-_msgData}.


