## `Staking`





### `whenNotPaused()`






### `constructor(uint256 _epoch1Start, uint256 _epochDuration)` (public)





### `isPaused() → bool` (external)





### `deposit(address tokenAddress, uint256 amount)` (public)





### `withdraw(address tokenAddress, uint256 amount)` (public)





### `manualEpochInit(address[] tokens, uint128 epochId)` (public)





### `emergencyWithdraw(address tokenAddress)` (public)





### `getEpochUserBalance(address user, address token, uint128 epochId) → uint256` (public)





### `balanceOf(address user, address token) → uint256` (public)





### `getCurrentEpoch() → uint128` (public)





### `getEpochPoolSize(address tokenAddress, uint128 epochId) → uint256` (public)





### `currentEpochMultiplier() → uint128` (public)





### `computeNewMultiplier(uint256 prevBalance, uint128 prevMultiplier, uint256 amount, uint128 currentMultiplier) → uint128` (public)





### `epochIsInitialized(address token, uint128 epochId) → bool` (public)





### `getCheckpointBalance(struct Staking.Checkpoint c) → uint256` (internal)





### `getCheckpointEffectiveBalance(struct Staking.Checkpoint c) → uint256` (internal)





### `setPausedState(bool paused)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)






### `PausedStateSet(bool isPaused)`





### `Deposit(address user, address tokenAddress, uint256 amount)`





### `Withdraw(address user, address tokenAddress, uint256 amount)`





### `ManualEpochInit(address caller, uint128 epochId, address[] tokens)`





### `EmergencyWithdraw(address user, address tokenAddress, uint256 amount)`





