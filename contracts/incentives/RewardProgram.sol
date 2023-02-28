// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

pragma experimental ABIEncoderV2;

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../lib/BlackholePrevention.sol";

contract RewardProgram is IRewardProgram, Ownable, BlackholePrevention {
  ProgramRewardData public _programData;

  address public rewardWalletManager;
  uint256 public baseMultiplier;

  mapping(address => Stake) public walletStake;

  constructor(
    address _stakingToken,
    address _rewardToken,
    address _rewardWalletManager,
    uint256 _duration,
    uint256 _baseMultiplier
  ) public {
    //TODO: define stake data params
    _programData.stakingToken = _stakingToken;
    _programData.rewardToken = _rewardToken;
    _programData.rewardDuration = _duration;
    _programData.rewardPool = address(this);
    _programData.lastUpdate = block.timestamp;
    _programData.totalStakeUnits = 0;
    _programData.rewardPoolBalance = 0;

    rewardWalletManager = _rewardWalletManager;
    baseMultiplier = _baseMultiplier;

    emit RewardProgramCreated(address(this));
  }

  function fund(uint256 amount)
    external
    override
    onlyOwner
  {
    IERC20 token = IERC20(_programData.rewardToken);

    token.transferFrom(msg.sender, address(this), amount);

    _programData.rewardPoolBalance = amount;

    emit RewardProgramFunded(amount);
  }

  function getProgramData()
    external
    view
    returns (ProgramRewardData memory programData)
  {
    return _programData;
  }

  function stake(address wallet, uint256 amount) override external onlyWalletManager {
    if (walletStake[wallet].started) {
      walletStake[wallet] = Stake(true, block.timestamp, amount,0,0);
    } else {
      Stake storage onGoingStake = walletStake[wallet];
      onGoingStake.principal += amount;
    }

    emit Staked(wallet, amount);
  }

  function unstake(
    address wallet,
    address receiver,
    uint256 creatorAmount,
    uint256 receiverAmount
  ) 
    override
    external
    onlyWalletManager
  {
    (uint256 reward, uint256 interestGenerated) = this.calculateReward(creatorAmount, receiverAmount);
    Stake storage stake = walletStake[wallet];
    stake.generatedCharge = interestGenerated;
    stake.reward = reward;

    // transfer ionx to user
    // todo: check decimals
    IERC20(_programData.rewardToken).transfer(receiver, reward);
  }

  function calculateReward(
    uint256 creatorAmount,
    uint256 receiverAmount
  )
    external
    view
    returns(
      uint256 baseReward,
      uint256 interestGenerated
    )
  {
    interestGenerated = creatorAmount + receiverAmount; // TODO: safe math
    baseReward = interestGenerated * baseMultiplier;
  }

  function setBaseMultiplier(uint256 newMultiplier)
    external
    onlyOwner
  {
    baseMultiplier = newMultiplier;
  }

  modifier onlyWalletManager() {
    require(msg.sender == rewardWalletManager, "Not wallet manager");
    _;
  }
}
