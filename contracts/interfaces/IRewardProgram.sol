// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

pragma abicoder v2;

interface IRewardProgram {
  /* admin events */

  event RewardProgramCreated(address rewardPool);
  event RewardProgramFunded(uint256 amount);

  /* user events */

  event Staked(address vault, uint256 amount);
  event Unstaked(address vault, uint256 amount);
  event RewardClaimed(address vault, address token, uint256 amount);

  /* data types */

  struct ProgramRewardData {
    address stakingToken;
    address rewardToken;
    address rewardPool;
    RewardScaling rewardScaling;
    uint256 rewardSharesOutstanding;
    uint256 totalStake;
    uint256 totalStakeUnits;
    uint256 lastUpdate;
    RewardSchedule[] rewardSchedules;
  }

  struct RewardSchedule {
    uint256 duration;
    uint256 start;
    uint256 shares;
  }

  struct RewardScaling {
    uint256 multiplier;
    uint256 time;
  }

  struct VaultData {
    uint256 totalStake;
    StakeData[] stakes;
  }

  struct StakeData {
    uint256 amount;
    uint256 timestamp;
  }

  struct RewardOutput {
    uint256 lastStakeAmount;
    uint256 newStakesCount;
    uint256 reward;
    uint256 newTotalStakeUnits;
  }

  function initialize(
    uint64 startTime,
    address ownerAddress,
    address feeRecipient,
    uint16 feeBps,
    bytes calldata
  ) external;

  /* user functions */

  function stake(address vault, uint256 amount, bytes calldata permission)
    external;

  function unstakeAndClaim(
    address vault,
    uint256[] calldata indices,
    uint256[] calldata amounts,
    bytes calldata permission
  )
    external;

  /* admin functions */

  function fund(uint256 amount, uint256 duration) external;

  function rescueTokensFromRewardPool(
    address token,
    address recipient,
    uint256 amount
  )
    external;
}