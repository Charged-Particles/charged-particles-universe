## `WalletManagerBase`

Wallet-Manager Base Contract


Non-upgradeable Contract

### `onlyController()`



Throws if called by any account other than the Controller contract

### `whenNotPaused()`






### `isPaused() → bool` (external)





### `setPausedState(bool paused)` (external)



Sets the Paused-state of the Wallet Manager

### `setController(address controller)` (external)



Connects to the Charged Particles Controller

### `withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)` (external)





### `withdrawERC20(address contractAddress, uint256 tokenId, address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId)` (external)





### `_getTokenUUID(address contractAddress, uint256 tokenId) → uint256` (internal)





### `_createClone(address target) → address result` (internal)



Creates Contracts from a Template via Cloning
see: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1167.md


