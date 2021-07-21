## `GenericSmartBasket`

Generic ERC721-Token Smart-Basket. Non-upgradeable Contract.
### getTokenCountByType

Gets token count for a given NFT contract and

```
function getTokenCountByType(
  address contractAddress, 
  uint256 tokenId
) external view returns (uint256);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |

### `addToBasket(address contractAddress, uint256 tokenId) → bool` (external)

Add NFT to Smart Basket of NFTs.

```
function addToBasket(
  address contractAddress, 
  uint256 tokenId
) external returns (bool);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |

### `removeFromBasket(address receiver, address contractAddress, uint256 tokenId) → bool` (external)

Remove an NFT from Smart Basket of NFTs.

```
function removeFromBasket(
  address receiver, 
  address contractAddress, 
  uint256 tokenId
) external returns (bool);
```

| Parameter / Return Value | Description |
|--------------------------| ------------ |
| receiver | address of remover or other recipient |
| contractAddress | NFT contract address |
| tokenId | tokenId of NFT |



### executeForAccount

Call a contract method from the Smart Basket.

```
function executeForAccount(
  address contractAddress, 
  uint256 ethValue, 
  bytes memory encodedParams
) external returns (bytes memory);
```
