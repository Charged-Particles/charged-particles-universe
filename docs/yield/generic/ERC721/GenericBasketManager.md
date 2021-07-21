## `GenericBasketManager`

Generic ERC721 Basket Manager. Non-upgradeable Contract.


### getTokenTotalCount

Get count of total tokens in NFT Basket.

```
function getTokenTotalCount(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |

### getTokenCountByType

Get count of tokens (by contract address) for an NFT's Smart Basket.

```
function getTokenCountByType(
  address contractAddress, 
  uint256 tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
) external returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
| basketTokenAddress | contract address of Charged Particle (basket owner) | 
| basketTokenId | tokenId of Charged Particle (for basket) |

### addToBasket

Add an NFT to a Smart Basket.

```
function addToBasket(
  address contractAddress, 
  uint256 tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
) external returns (bool);
```


| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT to remove from basket |
| basketTokenAddress | contract address of Charged Particle (basket owner) | 
| basketTokenId | tokenId of Charged Particle (for basket) |


### removeFromBasket

```
function removeFromBasket(
  address receiver, 
  address contractAddress, 
  uint256 tokenId, 
  address basketTokenAddress, 
  uint256 basketTokenId
) external returns (bool);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | address of remover or other recipient |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT to remove from basket |
| basketTokenAddress | contract address of Charged Particle (basket owner) | 
| basketTokenId | tokenId of Charged Particle (for basket) |


### executeForAccount

Execute a contract method from the Smart Basket.

```
function executeForAccount(
  address contractAddress, uint256 tokenId, 
  address externalAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```  

### getBasketAddressById

Get address of Smart Basket for a given NFT id.

```
function getBasketAddressById(
  address contractAddress, 
  uint256 tokenId
) external returns (address);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |
