## `IChargedParticles`

Interface for Charged Particles




### `getStateAddress() → address stateAddress` (external)





### `getSettingsAddress() → address settingsAddress` (external)





### `getFeesForDeposit(uint256 assetAmount) → uint256 protocolFee` (external)





### `baseParticleMass(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)





### `currentParticleCharge(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)





### `currentParticleKinetics(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)





### `currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string basketManagerId) → uint256` (external)





### `energizeParticle(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, address referrer) → uint256 yieldTokensAmount` (external)





### `dischargeParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `dischargeParticleForCreator(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)





### `releaseParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `releaseParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)





### `covalentBond(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)





### `breakCovalentBond(address receiver, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)






### `UniverseSet(address universeAddress)`





### `ChargedStateSet(address chargedState)`





### `ChargedSettingsSet(address chargedSettings)`





### `LeptonTokenSet(address leptonToken)`





### `DepositFeeSet(uint256 depositFee)`





### `ProtocolFeesCollected(address assetToken, uint256 depositAmount, uint256 feesCollected)`





