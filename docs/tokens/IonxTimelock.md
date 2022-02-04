## `IonxTimelock`





### `onlyFunder()`





### `onlyWhenActivated()`






### `constructor(address _funder, address _receiver, address _token)` (public)





### `addPortions(uint256[] amounts, uint256[] releaseTimes) → bool` (external)





### `nextReleaseTime() → uint256 releaseTime` (external)





### `nextReleaseAmount() → uint256 releaseAmount` (external)





### `release(uint256 numPortions, uint256 indexOffset) → uint256 amount` (external)

Transfers tokens held by timelock to the receiver.



### `releasePortion(uint256 portionIndex) → uint256 amount` (external)

Transfers tokens held by timelock to the receiver.



### `withdrawEther(uint256 amount)` (external)





### `withdrawErc20(address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address tokenAddress, uint256 tokenId)` (external)





### `activateTimelock()` (external)





### `destroyTimelock()` (external)






