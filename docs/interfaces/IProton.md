# IProton

## Events

**UniverseSet**
```
event UniverseSet(address indexed universe);
```

**ChargedStateSet**
```
event ChargedStateSet(address indexed chargedState);
```

**ChargedSettingsSet**
```
event ChargedSettingsSet(address indexed chargedSettings);
```

**ChargedParticlesSet**
```
event ChargedParticlesSet(address indexed chargedParticles);
```

**PausedStateSet**
```
event PausedStateSet(bool isPaused);
```

**SalePriceSet**
```
event SalePriceSet(uint256 indexed tokenId, uint256 salePrice);
```

**CreatorRoyaltiesSet**
```
event CreatorRoyaltiesSet(uint256 indexed tokenId, uint256 royaltiesPct);
```

**FeesWithdrawn**
```
event FeesWithdrawn(address indexed receiver, uint256 amount);
```


**ProtonSold**
```
event ProtonSold(
  uint256 indexed tokenId,
  address indexed oldOwner,
  address indexed newOwner,
  uint256 salePrice,
  address creator, 
  uint256 creatorRoyalties
);
```

**RoyaltiesClaimed**
```
event RoyaltiesClaimed(address indexed receiver, uint256 amountClaimed);
```

## Public functions

### Get Particle Info


**creatorOf**
```
function creatorOf(uint256 tokenId) external view returns (address);
```

**getSalePrice**
```
function getSalePrice(uint256 tokenId) external view returns (uint256);
```

**getLastSellPrice**
```  
function getLastSellPrice(uint256 tokenId) external view returns (uint256);
```

**getCreatorRoyalites**
```  
function getCreatorRoyalties(address account) external view returns (uint256);
```


**getCreatorRoyaltiesPct**
```
function getCreatorRoyaltiesPct(uint256 tokenId) external view returns (uint256);
```


**getCreatorRoyaltiesReceiver**
```
function getCreatorRoyaltiesReceiver(uint256 tokenId) external view returns (address);
```

### Interact with Particles


**buyProton**
```
function buyProton(uint256 tokenId) external payable returns (bool);
```

**claimCreatorRoyalties**
```
function claimCreatorRoyalties() external returns (uint256);
```

### Create particles


**createChargedParticle**
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

**createBasicProton**
```
function createBasicProton(
  address creator,
  address receiver,
  string memory tokenMetaUri
) external returns (uint256 newTokenId);
```

**createProton**
```
function createProton(
  address creator,
  address receiver,
  string memory tokenMetaUri,
  uint256 annuityPercent
) external returns (uint256 newTokenId);
```

**createProtonForSale**
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

**batchProtonsForSale**
```
function batchProtonsForSale(
  address creator,
  uint256 annuityPercent,
  uint256 royaltiesPercent,
  string[] calldata tokenMetaUris,
  uint256[] calldata salePrices
) external;
```


## Only Token Owner / Creator

### Set / Update Particle Properties



**setSalePrice**
```
function setSalePrice(uint256 tokenId, uint256 salePrice) external;
```

**setRoyalties**
```
function setRoyaltiesPct(uint256 tokenId, uint256 royaltiesPct) external;
```

**setCreatorRoyalties**
```
function setCreatorRoyaltiesReceiver(uint256 tokenId, address receiver) external;
```