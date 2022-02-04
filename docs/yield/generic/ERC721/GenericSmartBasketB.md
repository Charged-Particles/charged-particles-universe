## `GenericSmartBasketB`

Generic ERC721-Token Smart-Basket


Non-upgradeable Contract

### `onlyBasketManager()`



Throws if called by any account other than the basket manager


### `initialize(contract ITokenInfoProxy tokenInfoProxy)` (public)





### `getTokenCountByType(address contractAddress, uint256 tokenId) → uint256` (external)





### `onERC721Received(address, address, uint256, bytes) → bytes4` (external)





### `onERC1155Received(address, address, uint256, uint256, bytes) → bytes4` (external)





### `onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) → bytes4` (external)





### `supportsInterface(bytes4 interfaceId) → bool` (external)





### `addToBasket(address contractAddress, uint256 tokenId) → bool` (external)





### `removeFromBasket(address receiver, address contractAddress, uint256 tokenId) → bool` (external)





### `withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsAmount) → uint256` (external)





### `executeForAccount(address contractAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)






