## `YieldFarm2`





### `whenNotPaused()`






### `constructor(address ionxTokenAddress, address token, address stakeContract, address communityVault, uint256 genesisEpochAmount, uint256 deprecationPerEpoch, uint256 nrOfEpochs)` (public)





### `isPaused() → bool` (external)





### `getAmountClaimable() → uint256` (external)





### `massHarvest() → uint256` (external)





### `harvest(uint128 epochId) → uint256` (external)





### `getPoolSize(uint128 epochId) → uint256` (external)





### `getCurrentEpoch() → uint256` (external)





### `getEpochStake(address userAddress, uint128 epochId) → uint256` (external)





### `getGenesisEpochAmount() → uint256` (external)





### `getDeprecationPerEpoch() → uint256` (external)





### `userLastEpochIdHarvested() → uint256` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_initEpoch(uint128 epochId)` (internal)





### `_getAmountClaimableAtEpoch(address account, uint128 epochId) → uint256` (internal)





### `_harvest(uint128 epochId) → uint256` (internal)





### `_calcTotalAmountPerEpoch(uint256 epochId) → uint256` (internal)





### `_getPoolSize(uint128 epochId) → uint256` (internal)





### `_getUserBalancePerEpoch(address userAddress, uint128 epochId) → uint256` (internal)





### `_getEpochId() → uint128 epochId` (internal)





### `_stakingEpochId(uint128 epochId) → uint128` (internal)






### `PausedStateSet(bool isPaused)`





### `MassHarvest(address user, uint256 epochsHarvested, uint256 totalValue)`





### `Harvest(address user, uint128 epochId, uint256 amount)`





