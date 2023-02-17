// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

pragma experimental ABIEncoderV2;

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    _programData.rewardPool = address(this);
    _programData.totalStakeUnits = 0;
    _programData.rewardPoolBalance = 0;

    emit RewardProgramCreated(address(this));
  }

  function fund(uint256 amount)
    external
    override
    onlyOwner
  {
    IERC20 token = IERC20(_programData.rewardToken);

    token.transferFrom(msg.sender, address(this), amount);

    _programData.rewardPoolBalance = amount + _programData.rewardPoolBalance;

    emit RewardProgramFunded(amount);
  }

  function getProgramData()
    external
    view
    returns (ProgramRewardData memory programData)
  {
    return _programData;
  }
}
