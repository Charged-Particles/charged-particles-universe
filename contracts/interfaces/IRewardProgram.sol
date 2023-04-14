// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.6.12;

interface IRewardProgram {
  /* admin events */

  event RewardProgramCreated(address rewardPool);
  event RewardProgramFunded(uint256 amount);

  /* user events */

  event Staked(uint256 uuid, uint256 amount);
  event Unstaked(uint256 uuid, uint256 amount);
  event LeptonDeposit(uint256 uuid);
  event LeptonRelease(uint256 uuid);
  // event RewardClaimed(address vault, address token, uint256 amount);

  /* data types */

  struct ProgramRewardData {
    address stakingToken;
    address rewardToken;
    address rewardPool;
    uint256 rewardDuration;
    uint256 rewardPoolBalance;
  }

  struct Stake {
    bool started;
    uint256 start;
    uint256 principal;
    uint256 generatedCharge;
    uint256 reward;
  }

  struct LeptonsStake {
    uint256 multiplier;
    uint256 depositBlockNumber;
    uint256 releaseBlockNumber;
  }

  // struct VaultData {
  //   uint256 totalStake;
  //   StakeData[] stakes;
  // }

  // struct StakeData {
  //   uint256 amount;
  //   uint256 timestamp;
  // }

  // struct RewardOutput {
  //   uint256 lastStakeAmount;
  //   uint256 newStakesCount;
  //   uint256 reward;
  //   uint256 newTotalStakeUnits;
  // }

  /* user functions */

  function stake(uint256 uuid, uint256 amount)
    external;

  function unstake(
    uint256 uuid,
    address receiver,
    uint256 amount
  )
    external;

  // /* admin functions */

  function fund(uint256 amount) external;

  // function rescueTokensFromRewardPool(
  //   address token,
  //   address recipient,
  //   uint256 amount
  // )
  //   external;
}