# ChargedParticles

> Charged Particles Contract - primary contract for interfacing with the Charged Particles protocol.

## Contract Info
#### getStateAddress

`function getStateAddress() external view virtual override returns (address stateAddress);`

Gets the address of the Charged-State contract, which can be used for setting and retrieving additional information about a Particle (NFT) contract. E.g. time locks on particle mass (principal) or charge (interest).

| Parameter/Return Value  | Description                      |
|-------------------------|----------------------------------|
| settingsAddress         | address of Charged State contract|

#### getSettingsAddress

`functiongetSettingsAddress() external view virtual override returns (address settingsAddress);`

Gets the address of the ChargedSettings contract, which can be used for setting and retrieving the settings of the ChargedParticles contract. E.g. Creator annuity.

When Custom Contracts are registered, only the "owner" or operator of the Contract is allowed to register them and define custom rules for how their tokens are "Charged". Otherwise, any token can be "Charged" according to the default rules of Charged Particles.

| Parameter/Return Value  | Description                              |
|-------------------------|------------------------------------------|
| settingsAddress         | address of Charged Settings contract     |

#### onERC721Received

```
function onERC721Received(
  address, 
  address,
  uint256, 
  bytes calldata
) external virtual override returns (bytes4);
```
## Reading Particle balances

#### baseParticleMass

Gets the amount of Mass (principal) for a Particle for a single asset token. E.g. Returns the amount of USDC deposited into a Particle less earned interest.

```
function baseParticleMass(
  address contractAddress, 
  uint256 tokenId, 
  string walletManagerId,
  address assetToken
) external virtual override managerEnabled(walletManagerId) returns (uint256);
```

| Parameter/Return Value  | Description                                       |
|-------------------------|---------------------------------------------------|
| contractAddress         | Charged Particles contract address                |
| tokenId                 | id of Particle                                    |
| walletManagerId         | id of Wallet Manager for yield source             |
| assetToken              | address of token to get mass of e.g. DAI          |
| return                  | Amount of underlying Assets held within the Token |

#### currentParticleCharge

Gets the amount of Interest that the Particle has generated representing the Charge (interest) of the Particle.

```
function currentParticleCharge(
  address contractAddress,
  uint256 tokenId,
  string walletManagerId, 
  address assetToken
) external virtual override managerEnabled(walletManagerId) (uint256);
```
| Parameter/Return Value  | Description                                                    |
|-------------------------|----------------------------------------------------------------|
| contractAddress         | contract address for Particle                                  |
| tokenId                 | id of Particle                                                 |
| walletManagerId         | id of Wallet Manager for yield source (e.g. Aave)              |
| assetToken              | address of asset token to check (e.g. DAI)                     |
| return                  | The amount of interest the Token has generated (in asset token)|


#### currentParticleKinetics

Gets the amount of LP Tokens that the Particle has generated representing the Kinetics of the Particle. 

Kinetics represent additional tokens that a lending protocol provides users in addition to the interest-bearing asset. For example, when a user deposits into Compound, they receive a [cToken](https://compound.finance/docs/ctokens) representing their interest-bearing position, as well as [COMP tokens](https://compound.finance/docs/governance#comp). COMP tokens are the Kinetics in this example.

```
function currentParticleKinetics(
  address contractAddress,
  uint256 tokenId,
  string walletManagerId,
  address assetToken
) external virtual override managerEnabled(walletManagerId) (uint256);
```

| Parameter/Return Value  | Description                                        |
|-------------------------|----------------------------------------------------|
| contractAddress         | contract address for Particle                      |
| tokenId                 | id of Particle                                     |
| walletManagerId         | id of BasketManager to check the token balance of  |
| return                  | total amount of LP tokens that have been generated |

#### currentParticleCovalentBonds

Gets the total amount of ERC721 Tokens that the Particle holds.

```
function currentParticleCovalentBonds(
  address contractAddress,
  uint256 tokenId,
  string basketManagerId
) external view virtual override basketEnabled(basketManagerId) returns (uint256);
```

| Parameter/Return Value  | Description                                        |
|-------------------------|----------------------------------------------------|
| contractAddress         | contract address for Particle                      |
| tokenId                 | id of Particle                                     |
| basektManagerId         | id of BasketManager to check the token balance of  |
| return                  | total amount of ERC721 tokens held within particle |

## Charge & Discharge Particles 

 > _Deposit Principal and Withdraw Interest from Particles_
 
#### energizeParticle

Fund Particle with Asset Token. Must be called by the account providing the Asset. Account must Approve THIS contract as Operator of Asset.

**IMPORTANT**: *DO NOT Energize an ERC20 Token, as anyone who holds any amount of the same ERC20 token could discharge or release the funds. All holders of the ERC20 token would essentially be owners of the Charged Particle.*

```
function energizeParticle(
  address contractAddress,
  uint256 tokenId,
  string walletManagerId,
  address assetToken,
  uint256 assetAmount,
  address referrer
) external virtual override managerEnabled(walletManagerId nonReentrant returns (uint256 yieldTokensAmount);
```

| Parameter/Return Value  | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| contractAddress         | contract address for Particle                                |
| tokenId                 | id of Particle                                               |
| walletManagerId         | asset-pair to energize token with                            |
| assetToken              | address of asset-token being used (e.g. DAI)                 |
| assetAmount             | amount of asset token to energize token with                 |
| yieldTokensAmount       | amount of yield-bearing tokens added to escrow for the token |

#### dischargeParticle

Allows the owner or operator of the Particle to collect or transfer the Charge (interest) generated from the token without removing the Mass (principal) of the underlying asset held within the token.

```
function dischargeParticle(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string walletManagerId,
  address assetToken
) external virtual override managerEnabled(walletManagerId) nonReentrant returns (uint256 creatorAmount, uint256 receiverAmount);`
```

| Parameter/Return Value  | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| receiver                | address to receive discharged asset                          |
| contractAddress         | contract address for Particle                                |
| tokenId                 | id of Particle                                               |
| walletManagerId         | wallet manager of assets to discharge from token (e.g. Aave) |
| assetToken              | address of asset-token being discharged (e.g. DAI)           |
| creatorAmount           | amount of asset token to discharge for creator               |
| receiverAmount          | amount of asset token to discharge for receiver              |

#### dischargeParticleAmount

Allows the owner or operator of the Particle to collect or transfer a specific amount of the interest generated from the token without removing the Mass (principal) of the underlying asset held within the token.

```
function dischargeParticleAmount(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount
) external virtual override managerEnabled(walletManagerId) nonReentrant returns (uint256 creatorAmount, uint256 receiverAmount);
```

| Parameter/Return Value  | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| receiver                | address to receive discharged asset                          |
| contractAddress         | contract address for Particle                                |
| tokenId                 | id of Particle                                               |
| walletManagerId         | wallet manager of assets to discharge from token (e.g. Aave) |
| assetToken              | address of asset-token being discharged (e.g. DAI)           |
| assetAmount             | specific amount of asset token to discharge                  |
| creatorAmount           | amount of asset token to discharge for creator               |
| receiverAmount          | amount of asset token to discharge for receiver              |

#### dischargeParticleForCreator

Allows the Creator of the Particle to collect or transfer a their portion of the Charge (interest) generated from the token without removing the underlying Mass (principal) held within the token.

```
function dischargeParticleForCreator(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string walletManagerId,
  address assetToken,
  uint256 assetAmount
)  external virtual override managerEnabled(walletMangerId) nonReentrant returns (uint256 receiverAmount);
```

| Parameter/Return Value  | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| receiver                | address to receive discharged asset                          |
| contractAddress         | contract address for Particle                                |
| tokenId                 | id of Particle                                               |
| walletManagerId         | wallet manager of assets to discharge from token (e.g. Aave) |
| assetToken              | address of asset-token being discharged (e.g. DAI)           |
| assetAmount             | specific amount of asset token to discharge                  |
| receiverAmount          | amount of asset token to discharge for receiver              |

## Release Particles

> _Withdraw principal from particles_

#### releaseParticle

Releases the Full amount of Mass + Charge (principal + interest) held within the Particle by LP of the Assets.

```
function releaseParticle(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string walletManagerId,
  address assetToken
) external virtual override managerEnabled(walletMangerId) nonReentrant returns (uint256 creatorAmount, uint256 receiverAmount)
```

| Parameter/Return Value  | Description                                                              |
|-------------------------|--------------------------------------------------------------------------|
| receiver                | address to receive released asset tokens                                 |
| contractAddress         | contract address for Particle                                            |
| tokenId                 | id of Particle                                                           |
| walletManagerId         | wallet manager of assets to discharge from token (e.g. Aave)             |
| assetToken              | address of asset-token being released (e.g. DAI)                         |
| creatorAmount           | amount of asset token released to creator                                |
| receiverAmount          | amount of asset token to released to receiver (includes principalAmount) |

#### releaseParticleAmount

Releases a partial amount of Mass + Charge (principal + interest) held within the Particle by LP of the Assets.

```
function releaseParticleAmount(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string walletManagerId,
  address assetToken
) external virtual override managerEnabled(walletMangerId) nonReentrant returns (uint256 creatorAmount, uint256 receiverAmount)
```

| Parameter/Return Value  | Description                                                              |
|-------------------------|--------------------------------------------------------------------------|
| receiver                | address to receive released asset tokens                                 |
| contractAddress         | contract address for Particle                                            |
| tokenId                 | id of Particle                                                           |
| walletManagerId         | wallet manager of assets to discharge from token (e.g. Aave)             |
| assetToken              | address of asset-token being released (e.g. DAI)                         |
| assetAmount             | the specific amount of asset token to release from the Particle          |
| creatorAmount           | amount of asset token released to creator                                |
| receiverAmount          | amount of asset token to released to receiver (includes principalAmount) |

## Covalent Bonding

> _Deposit & Withdraw ERC721s from a Particle_

#### covalentBond


Deposit other NFT Assets into a Particle. Must be called by the account providing the Asset. Account must Approve THIS contract as Operator of Asset.

```
function covalentBond(
  address contractAddress,
  uint256 tokenId,
  string basketManagerId,
  address nftTokenAddress,
  uint256 nftTokenId
) external virtual override basketEnabled(basketManagerId) nonReentrant returns (bool success)
```

| Parameter/Return Value  | Description                                     |
|-------------------------|-------------------------------------------------|
| contractAddress         | contract address for Particle                   |
| tokenId                 | id of Particle                                  |
| basketManagerId         | the basket to deposit the NFT into              |
| nftTokenAddress         | the address of the NFT token being deposited    |
| nftTokenId              | the id of the NFT token being deposited         |

#### breakCovalentBond

Release NFT Assets from the Particle.

```
function breakCovalentBond(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata basketManagerId,
  address nftTokenAddress,
  uint256 nftTokenId
) external virtual override basketEnabled(basketManagerId) nonReentrant returns (bool success)
```

| Parameter/Return Value  | Description                                 |
|-------------------------|---------------------------------------------|
| receiver                | the address to receive the released NFTs    |
| contractAddress         | contract address for Particle               |
| tokenId                 | id of Particle                              |
| basketManagerId         | the basket to deposit the NFT into          |
| nftTokenAddress         | the address of the NFT token being released |
| nftTokenId              | the id of the NFT token being released      |