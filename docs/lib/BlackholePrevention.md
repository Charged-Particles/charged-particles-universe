## `BlackholePrevention`

Prevents ETH or Tokens from getting stuck in a contract by allowing
 the Owner/DAO to pull them out on behalf of a user
This is only meant to contracts that are not expected to hold tokens, but do handle transferring them.




### `_withdrawEther(address payable receiver, uint256 amount)` (internal)





### `_withdrawERC20(address payable receiver, address tokenAddress, uint256 amount)` (internal)





### `_withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (internal)





### `_withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (internal)






### `WithdrawStuckEther(address receiver, uint256 amount)`





### `WithdrawStuckERC20(address receiver, address tokenAddress, uint256 amount)`





### `WithdrawStuckERC721(address receiver, address tokenAddress, uint256 tokenId)`





### `WithdrawStuckERC1155(address receiver, address tokenAddress, uint256 tokenId, uint256 amount)`





