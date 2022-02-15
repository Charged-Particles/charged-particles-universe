## `ProtonB`

### creatorOf

Gets the creator of a Proton.

```
function creatorOf(
  uint256 tokenId
) external view returns (address);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| address    | particle creator's address  | address |


### getSalePrice

Gets current sale price of a Proton.

```
function getSalePrice(
  uint256 tokenId
) external view returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| price    | current sale price  | uint256 |


### getLastSellPrice

Gets most recent price that Proton sold for.

```
function getLastSellPrice(
  uint256 tokenId
) external view returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| price    | last sale price  | uint256 |

### getCreatorRoyalties

Gets total royalties earned by a given creator. Royalties are how much of the sale price will be directed to the Proton's creator whenever a Proton is sold.

```
function getCreatorRoyalties(
  address account
) external view returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| account | address of a Proton creator | address |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| royalties    | total royalties earned | uint256 |

### getCreatorRoyaltiesPct

Gets creator royalties for a given token. Royalties are how much of the sale price will be directed to the Proton's creator whenever a Proton is sold.

```
function getCreatorRoyaltiesPct(
  uint256 tokenId
) external view returns (uint256);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| royaltiesPct | The percentage of sales directed to the creator  of the Particle (or 3rd party if royalties have been redirected)  | uint256 |

### getCreatorRoyaltiesReceiver

Gets creator royalties receiver. Can be either the creator or a 3rd-party address.

```
function getCreatorRoyaltiesReceiver(
  uint256 tokenId
) external view returns (address);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the token (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| receiver    | address that receives royalties (defaults to creator)  | address |


### claimCreatorRoyalties

Sends royalties to creator or delegated receiver.

```
function claimCreatorRoyalties() external returns (uint256);
```

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| amount   | amount of royalties claimed | uint256 |

### createChargedParticle

Create a new Charged Particle (a Proton with ERC20 assets nested inside).

```
function createChargedParticle(
  address creator,
  address receiver,
  address referrer,
  string memory tokenMetaUri,
  string memory walletManagerId,
  address assetToken,
  uint256 assetAmount,
  uint256 annuityPercent
) external returns (uint256 newTokenId);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| creator | creator of Proton (Particle) | address |
| receiver | address to receive newly minted Proton (Particle) | address |
| tokenMetaUri | URI of token's metadata | string |
| walletManagerId | id of wallet manager for ERC20 being deposited upon mint | string |
| assetToken | asset to create token with | address |
| assetAmount | amount of asset to deposit | uint256 |
| annuityPercent | percentage of charge (interest) directed to creator, in basis points (e.g. '10000' = 100%) | uint256 |


| Return Value | Description | Type |
| --------- | ----------- | ---- |
| newTokenId    | ID of new Proton | uint256 |

### createBasicProton

Create a basic Proton without charge, and with annuityPercent, royaltiesPercent, and salePrice set to 0.

```
function createBasicProton(
  address creator,
  address receiver,
  string memory tokenMetaUri
) external returns (uint256 newTokenId);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| creator | creator of Proton (Particle) | address |
| receiver | address to receive newly minted Proton (Particle) | address |
| tokenMetaUri | URI of token's metadata | string |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| newTokenId    | ID of new Proton | uint256 |

### createProton

Create a Proton, set its annuity percentage to a custom amount, and set royalties percentage and salePrice to 0.

```
function createProton(
  address creator,
  address receiver,
  string memory tokenMetaUri,
  uint256 annuityPercent
) external returns (uint256 newTokenId);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| creator | creator of Proton (Particle) | address |
| receiver | address to receive newly minted Proton (Particle) | address |
| tokenMetaUri | URI of token's metadata | string |
| annuityPercent | percentage of charge (interest) directed to creator, in basis points (e.g. '10000' = 100%) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| newTokenId    | ID of new Proton | uint256 |

### createProtonForSale

Create a Proton, set its annuity percentage to a custom amount, and set royalties percentage and sale price to custom amounts.

```
function createProtonForSale(
  address creator,
  address receiver,
  string memory tokenMetaUri,
  uint256 annuityPercent,
  uint256 royaltiesPercent,
  uint256 salePrice
) external returns (uint256 newTokenId);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| creator | creator of Proton (Particle) | address |
| receiver | address to receive newly minted Proton (Particle) | address |
| tokenMetaUri | URI of token's metadata | string |
| annuityPercent | percentage of charge (interest) directed to creator, in basis points (e.g. '10000' = 100%) | uint256 |
| royaltiesPercent | percentage of sales directed to creator, in basis points (e.g. '10000' = 100%) | uint256 |
| salePrice | sale price for Proton (Particle) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| newTokenId    | ID of new Proton | uint256 |

### batchProtonsForSale

*To be updated*

```
function batchProtonsForSale(
    address creator,
    uint256 annuityPercent,
    uint256 royaltiesPercent,
    string[] calldata tokenMetaUris,
    uint256[] calldata salePrices
) external;
```

*To be updated*
### buyProton

Buy a Proton.

```
function buyProton(
  uint256 tokenId, 
  uint256 gasLimit
) external payable returns (bool);
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the Proton (Particle) | uint256 |
| gasLimit | mas gax for tx (optional) | uint256 |

| Return Value | Description | Type |
| --------- | ----------- | ---- |
| success    | true if purchase made, false it not  | bool |

### setSalePrice

Set the sale price for a single Proton. In  

```
function setSalePrice(uint256 tokenId, uint256 salePrice) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the Proton (Particle) | uint256 |
| salePrice | new sale price for Proton (set to 0 to delist) | uint256 |


### setRoyaltiesPct

Set the sale price for a Proton.

```
function setRoyaltiesPct(
  uint256 tokenId, 
  uint256 royaltiesPct
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of the Proton (Particle) | uint256 |
| royaltiesPct | new royalties percentage | uint256 |

### setCreatorRoyaltiesReceiver

Set a receiver for Proton royalties. Defaults to the creator of the Proton. 

```
function setCreatorRoyaltiesReceiver(
  uint256 tokenId, 
  address receiver
) external;
```

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| tokenId | ID of Proton (Particle) | uint256 |
| receiver | the new receiver | uint256 |
