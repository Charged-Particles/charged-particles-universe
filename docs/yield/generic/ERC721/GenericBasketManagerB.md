## `GenericBasketManagerB`

Generic ERC721 Basket Manager


Non-upgradeable Contract

### `onlyController()`



Throws if called by any account other than the Controller contract

### `onlyControllerOrExecutor()`



Throws if called by any account other than the Controller or Executor contract

### `whenNotPaused()`






### `isPaused() → bool` (external)





### `getTokenTotalCount(address contractAddress, uint256 tokenId) → uint256` (external)





### `getTokenCountByType(address contractAddress, uint256 tokenId, address basketTokenAddress, uint256 basketTokenId) → uint256` (external)





### `addToBasket(address contractAddress, uint256 tokenId, address basketTokenAddress, uint256 basketTokenId) → bool added` (public)





### `removeFromBasket(address receiver, address contractAddress, uint256 tokenId, address basketTokenAddress, uint256 basketTokenId) → bool removed` (public)





### `withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsAmount) → uint256 amount` (external)





### `executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes encodedParams) → bytes` (public)





### `getBasketAddressById(address contractAddress, uint256 tokenId) → address` (public)





### `setPausedState(bool paused)` (external)



Sets the Paused-state of the Basket Manager

### `setController(address controller)` (external)



Connects to the Charged Particles Controller

### `setExecutor(address executor)` (external)



Connects to the ExecForAccount Controller

### `setTokenInfoProxy(address tokenInfoProxy)` (external)



Connects to the Charged Particles Controller

### `withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address contractAddress, uint256 tokenId, address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId)` (external)





### `withdrawERC1155(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId, uint256 amount)` (external)





### `_getTokenUUID(address contractAddress, uint256 tokenId) → uint256` (internal)





### `_createBasket() → address` (internal)





### `_createClone(address target) → address result` (internal)



Creates Contracts from a Template via Cloning
see: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1167.md


