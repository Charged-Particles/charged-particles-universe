## `ISmartBasket`



Manages holding and transferring NFTs within an NFT (if any),


### `getTokenCountByType(address contractAddress, uint256 tokenId) → uint256` (external)





### `addToBasket(address contractAddress, uint256 tokenId) → bool` (external)





### `removeFromBasket(address receiver, address contractAddress, uint256 tokenId) → bool` (external)





### `executeForAccount(address contractAddress, uint256 ethValue, bytes encodedParams) → bytes` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)






