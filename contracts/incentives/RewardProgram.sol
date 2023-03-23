// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

pragma experimental ABIEncoderV2;

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../lib/BlackholePrevention.sol";

contract RewardProgram is IRewardProgram, Ownable, BlackholePrevention {
  using SafeMath for uint256;

  ProgramRewardData public _programData;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;   // 10000  (100%)
  address public rewardWalletManager;
  address public rewardBasketManager;
  uint256 public baseMultiplier;

  mapping(uint256 => Stake) public walletStake;
  mapping(uint256 => LeptonsMultiplier[]) public leptonsStake;

  constructor(
    address _stakingToken,
    address _rewardToken,
    address _rewardWalletManager,
    uint256 _duration,
    uint256 _baseMultiplier
  ) public {
    _programData.stakingToken = _stakingToken;
    _programData.rewardToken = _rewardToken;
    _programData.rewardDuration = _duration;
    _programData.rewardPool = address(this);

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

  function stake(uint256 uuid, uint256 amount) override external onlyWalletManager {
    if (!walletStake[uuid].started) {
      walletStake[uuid] = Stake(true, block.timestamp, amount,0,0);
    } else {
      Stake storage onGoingStake = walletStake[uuid];
      onGoingStake.principal += amount;
    }

    emit Staked(uuid, amount);
  }


  function unstake(
    uint256 uuid,
    address receiver,
    uint256 amount
  ) 
    override
    external
    onlyWalletManager
  {
    uint256 reward = this.calculateReward(amount);

    Stake storage stake = walletStake[uuid];
    stake.generatedCharge = amount;
    stake.reward = reward;

    // transfer ionx to user
    IERC20(_programData.rewardToken).transfer(receiver, reward);

    emit Unstaked(uuid, amount);
  }

  function leptonDeposit(uint256 uuid)
    external
    onlyBasketManager
  {
    require(walletStake[uuid].started, "Stake not started");

    if (true) {
      leptonsStake[uuid] = LeptonsMultiplier(0, block.timestamp, 0);
    }


  }

  // Reward calculation
  function calculateReward(
    uint256 amount
  )
    external
    view
    returns(
      uint256 ajustedReward
    )
  {
    // TODO: should be check > 0 ?
    uint256 baseReward = amount.mul(baseMultiplier).div(PERCENTAGE_SCALE);
    ajustedReward = this.convertDecimals(baseReward);
  }

  function convertDecimals(
    uint256 reward
  )
    external
    view
    returns (
      uint256 rewardAjustedDecimals
    )
  {
    // todo: convert into generic.
    rewardAjustedDecimals = reward.mul(10**(12));
  }

  // Admin
  function setBaseMultiplier(uint256 newMultiplier)
    external
    onlyOwner
  {
    baseMultiplier = newMultiplier;
  }

  function setRewardWalletManager(address newRewardWalletManager)
    external
    onlyOwner
  {
    rewardWalletManager = newRewardWalletManager;
  }

  function setRewardBasketManager(address newRewardBasketManager)
    external
    onlyOwner
  {
    rewardBasketManager = newRewardBasketManager;
  }

  modifier onlyWalletManager() {
    require(msg.sender == rewardWalletManager, "Not wallet manager");
    _;
  }

  modifier onlyBasketManager() {
    require(msg.sender == rewardBasketManager, "Not basket manager");
    _;
  }
}
