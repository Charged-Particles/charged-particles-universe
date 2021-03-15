# `ChargedParticles`

Charged Particles Contract - primary contract for interfacing with the Charged Particles protocol.
### `getStateAddress() → address stateAddress` (external)

Gets the address of the Charged-State contract, which can be used for setting and retrieving additional information about a Particle (NFT) contract. E.g. time locks on particle mass (principal) or charge (interest).

### `getSettingsAddress() → address settingsAddress` (external)

Gets the address of the ChargedSettings contract, which can be used for setting and retrieving the settings of the ChargedParticles contract. E.g. Creator annuity.

When Custom Contracts are registered, only the "owner" or operator of the Contract is allowed to register them and define custom rules for how their tokens are "Charged". Otherwise, any token can be "Charged" according to the default rules of Charged Particles.

### `onERC721Received(address, address, uint256, bytes) → bytes4` (external)

Gets the Amount of Asset Tokens that have been Deposited into the Particle representing the Mass (principal) of the Particle.

### `baseParticleMass(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

```
baseParticleMass(
        address contractAddress, 
        uint256 tokenId, 
        string walletManagerId,
        address assetToken
) external returns (uint256)
```

Gets the amount of Mass (principal) for a Particle for a single asset token. E.g. Returns the amount of USDC deposited into a Particle less earned interest.

### `currentParticleCharge(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

Gets the amount of Interest that the Particle has generated representing the Charge (interest) of the Particle.

### `currentParticleKinetics(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

Gets the amount of LP Tokens that the Particle has generated representing the Kinetics of the Particle. 

Kinetics represent additional tokens that a lending protocol provides users in addition to the interest-bearing asset. For example, when a user deposits into Compound, they receive a [cToken](https://compound.finance/docs/ctokens) representing their interest-bearing position, as well as [COMP tokens](https://compound.finance/docs/governance#comp). COMP tokens are the Kinetics in this example.

### `currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string basketManagerId) → uint256` (external)

Gets the total amount of ERC721 Tokens that the Particle holds.

### `energizeParticle(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, address referrer) → uint256 yieldTokensAmount` (external)

Fund Particle with Asset Token. Must be called by the account providing the Asset. Account must Approve THIS contract as Operator of Asset.

**IMPORTANT**: *DO NOT Energize an ERC20 Token, as anyone who holds any amount of the same ERC20 token could discharge or release the funds. All holders of the ERC20 token would essentially be owners of the Charged Particle.*

### `dischargeParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)

Allows the owner or operator of the Particle to collect or transfer the Charge (interest) generated from the token without removing the Mass (principal) of the underlying asset held within the token.

### `dischargeParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)

Allows the owner or operator of the Particle to collect or transfer a specific amount of the interest generated from the token without removing the Mass (principal) of the underlying asset held within the token.

### `dischargeParticleForCreator(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)

Allows the Creator of the Particle to collect or transfer a their portion of the Charge (interest) generated from the token without removing the underlying Mass (principal) held within the token.

### `releaseParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)

Releases the Full amount of Mass + Charge (principal + interest) held within the Particle by LP of the Assets.

### `releaseParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)

Releases a partial amount of Mass + Charge (principal + interest) held within the Particle by LP of the Assets.

### `covalentBond(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)

Deposit other NFT Assets into a Particle. Must be called by the account providing the Asset.Account must Approve THIS contract as Operator of Asset.

### `breakCovalentBond(address receiver, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)

Release NFT Assets from the Particle.

---

## Admin / DAO functions -- exclude?

### `withdrawEther(address payable receiver, uint256 amount)` (external)


### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)

Withdraw an ERC20 from a Particle.

### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)

Withdraw an ERC721 from a Particle.

### `setChargedSettings(address settingsController)` (external)

Setup the Charged-Settings Controller.

### `setChargedState(address stateController)` (external)

Setup the Charged-State Controller.

### `setUniverse(address universe)` (external)

Setup the Universal Controller.

### `setTrustedForwarder(address _trustedForwarder)` (external)

---

## Non-External functions -- exclude?

### `managerEnabled(string walletManagerId)`

### `basketEnabled(string basketManagerId)`

### `initialize(address _trustedForwarder)` (public)

### `_validateDeposit(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount)` (internal)

Validates a Deposit according to the rules set by the Token Contract.

### `_validateDepositAmount(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, uint256 depositCap, uint256 depositMin, uint256 depositMax)` (internal)

Validates a Deposit-Amount according to the rules set by the Token Contract

### `_validateNftDeposit(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId)` (internal)

Validates an NFT Deposit according to the rules set by the Token Contract

### `_validateDischarge(address contractAddress, uint256 tokenId)` (internal)

### `_validateRelease(address contractAddress, uint256 tokenId)` (internal)

### `_validateBreakBond(address contractAddress, uint256 tokenId)` (internal)

### `_validateState(bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry)` (internal)

### `_depositIntoWalletManager(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256` (internal)

Deposit Asset Tokens into an NFT via the Wallet Manager.

### `_depositIntoBasketManager(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool` (internal)

Deposit NFT Tokens into the Basket Manager.

### `_collectAssetToken(address from, address tokenAddress, uint256 tokenAmount)` (internal)

Collects the Required ERC20 Token(s) from the users wallet. Be sure to Approve this Contract to transfer your Token(s).

### `_collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId)` (internal)

Collects the Required ERC721 Token(s) from the users wallet. Be sure to Approve this Contract to transfer your Token(s).

### `_baseParticleMass(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (internal)

See {ChargedParticles-baseParticleMass}.

### `_currentParticleCharge(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (internal)

See {ChargedParticles-currentParticleCharge}.

### `_currentParticleKinetics(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (internal)

See {ChargedParticles-currentParticleKinetics}.

### `_currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string basketManagerId) → uint256` (internal)

See {ChargedParticles-currentParticleCovalentBonds}.

### `_msgSender() → address payable` (internal)

See {BaseRelayRecipient-_msgSender}.

### `_msgData() → bytes` (internal)

See {BaseRelayRecipient-_msgData}.
