## `Universe`

Charged Particles Universe Contract


Upgradeable Contract

### `onlyValidContractAddress(address account)`



Throws if called by any non-account

### `onlyChargedParticles()`



Throws if called by any account other than the Charged Particles contract

### `onlyProton()`



Throws if called by any account other than the Proton NFT contract


### `initialize()` (public)





### `getStaticCharge(address account) → uint256 positiveEnergy` (external)





### `conductElectrostaticDischarge(address account, uint256 amount) → uint256 positiveEnergy` (external)





### `onEnergize(address sender, address referrer, address, uint256, string, address, uint256)` (external)





### `onDischarge(address contractAddress, uint256 tokenId, string, address assetToken, uint256 creatorEnergy, uint256 receiverEnergy)` (external)





### `onDischargeForCreator(address contractAddress, uint256 tokenId, string, address, address assetToken, uint256 receiverEnergy)` (external)





### `onRelease(address contractAddress, uint256 tokenId, string, address assetToken, uint256 principalAmount, uint256 creatorEnergy, uint256 receiverEnergy)` (external)





### `onCovalentBond(address contractAddress, uint256 tokenId, string, address nftTokenAddress, uint256 nftTokenId)` (external)





### `onCovalentBreak(address contractAddress, uint256 tokenId, string, address nftTokenAddress, uint256)` (external)





### `onProtonSale(address contractAddress, uint256 tokenId, address oldOwner, address newOwner, uint256 salePrice, address creator, uint256 creatorRoyalties)` (external)





### `setChargedParticles(address controller)` (external)





### `setPhoton(address token, uint256 maxSupply)` (external)





### `setProtonToken(address token)` (external)





### `setLeptonToken(address token)` (external)





### `setQuarkToken(address token)` (external)





### `setBosonToken(address token)` (external)





### `setEsaMultiplier(address assetToken, uint256 multiplier)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_electrostaticAttraction(uint256 tokenUuid, address receiver, address assetToken, uint256 baseAmount)` (internal)





### `_conductElectrostaticDischarge(address account, uint256 energy) → uint256` (internal)






