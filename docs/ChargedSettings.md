## `ChargedSettings`

Charged Particles Settings Contract



### `onlyValidExternalContract(address contractAddress)`





### `onlyContractOwnerOrAdmin(address contractAddress, address sender)`






### `isContractOwner(address contractAddress, address account) → bool` (external)

Checks if an Account is the Owner of an NFT Contract
   When Custom Contracts are registered, only the "owner" or operator of the Contract
   is allowed to register them and define custom rules for how their tokens are "Charged".
   Otherwise, any token can be "Charged" according to the default rules of Charged Particles.




### `isWalletManagerEnabled(string walletManagerId) → bool` (external)





### `getWalletManager(string walletManagerId) → contract IWalletManager` (external)





### `isNftBasketEnabled(string basketId) → bool` (external)





### `getBasketManager(string basketId) → contract IBasketManager` (external)





### `getCreatorAnnuities(address contractAddress, uint256 tokenId) → address creator, uint256 annuityPct` (external)



Gets the amount of creator annuities reserved for the creator for the specified NFT


### `getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) → address` (external)





### `getTempLockExpiryBlocks() → uint256` (external)





### `getTimelockApprovals(address operator) → bool timelockAny, bool timelockOwn` (external)





### `getAssetRequirements(address contractAddress, address assetToken) → string requiredWalletManager, bool energizeEnabled, bool restrictedAssets, bool validAsset, uint256 depositCap, uint256 depositMin, uint256 depositMax` (external)





### `getNftAssetRequirements(address contractAddress, address nftTokenAddress) → string requiredBasketManager, bool basketEnabled, uint256 maxNfts` (external)





### `setCreatorAnnuities(address contractAddress, uint256 tokenId, address creator, uint256 annuityPercent)` (external)

Sets the Custom Configuration for Creators of Proton-based NFTs




### `setCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId, address creator, address receiver)` (external)

Sets a Custom Receiver Address for the Creator Annuities




### `setTrustedForwarder(address _trustedForwarder)` (external)





### `setRequiredWalletManager(address contractAddress, string walletManager)` (external)

Sets a Required Wallet-Manager for External NFT Contracts (otherwise set to "none" to allow any Wallet-Manager)




### `setRequiredBasketManager(address contractAddress, string basketManager)` (external)

Sets a Required Basket-Manager for External NFT Contracts (otherwise set to "none" to allow any Basket-Manager)




### `setAssetTokenRestrictions(address contractAddress, bool restrictionsEnabled)` (external)

Enables or Disables Asset-Token Restrictions for External NFT Contracts




### `setAllowedAssetToken(address contractAddress, address assetToken, bool isAllowed)` (external)

Enables or Disables Allowed Asset Tokens for External NFT Contracts




### `setAssetTokenLimits(address contractAddress, address assetToken, uint256 depositMin, uint256 depositMax)` (external)

Sets the Custom Configuration for External Contracts




### `setMaxNfts(address contractAddress, address nftTokenAddress, uint256 maxNfts)` (external)

Sets the Max Number of NFTs that can be held by a Charged Particle NFT




### `setDepositCap(address assetToken, uint256 cap)` (external)





### `setTempLockExpiryBlocks(uint256 numBlocks)` (external)





### `registerWalletManager(string walletManagerId, address walletManager)` (external)



Register Contracts as wallet managers with a unique liquidity provider ID

### `registerBasketManager(string basketId, address basketManager)` (external)



Register Contracts as basket managers with a unique basket ID

### `enableNftContracts(address[] contracts)` (external)





### `setPermsForCharge(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can be Charged

### `setPermsForBasket(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can hold other NFTs

### `setPermsForTimelockAny(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can Timelock any NFT for Front-run Protection

### `setPermsForTimelockSelf(address contractAddress, bool state)` (external)



Update the list of NFT contracts that can Timelock their own tokens

### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_isWalletManagerEnabled(string walletManagerId) → bool` (internal)



See {ChargedParticles-isWalletManagerEnabled}.

### `_isNftBasketEnabled(string basketId) → bool` (internal)



See {ChargedParticles-isNftBasketEnabled}.

### `_setPermsForCharge(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can be Charged

### `_setPermsForBasket(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can hold other NFTs

### `_setPermsForTimelockAny(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can Timelock any NFT for Front-run Protection

### `_setPermsForTimelockSelf(address contractAddress, bool state)` (internal)



Update the list of NFT contracts that can Timelock their own tokens

### `_msgSender() → address payable` (internal)



See {BaseRelayRecipient-_msgSender}.

### `_msgData() → bytes` (internal)



See {BaseRelayRecipient-_msgData}.


