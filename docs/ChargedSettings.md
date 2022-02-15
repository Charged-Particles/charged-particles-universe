# ChargedSettings

## Get Particles' Settings
### getCreatorAnnuities

Gets the creator of a Particle and the percentage of creator annuities for the specified Particle. Creator annuities can be reassigned from the original creator to a 3rd party using the `setCreatorAnnuitiesRedirect` function.

```
function getCreatorAnnuities(
  address contractAddress, 
  uint256 tokenId
  ) external returns (
    address creator, 
    uint256 annuityPct
  );
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| creator    | The particle creator's address  | address |
| annuityPct | The percentage of interest directed to the creator of the Particle   | uint256 |

### getCreatorAnnuitiesRedirect

Get the address that receives creator annuities for a given Particle/   Defaults to creator address if it has not been redirected via the `setCreatorAnnuitiesRedirect` function.

```
function getCreatorAnnuitiesRedirect(
  address contractAddress, 
  uint256 tokenId
  ) external view returns (address);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | The address to the contract of the token (Particle)| address |
| tokenId | The ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| address    | The address that receives creator annuities | address |



### getTempLockExpiryBlocks

Get the unlock block of the temporary timelock associated with a Particle. The temporary timelock exists to prevent front-running.

```
function getTempLockExpiryBlocks () returns (uint256)
```

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| unlockBlock | Block number when temporary lock expires | uint256 |

### getTimelockApprovals

Gets the approvals for time locks.

```
function getTimelockApprovals(
  address operator
  ) external view returns (
    bool timelockAny, 
    bool timelockOwn
  );
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| operator | Particle operator's address | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| timelockAny    | whether or not operator can time lock any NFT on behalf of user | bool |
| timelockOwn    | whether or not operator can time lock their own NFTS | bool |



### getAssetRequirements

Get requirements for an asset token that determine whether it can be deposited into a Particle. Aave, Compound, etc. have different requirements for tokens, and this function returns those requirements for each type of wallet manager / ERC20 asset.
```
function getAssetRequirements(
    address contractAddress,
    address assetToken
  ) external view returns (
    string memory requiredWalletManager,
    bool energizeEnabled,
    bool restrictedAssets,
    bool validAsset,
    uint256 depositCap,
    uint256 depositMin,
    uint256 depositMax,
    bool invalidAsset
  );
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of contract for Particle (whether Proton or another NFT Contract) | address |
| assetToken | address of asset token to get requirements for | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| requiredWalletManager    | wallet manager required for asset token | string |
| energizeEnabled    | wallet manager required for asset token | bool |
| restrictedAssets    | wallet manager required for asset token | bool |
| validAsset    | whether or not asset token is a valid asset | bool |
| depositCap    |  | uint256 |
| depositMin    |  | uint256 |
| depositMax    |  | uint256 |
| invalidAsset    | whether or not asset token is a valid asset | bool |

### getNftAssetRequirements

Get requirements for NFTs that can be deposited into a Particle

```
function getNftAssetRequirements(
    address contractAddress,
    address nftTokenAddress
  ) external view returns (
    string memory requiredBasketManager,
    bool basketEnabled,
    uint256 maxNfts
  );
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of contract for Particle (whether Proton or another NFT Contract) | address |
| nftTokenAddress | address of NFT to get requirements for | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| requiredBasketManager | required NFT basket manager | string |
| basketEnabled | whether or not the basket is enabled for an NFT | bool |
| maxNfts | max number of NFTs in a basket | uint256 |


## Update Particle Settings
### setCreatorAnnuities

Sets a custom percentage for the Creator Annuities of a Particle.

```
function setCreatorAnnuities(
  address contractAddress, 
  uint256 tokenId, 
  address creator, 
  uint256 annuityPercent
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of contract for Particle (whether Proton or another NFT Contract) | address |
| tokenId | The ID of the token (Particle) | uint256 |
| annuityPercent | percentage of interest earned by an NFT directed to the creator (or 3rd party) | uint256 |

### setCreatorAnnuitiesRedirect

Sets a custom receiver address for the Creator Annuities.

```
function setCreatorAnnuitiesRedirect(
  address contractAddress, 
  uint256 tokenId, 
  address receiver
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| tokenId | The ID of the token (Particle) | uint256 |
| receiver | 3rd party address to redirect creator annuities to | address |


## Update Settings for Entire NFT Contracts

> For the owner or admin of an NFT contract only
### setRequiredWalletManager

Sets a required Wallet Manager for External NFT contracts (otherwise set to "none" to allow any Wallet Manager).

```
function setRequiredWalletManager(
  address contractAddress, 
  string calldata walletManager
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| walletManager | If set, will only allow deposits from this specific Wallet Manager | string |


### `setRequiredBasketManager(address contractAddress, string basketManager)` (external)

Sets a required Basket Manager for External NFT contracts (otherwise set to "none" to allow any Basket Manager).

```
function setRequiredBasketManager(
  address contractAddress, 
  string calldata basketManager
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| basketManager | If set, will only allow deposits from this specific Basket Manager | string |



### `setAssetTokenRestrictions(address contractAddress, bool restrictionsEnabled)` (external)

Enables or disables asset token restrictions for External NFT contracts.

```
function setAssetTokenRestrictions(
  address contractAddress, 
  bool restrictionsEnabled
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| restrictionsEnabled | If set, only allowed asset tokens can be deposited | bool |


### `setAllowedAssetToken(address contractAddress, address assetToken, bool isAllowed)` (external)

Enables or disables allowed asset tokens for External NFT contracts.

```
function setAllowedAssetToken(
  address contractAddress, 
  address assetToken, 
  bool isAllowed
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| assetToken | The address of the asset token to allow or disallow | address |
| isAllowed | The address of the asset token to allow or disallow | bool |


### setAssetTokenLimits

Sets the custom configuration for External contracts.

```
function setAssetTokenLimits(
  address contractAddress, 
  address assetToken, 
  uint256 depositMin, 
  uint256 depositMax
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| assetToken | The address of the asset token to set min/max for | address |
| depositMin | If set, will define the minimum amount of Asset tokens the NFT may hold, otherwise any amount | uint256 |
| depositMax | If set, will define the maximum amount of Asset tokens the NFT may hold, otherwise any amount | uint256 |


### setMaxNfts

Sets the maximum number of NFTs that can be held by a Particle, for a given contract. For example, if you wanted a Particle to only be able to hold one Bored Ape, you would use this function to set that restriction.

```
function setMaxNfts(
  address contractAddress, 
  address nftTokenAddress, 
  uint256 maxNfts
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| contractAddress | address of NFT Contract (Proton or other) to configure | address |
| nftTokenAddress | The address of the NFT contract to set min/max for | address |
| maxNfts | The maximum numbers of NFTs that can be held by a given NFT (0 = unlimited) | uint256 |

## Other

### Events

```
event Initialized(address indexed initiator);
```

```
  event ControllerSet(address indexed controllerAddress, string controllerId);
```

```
  event DepositCapSet(address assetToken, uint256 depositCap);
```

```
  event TempLockExpirySet(uint256 expiryBlocks);
```

```
  event RequiredWalletManagerSet(address indexed contractAddress, string walletManager);
```

```
  event RequiredBasketManagerSet(address indexed contractAddress, string basketManager);
```

```
  event AssetTokenRestrictionsSet(address indexed contractAddress, bool restrictionsEnabled);
```

```
  event AllowedAssetTokenSet(address indexed contractAddress, address assetToken, bool isAllowed);
```

```
  event AssetTokenLimitsSet(address indexed contractAddress, address assetToken, uint256 assetDepositMin, uint256 assetDepositMax);
```

```
  event MaxNftsSet(address indexed contractAddress, address indexed nftTokenAddress, uint256 maxNfts);
```

```
  event AssetInvaliditySet(address indexed assetToken, bool invalidity);
```

```
  event TokenCreatorConfigsSet(address indexed contractAddress, uint256 indexed tokenId, address indexed creatorAddress, uint256 annuityPercent);
```

```
  event TokenCreatorAnnuitiesRedirected(address indexed contractAddress, uint256 indexed tokenId, address indexed redirectAddress);
```

```
  event PermsSetForCharge(address indexed contractAddress, bool state);
```

```
  event PermsSetForBasket(address indexed contractAddress, bool state);
```

```
  event PermsSetForTimelockAny(address indexed contractAddress, bool state);
```

```
  event PermsSetForTimelockSelf(address indexed contractAddress, bool state);
```