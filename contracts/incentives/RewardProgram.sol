// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

pragma experimental ABIEncoderV2;

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/BlackholePrevention.sol";

contract RewardProgram is IRewardProgram, Ownable, BlackholePrevention {
  ProgramRewardData public _programData;

  constructor(
    address stakingToken,
    address rewardToken,
    uint256 duration
  ) public {
    _programData.stakingToken = stakingToken;
    _programData.rewardToken = rewardToken;
    _programData.rewardDuration = duration;
    _programData.lastUpdate = block.timestamp;
    _programData.totalStakeUnits = 0;

    emit RewardProgramCreated(address(this));
  }

  function fund(uint256 amount) external override onlyOwner {

  }

  function getProgramData()
    external
    view
    returns (ProgramRewardData memory programData)
  {
    return _programData;
  }
}
