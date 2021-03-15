## `IonTimelock`






### `constructor(address _funder, address _receiver, address _token)` (public)





### `addPortions(uint256[] amounts, uint256[] releaseTimes) → bool` (external)





### `nextReleaseTime() → uint256 releaseTime` (external)





### `nextReleaseAmount() → uint256 releaseAmount` (external)





### `release(uint256 numPortions, uint256 indexOffset) → uint256 amount` (external)

Transfers tokens held by timelock to the receiver.



### `releasePortion(uint256 portionIndex) → uint256 amount` (external)

Transfers tokens held by timelock to the receiver.




