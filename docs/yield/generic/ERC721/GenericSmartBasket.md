## `GenericSmartBasket`

Generic ERC721-Token Smart-Basket


Non-upgradeable Contract

### `onlyBasketManager()`



Throws if called by any account other than the basket manager


### `initialize()` (public)





### `getTokenCountByType(address contractAddress, uint256 tokenId) → uint256` (external)





### `onERC721Received(address, address, uint256, bytes) → bytes4` (external)





### `addToBasket(address contractAddress, uint256 tokenId) → bool` (external)





### `removeFromBasket(address receiver, address contractAddress, uint256 tokenId) → bool` (external)





### `executeForAccount(address contractAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)






