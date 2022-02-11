# `ChargedParticles`

## Get Contract Info

> Get Info about the contract, its settings, and its state.
### getStateAddress

```
  function getStateAddress() 
    external 
    view 
    returns (address stateAddress);
```

Gets the address of the ChargedState contract, which can be used for setting and retrieving additional information about a Particle (NFT) contract. E.g. time locks on particle mass (principal) or charge (interest).

| Return Value | Description | Type |
| --------- | ----------- | ---- | 
| stateAddress          | address of Charged State contract            | address     |



### getStateAddress

```
  function getSettingsAddress() 
    external 
    view 
    returns (address settingsAddress);
```

Gets the address of the ChargedSettings contract, which can be used for setting and retrieving the settings of the ChargedParticles contract. E.g. Creator annuity.

When Custom Contracts are registered, only the "owner" or operator of the Contract is allowed to register them and define custom rules for how their tokens are "Charged". Otherwise, any token can be "Charged" according to the default rules of Charged Particles.

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| settingsAddress          | address of Charged Settings contract            | address     |





### getManagersAddress

```
  function getManagersAddress() 
    external 
    view 
    returns (address managersAddress);
```

Gets the address of the ChargedManagers contract. To learn more about how the ChargedManagers contract functions and what purpose it serves, look [here](https://docs.charged.fi/charged-particles-protocol/developing-on-the-protocol/technical-architecture#wallet-managers). In V1 of the protocol, each manager had their own contract, but in V2, all are contained within a single ChargedManagers contract. In both versions of the protocol, the managers serve the same purpose.

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| managersAddress          | address of Charged Settings contract            | address     |



### onERC721Received

Part of the ERC721 standard. Required for any contract that receives ERC-721 tokens. See [Open Zeppelin](https://docs.openzeppelin.com/contracts/3.x/api/token/erc721#IERC721Receiver) for more detail.

```
function onERC721Received(
  address,
  address,
  uint256,
  bytes calldata
) external virtual override returns (bytes4);
```

### onERC1155Received

Part of the ERC1155 standard. Required for any contract that receives ERC-1155 tokens. See [Open Zeppelin](https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#IERC1155Receiver) for more detail.

```
function onERC1155Received(
  address,
  address,
  uint256,
  bytes calldata
) external virtual override returns (bytes4);
```

### getFeesForDeposit

Calculates the amount of fees to be paid for a specific deposit amount.

```
function getFeesForDeposit(
  uint256 assetAmount
) external view returns (uint256 protocolFee);
```
| Return Value | Description | Type |
| --------- | ----------- | ---- |
| protocolFee          | protocol fees in amount of token      | uint256     |

## Get Particle Info
### baseParticleMass

Gets the amount of asset tokens that have been deposited into the Particle, which represent the Mass of the Particle.

```
 function baseParticleMass(
  address contractAddress, 
  uint256 tokenId, 
  string calldata walletManagerId, 
  address assetToken
) external returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address|
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The liquidity provider ID to check the asset balance of | string |
| assetToken | The address of the asset token to check | address | 


| Return Value | Description | Type |
| --------- | ----------- | ---- |
| amount    | The amount of underlying asset held within the token | uint256 |

### currentParticleCharge

Gets the amount of interest that the Particle has generated representing
the Charge of the Particle.

```
function currentParticleCharge(
  address contractAddress, 
  uint256 tokenId, 
  string calldata walletManagerId, 
  address assetToken
) external returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address|
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The liquidity provider ID to check the asset balance of | string |
| assetToken | The address of the asset token to check | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| amount    | The amount of interest the token (Particle) has generated (for a given asset token) | uint256 |


### currentParticleKinetics

Gets the amount of LP Tokens that the Particle has generated representing
the Kinetics of the Particle.

```
 function currentParticleKinetics(
  address contractAddress, 
  uint256 tokenId, 
  string calldata walletManagerId, 
  address assetToken
) external returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address|
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The liquidity provider ID to check the asset balance of | string |
| assetToken | The address of the asset token to check | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| amount    | The amount of LP tokens that have been generated | uint256 |

### currentParticleCovalentBonds

Gets the total amount of ERC721 Tokens that the Particle holds.

```
function currentParticleCovalentBonds(
  address contractAddress, 
  uint256 tokenId, 
  string calldata basketManagerId
) external view returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| basketManagerId | The ID of the Basket Manager to check the token balance of | string |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| amount    | The total amount of NFTs that are held within the Particle | uint256 |

## Particle Mechanics

> Interact with Particles
### energizeParticle

Fund a Particle with an asset token (ERC20). Must be called by the account providing the asset. The account must approve THIS (ChargedParticles.sol) contract as operator of the asset.

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

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The ID of the Wallet Manager to check the token balance of | string |
| assetToken | The address of the asset token to deposite | address |
| assetAmount | The amount of asset token to deposit | uint256 |
| referrer | *used for an internal feature that has yet to be implemented -- ignore  | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| yieldTokensAmount | The amount of tokens added to the Particle | uint256 |



### dischargeParticle

Allows the owner or operator of the token (Particle) to collect or transfer the interest generated from the token without removing the underlying asset.

```
function dischargeParticle(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken
) external returns (
  uint256 creatorAmount, 
  uint256 receiverAmount
);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| receiver | The address to receive the Discharged asset tokens | address |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The ID of the Wallet Manager to Discharge from | string |
| assetToken | The address of the asset token to Discharge | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| receiverAmount | the amount of asset token discharged to the receiver | uint256 |
| creatorAmount | the amount of asset token discharged to its creator | uint256 |

### dischargeParticleAmount

Allows the owner or operator of the token (Particle) to collect or transfer a specific amount of the interest generated from the token without removing the principal.

```
function dischargeParticleAmount(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount
) external returns (
  uint256 creatorAmount, 
  uint256 receiverAmount
);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| receiver | The address to receive the Discharged asset tokens | address |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The ID of the Wallet Manager to Discharge from | string |
| assetToken | The address of the asset token to Discharge | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| receiverAmount | the amount of asset token discharged to the receiver | uint256 |
| creatorAmount | the amount of asset token discharged to its creator | uint256 |


### dischargeParticleForCreator

Allows the creator of the token (Particle) to collect or transfer a their portion of the interest generated from the token without removing the principal.

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
| Parameter | Description | Type |
| --------- | ----------- | ---- |
| receiver | The address to receive the Discharged asset tokens | address |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The ID of the Wallet Manager to Discharge from | string |
| assetToken | The address of the asset token to Discharge | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| receiverAmount | the amount of asset token discharged to the receiver | uint256 |

### releaseParticle

Releases the full amount of asset + interest held within the Particle by LP of the assets.

```
function releaseParticle(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken
) external returns (
  uint256 creatorAmount, 
  uint256 receiverAmount
);
```
| Parameter | Description | Type |
| --------- | ----------- | ---- |
| receiver | The address to receive the Released asset tokens | address |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The Wallet Manager of the assets to Release from the Particle | string |
| assetToken | The address of the asset token to Release | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| receiverAmount | the amount of asset token Released to the receiver | uint256 |
| creatorAmount | the amount of asset token Released to its creator | uint256 |


### releaseParticleAmount

Releases a partial amount of principal + interest held within the Particle by LP of the assets.

```
function releaseParticleAmount(
  address receiver,
  address contractAddress,
  uint256 tokenId,
  string calldata walletManagerId,
  address assetToken,
  uint256 assetAmount
) external returns (
  uint256 creatorAmount, 
  uint256 receiverAmount
);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| receiver | The address to receive the Released asset tokens | address |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |
| walletManagerId | The Wallet Manager of the assets to Release from the Particle | string |
| assetToken | The address of the asset token to deposited | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| receiverAmount | the amount of asset token Released to the receiver | uint256 |
| creatorAmount | the amount of asset token Released to its creator | uint256 |


### covalentBond

Deposit other NFTs into the Particle. Must be called by the account providing the NFT.Depositing account must approve this (ChargedParticles.sol) contract as NFT's operator.

```
function covalentBond(
  address contractAddress,
  uint256 tokenId,
  string calldata basketManagerId,
  address nftTokenAddress,
  uint256 nftTokenId
) external returns (bool success);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The contract address of the token (Particle) to deposit into| address |
| tokenId | The ID of the token (Particle) | uint256 |
| basketManagerId | The Basket Manager to deposit the NFT into | string |
| nftTokenAddress | The address of the NFT being deposited | address |
| nftTokenId | The ID of the NFT being deposited | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| success | true or false | bool |


### breakCovalentBond

Withdraw an NFT from a Particle.

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| receiver | The address to receive the withdrawn NFTs | address |
| contractAddress | The contract address of the token (Particle) | address |
| tokenId | The ID of the token (Particle) | uint256 |
| basketManagerId | The Basket Mananger to Withdraw the NFT from | string |
| nftTokenAddress | The address of the NFT being withdrawn | address |
| nftTokenId | The ID of the NFT being withdrawn | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| success | true or false | bool |

## Other

### Events

```
  event Initialized(address indexed initiator);
```

```
  event ControllerSet(address indexed controllerAddress, string controllerId);
```

```
  event DepositFeeSet(uint256 depositFee);
```

```
  event ProtocolFeesCollected(address indexed assetToken, uint256 depositAmount, uint256 feesCollected);
```
