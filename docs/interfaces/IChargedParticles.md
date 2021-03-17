# IChargedParticles

## Events

**UniverseSet**
```
event UniverseSet(address indexed universeAddress);
```

**ChargedStateSet**
```
event ChargedStateSet(address indexed chargedState);
```

**ChargedSettingsSet**
```
event ChargedSettingsSet(address indexed chargedSettings);
```

**LeptonTokenSet**
```
event LeptonTokenSet(address indexed leptonToken);
```

## Public API

> ***Get Particle Info***

**getStateAddress**
```
function getStateAddress() external view returns (address stateAddress);
```

**getSettingsAddress**
```
function getSettingsAddress() external view returns (address settingsAddress);
```

**baseParticleMass**
```
function baseParticleMass(
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken
) external returns (uint256);
```

**currentParticleCharge**
```
function currentParticleCharge(
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken
) external returns (uint256);
```

**currentParticleKinetics**
```
function currentParticleKinetics(
  address contractAddress,
  uint256 tokenId, 
  string calldata walletManagerId, 
  address assetToken
) external returns (uint256);
````

**currentParticleCovalentBonds**
```
function currentParticleCovalentBonds(
  address contractAddress,
  uint256 tokenId,
  string calldata basketManagerId
) external view returns (uint256);
```

## Particle Mechanics 

> ***Interact with Particles***

**energizeParticle**
```
function energizeParticle(
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount,
  address referrer
) external returns (uint256 yieldTokensAmount);
```

**dischargeParticle**
```
function dischargeParticle(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**dischargeParticleAmount**
```
function dischargeParticleAmount(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**dischargeParticleForCreator**
```
function dischargeParticleForCreator(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount
) external returns (uint256 receiverAmount);
```

**releaseParticle**
```
function releaseParticle(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**releaseParticleAmount**
```
function releaseParticleAmount(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount
) external returns (uint256 creatorAmount, uint256 receiverAmount);
```

**covalentBond**
```
function covalentBond(
  address contractAddress,
  uint256 tokenId,
  string calldata basketManagerId,
  address nftTokenAddress,
  uint256 nftTokenId
) external returns (bool success);
```

**breakCovalentBond**
```
function breakCovalentBond(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata basketManagerId,
  address nftTokenAddress,
  uint256 nftTokenId
) external returns (bool success);
```