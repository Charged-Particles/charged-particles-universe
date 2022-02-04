## `ChargedSettings`

Charged Particles Settings Contract



### `onlyValidExternalContract(address contractAddress)`





### `onlyContractOwnerOrAdmin(address contractAddress, address sender)`






### `initialize(address initiator)` (public)





### `getCreatorAnnuities(address contractAddress, uint256 tokenId) → address creator, uint256 annuityPct` (external)



Gets the amount of creator annuities reserved for the creator for the specified NFT


### `getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) → address` (external)





### `getTempLockExpiryBlocks() → uint256` (external)





### `getTimelockApprovals(address operator) → bool timelockAny, bool timelockOwn` (external)





### `getAssetRequirements(address contractAddress, address assetToken) → string requiredWalletManager, bool energizeEnabled, bool restrictedAssets, bool validAsset, uint256 depositCap, uint256 depositMin, uint256 depositMax, bool invalidAsset` (external)





### `getNftAssetRequirements(address contractAddress, address nftTokenAddress) → string requiredBasketManager, bool basketEnabled, uint256 maxNfts` (external)





### `setCreatorAnnuities(address contractAddress, uint256 tokenId, address creator, uint256 annuityPercent)` (external)

Sets a custom configuration for the Creator Annuities of a Proton-based NFT




### `setCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId, address receiver)` (external)

Sets a custom receiver address for the Creator Annuities




### `setRequiredWalletManager(address contractAddress, string walletManager)` (external)

Sets a required Wallet Manager for External NFT contracts (otherwise set to "none" to allow any Wallet Manager)




### `setRequiredBasketManager(address contractAddress, string basketManager)` (external)

Sets a required Basket Manager for External NFT contracts (otherwise set to "none" to allow any Basket Manager)




### `setAssetTokenRestrictions(address contractAddress, bool restrictionsEnabled)` (external)

Enables or disables asset token restrictions for External NFT contracts




### `setAllowedAssetToken(address contractAddress, address assetToken, bool isAllowed)` (external)

Enables or disables allowed asset tokens for External NFT contracts




### `setAssetTokenLimits(address contractAddress, address assetToken, uint256 depositMin, uint256 depositMax)` (external)

Sets the custom configuration for External contracts




### `setMaxNfts(address contractAddress, address nftTokenAddress, uint256 maxNfts)` (external)

Sets the maximum number of NFTs that can be held by a Charged Particle NFT




### `setController(address controller, string controllerId)` (external)



Setup the various Charged-Controllers

### `setTrustedForwarder(address _trustedForwarder)` (external)





### `setAssetInvalidity(address assetToken, bool invalidity)` (external)





### `setDepositCap(address assetToken, uint256 cap)` (external)





### `setTempLockExpiryBlocks(uint256 numBlocks)` (external)





### `enableNftContracts(address[] contracts)` (external)





### `migrateToken(address contractAddress, uint256 tokenId, address creator, uint256 annuityPercent, address annuityReceiver)` (external)





### `setPermsForCharge(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can be Charged

### `setPermsForBasket(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can hold other NFTs

### `setPermsForTimelockAny(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can Timelock any NFT for front-running protection

### `setPermsForTimelockSelf(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can Timelock their own tokens

### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)





### `_setPermsForCharge(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can be Charged

### `_setPermsForBasket(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can hold other NFTs

### `_setPermsForTimelockAny(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can Timelock any NFT for front-running protection

### `_setPermsForTimelockSelf(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can Timelock their own tokens

### `_setCreatorAnnuities(address contractAddress, uint256 tokenId, address creator, uint256 annuityPercent)` (internal)



see setCreatorAnnuities()

### `_setCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId, address receiver)` (internal)



see setCreatorAnnuitiesRedirect()

### `_msgSender() → address payable` (internal)



See {BaseRelayRecipient-_msgSender}.

### `_msgData() → bytes` (internal)



See {BaseRelayRecipient-_msgData}.


