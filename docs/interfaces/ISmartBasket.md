## `ISmartBasket`

Manages holding and transferring NFTs within an NFT.
## Methods

**getTokenCountByType**
```
function getTokenCountByType(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256);
```

**addToBasket**
```
function addToBasket(
  address contractAddress, 
  uint256 tokenId
) external returns (bool);
```
  
**removeFromBasket**
```
function removeFromBasket(
  address receiver, 
  address contractAddress, 
  uint256 tokenId
) external returns (bool);
```

**executeForAccount**
```
function executeForAccount(
  address contractAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```