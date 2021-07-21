## `AaveBridgeV2`






### `constructor(address lendingPoolProvider)` (public)





### `getReserveInterestToken(address assetToken) → address aTokenAddress` (external)





### `isReserveActive(address assetToken) → bool` (external)





### `getTotalBalance(address account, address assetToken) → uint256` (external)





### `deposit(address assetToken, uint256 assetAmount, uint256 referralCode) → uint256` (external)





### `withdraw(address receiver, address assetToken, uint256 assetAmount)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_sendToken(address to, address token, uint256 amount)` (internal)





### `_getReserveInterestToken(address assetToken) → address aTokenAddress` (internal)





### `_isReserveActive(address assetToken) → bool` (internal)






