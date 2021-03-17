# Proton

> Proton contract. A Proton is another name for a Particle, and is an ERC721 token.

## Get Info About a Proton

> Get a Proton's creator, sale price, etc.
#### creatorOf

Gets the creator of a Proton.

`function creatorOf(uint256 tokenId) external view virtual override returns (address);`


| Parameter / Return Value  | Description             |
|---------------------------|-------------------------|
| tokenId                   | id of Proton            |
| return                    | address of token creator|

#### getSalePrice

Gets current sale price of a Proton in Ether.

`function getSalePrice(uint256 tokenId) external view virtual override returns (uint256);`

| Parameter / Return Value  | Description             |
|---------------------------|-------------------------|
| tokenId                   | id of Proton            |
| return                    | sale price in Ether     |

#### getLastSellPrice

Gets most recent price that Proton sold for in Ether.

`function getLastSellPrice(uint256 tokenId) external view virtual override returns (uint256);`

| Parameter / Return Value  | Description             |
|---------------------------|-------------------------|
| tokenId                   | id of Proton            |
| return                    | sale price in Ether     |


#### getCreatorRoyalties

`function getCreatorRoyalties(address account) external view virtual override returns (uint256);`

Gets creator royalties for a given creator. Royalties are how much of the sale price will be directed to the Proton's creator whenever a Proton is sold.

| Parameter / Return Value  | Description                       |
|---------------------------|-----------------------------------|
| address                   | creator account                   |
| return                    | royalties earned by creator       |


#### getCreatorRoyaltiesPct

`function getCreatorRoyaltiesPct(address account) external view virtual override returns (uint256);`

Gets creator royalties. Royalties are how much of the sale price will be directed to the Proton's creator whenever a Proton is sold.

| Parameter / Return Value  | Description                       |
|---------------------------|-----------------------------------|
| tokenId                   | id of Proton                      |
| return                    | royalty percentage on Proton sale |

#### getCreatorRoyaltiesReceiver

`function getCreatorRoyaltiesReceiver(uint256 tokenId) external view virtual override returns (address);`

Gets creator royalties receiver. Can be either the creator or a 3rd-party, such as a charity, relative, or any other account of choice.

| Parameter / Return Value  | Description                       |
|---------------------------|-----------------------------------|
| tokenId                   | id of Proton                      |
| return                    | address of royalties receiver     |


## Create & Interact with Proton(s)

> Create various types of Protons, buy a Proton, claim royalties, etc.

#### claimCreatorRoyalties()

Sends royalties to creator or delegated receiver.

`function claimCreatorRoyalties() external virtual override nonReentrant whenNotPaused returns (uint256);`

#### createChargedParticle
 
Create a new Charged Particle (a Proton with interest-bearing assets deposited into its wallet). 

```
function createChargedParticle(
  address creator,
  address receiver,
  address referrer,
  string tokenMetaUri,
  string walletManagerId,
  address assetToken,
  uint256 assetAmount, 
  uint256 annuityPercent
) external virtual override nonReentrant whenNotPaused returns (uint256 newTokenId);
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| creator                   | id of Charged Particle                              |
| receiver                  | receiver of new Charged Particle                    |
| referrer                  |                                                     |
| tokenMetaUri              | URI of tokenmetadata                                |
| walletManagerId           | id of walletManager for Charged Particle            |
| assetToken                | interest-bearing asset to create token with         |
| assetAmount               | amount of asset token                               |
| annuityPercent            | percentage of charge (interest) directed to creator |
| newTokenId                | id of new Charged Particle                          |

#### createBasicProton

Create a basic Proton without charge, and with annuityPercent, royaltiesPercent, and salePrice set to 0.

```
function createBasicProton(
  address creator,
  address receiver,
  string tokenMetaUri
) external virtual override whenNotPaused returns (uint256 newTokenId);
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| creator                   | id of Proton                                        |
| receiver                  | receiver of new Proton                              |
| tokenMetaUri              | URI of tokenmetadata                                |
| newTokenId                | id of new Proton                                    |

#### createProton

Create a Proton, set its annuity percentage to a custom amount, and set royalties percentage and salePrice to 0.

```
function createProton(
  address creator,
  address receiver,
  string tokenMetaUri,
  uint256 annuityPercent
) external virtual override whenNotPaused returns (uint256 newTokenId);
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| creator                   | address of creator                                  |
| receiver                  | receiver of new Proton                              |
| tokenMetaUri              | URI of tokenmetadata                                |
| annuity percent           | percentage of interest that goes to creator         |
| newTokenId                | id of new Proton                                    |

#### createProtonForSale

```
function createProtonForSale(
  address creator,
  address receiver,
  string tokenMetaUri,
  uint256 annuityPercent,
  uint256 royaltiesPercent,
  uint256 salePrice
) external virtual override whenNotPaused returns (uint256 newTokenId);
```

| Parameter / Return Value  | Description                                           |
|---------------------------|-------------------------------------------------------|
| creator                   | address of creator                                    |
| receiver                  | receiver of new Proton                                |
| tokenMetaUri              | URI of tokenmetadata                                  |
| annuityPercent           | percentage of charge (interest) that goes to creator   |
| royaltiesPercent         | percentage of Proton sale that goes to creator         |
| salePrice                 | sale price of Proton                                  |
| newTokenId                | id of new Proton                                      |

#### batchProtonsForSale

```
function batchProtonsForSale(
  address creator,
  uint256 annuityPercent,
  uint256 royaltiesPercent,
  string[] calldata tokenMetaUris,
  uint256[] calldata salePrices
) external virtual override whenNotPaused;
```

| Parameter / Return Value  | Description                                         |
|---------------------------|-----------------------------------------------------|
| creator                   | address of creator                                  |
| annuityPercent            | percentage of charge (interest) that goes to creator|
| royaltiesPercent          | percentage of Proton sale that goes to creator                                 |
| tokenMetaUris             | array of token metadata URIs for Protons                                |
| salePrices             | array of sale prices for Protons                       |

#### buyProton

Buy a Proton.

```
function buyProton(
  uint256 tokenId
) external payable virutal override nonReentrant whenNotPaused returns (bool);
```

| Parameter / Return Value  | Description                                           |
|---------------------------|-------------------------------------------------------|
| tokenId                   | id of Proton to purchase                              |
| return                    | true if purchase successful, false if not             |

## Update Proton Settings (Only for Creator/Owner)

#### setSalePrice

Set the sale price for a Proton.

```
function setSalePrice(
  uint256 tokenId, 
  uint256 salePrice
) external virtual override whenNotPaused onlyTokenOwnerOrApproved(tokenId);
```

| Parameter / Return Value  | Description                                           |
|---------------------------|-------------------------------------------------------|
| tokenId                   | id of Proton to set price for                         |
| salePrice                 | sale price in Ether                                   |



#### setRoyaltiesPct

Set royalties percentage for a Proton.

```
function setRoyaltiesPct(
  uint256 tokenId,
  uint256 royaltiesPct
) external virtual override whenNotPaused onlyTokenCreator(tokenId) onlyTokenOwnerOrApproved(tokenId);
```

| Parameter / Return Value  | Description                                           |
|---------------------------|-------------------------------------------------------|
| tokenId                   | id of Proton to set price for                         |
| royaltiesPct              | percentage of sale directed to creator                                   |


#### setCreatorRoyaltiesReceiver

Set a receiver for Proton royalties.

```
function setCreatorRoyaltiesReceiver(
  uint256 tokenId, 
  address receiver
) external virtual override whenNotPaused onlyTokenCreator(tokenId);
```

| Parameter / Return Value  | Description                                           |
|---------------------------|-------------------------------------------------------|
| tokenId                   | id of Proton to set recever for                       |
| receiver                  | address of receiver                                   |