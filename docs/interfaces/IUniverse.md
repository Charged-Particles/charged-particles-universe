## `IUniverse`



...


### `onEnergize(address sender, address referrer, address contractAddress, uint256 tokenId, string managerId, address assetToken, uint256 assetEnergy)` (external)





### `onDischarge(address contractAddress, uint256 tokenId, string managerId, address assetToken, uint256 creatorEnergy, uint256 receiverEnergy)` (external)





### `onDischargeForCreator(address contractAddress, uint256 tokenId, string managerId, address creator, address assetToken, uint256 receiverEnergy)` (external)





### `onRelease(address contractAddress, uint256 tokenId, string managerId, address assetToken, uint256 principalEnergy, uint256 creatorEnergy, uint256 receiverEnergy)` (external)





### `onCovalentBond(address contractAddress, uint256 tokenId, string managerId, address nftTokenAddress, uint256 nftTokenId)` (external)





### `onCovalentBreak(address contractAddress, uint256 tokenId, string managerId, address nftTokenAddress, uint256 nftTokenId)` (external)





### `onProtonSale(address contractAddress, uint256 tokenId, address oldOwner, address newOwner, uint256 salePrice, address creator, uint256 creatorRoyalties)` (external)






### `ChargedParticlesSet(address chargedParticles)`





### `PhotonSet(address photonToken, uint256 maxSupply)`





### `ProtonTokenSet(address protonToken)`





### `LeptonTokenSet(address leptonToken)`





### `QuarkTokenSet(address quarkToken)`





### `BosonTokenSet(address bosonToken)`





### `EsaMultiplierSet(address assetToken, uint256 multiplier)`





### `ElectrostaticAttraction(address account, address photonSource, uint256 energy, uint256 multiplier)`





### `ElectrostaticDischarge(address account, address photonSource, uint256 energy)`





