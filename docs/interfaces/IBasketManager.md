## `IBasketManager`



The basket-manager for underlying assets attached to Charged Particles
Manages the link between NFTs and their respective Smart-Baskets.

## Events

**ControllerSet**
```
event ControllerSet(address indexed controller);
```

**PausedStateSet**
```
event PausedStateSet(bool isPaused);
```

**NewSmartBasket**
```
event NewSmartBasket(
  address indexed contractAddress, 
  uint256 indexed tokenId, 
  address indexed smartBasket
);
```

**BasketAdd**
```
event BasketAdd(
  address indexed contractAddress, 
  uint256 indexed tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
);
```

**BasketRemove**
```
event BasketRemove(
  address indexed receiver, 
  address indexed contractAddress, 
  uint256 indexed tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
);
```

## Methods

**isPaused**
```
function isPaused() external view returns (bool);
```

**getTokenTotalCount**
```
function getTokenTotalCount(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256);
```

**getTokenCountByType**
```
function getTokenCountByType(
  address contractAddress, 
  uint256 tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
) external returns (uint256);
```

**addToBasket**
```
function addToBasket(
  address contractAddress, 
  uint256 tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
) external returns (bool);
```

**removeFromBasket**
```
function removeFromBasket(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
) external returns (bool);
```

**executeForAccount**
```
function executeForAccount(
  address contractAddress, uint256 tokenId, 
  address externalAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```  


**getBasketAddressById**
```
function getBasketAddressById(
  address contractAddress, 
  uint256 tokenId
) external returns (address);
```