// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

pragma abicoder v2;

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/BlackholePrevention.sol";

contract RewardProgram is IRewardProgram, Ownable, BlackholePrevention {
  ProgramRewardData public _programData;

  constructor(
    address stakingToken,
    address rewardToken,
    uint256 duration
  ) {
    _programData.stakingToken = stakingToken;
    _programData.rewardToken = rewardToken;
    _programData.rewardDuration = duration;
    _programData.lastUpdate = block.timestamp;
    _programData.totalStakeUnits = 0;

    emit RewardProgramCreated(address(this));
  }
}
