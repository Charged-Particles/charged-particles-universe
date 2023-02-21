// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.6.12;

interface IRewardProgram {
  /* admin events */

  event RewardProgramCreated(address rewardPool);
  event RewardProgramFunded(uint256 amount);

  /* user events */

  event Staked(address wallet, uint256 amount);
  // event Unstaked(address vault, uint256 amount);
  // event RewardClaimed(address vault, address token, uint256 amount);

  /* data types */

  struct ProgramRewardData {
    address stakingToken;
    address rewardToken;
    address rewardPool;
    uint256 rewardPoolBalance;
    uint256 totalStake;
    uint256 totalStakeUnits;
    uint256 lastUpdate;
    uint256 rewardDuration;
  }


  struct Stake {
    uint256 start;
    uint256 amount;
  }

  // TODO: allow for multiple stakes
  mapping(address => Stake) public walletStake;

  // struct RewardScaling {
  //   uint256 multiplier;
  //   uint256 time;
  // }

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

  function stake(address wallet, uint256 amount)
    external;

  // function unstakeAndClaim(
  //   address vault,
  //   uint256[] calldata indices,
  //   uint256[] calldata amounts,
  //   bytes calldata permission
  // )
  //   external;

  // /* admin functions */

  function fund(uint256 amount) external;

  // function rescueTokensFromRewardPool(
  //   address token,
  //   address recipient,
  //   uint256 amount
  // )
  //   external;
}