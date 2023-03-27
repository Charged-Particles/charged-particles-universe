// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

pragma experimental ABIEncoderV2;

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../lib/BlackholePrevention.sol";
import "../interfaces/ILepton.sol";

contract RewardProgram is IRewardProgram, Ownable, BlackholePrevention {
  using SafeMath for uint256;

  ProgramRewardData public _programData;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;   // 10000  (100%)
  uint256 public baseMultiplier;

  address public rewardWalletManager;
  address public rewardBasketManager;
  address public lepton = 0xc5a5C42992dECbae36851359345FE25997F5C42d;

  mapping(uint256 => Stake) public walletStake;
  mapping(uint256 => LeptonsStake) public leptonsStake;

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
      walletStake[uuid] = Stake(true, block.number, amount,0,0);
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
    uint256 baseReward = this.calculateReward(amount);
    uint256 reward = this.calculateLeptonReward(uuid, baseReward);

    Stake storage stake = walletStake[uuid];
    stake.generatedCharge = amount;
    stake.reward = reward;

    // transfer ionx to user
    IERC20(_programData.rewardToken).transfer(receiver, reward);

    emit Unstaked(uuid, amount);
  }

  function leptonDeposit(uint256 uuid, uint256 tokenId)
    external
    onlyBasketManager
  {
    require(walletStake[uuid].started, "Stake not started");

    uint256 multiplier = ILepton(lepton).getMultiplier(tokenId);

    leptonsStake[uuid] = LeptonsStake(multiplier, block.number, 0);
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
    // todo here should be the lepton calculation
    uint256 baseReward = amount.mul(baseMultiplier).div(PERCENTAGE_SCALE);
    ajustedReward = this.convertDecimals(baseReward);
  }

  function calculateLeptonReward(
    uint256 uuid,
    uint256 amount
  )
    external
    view
    returns(
      uint256
    )
  {
    LeptonsStake memory leptonStake = leptonsStake[uuid];
    uint256 multiplier = leptonStake.multiplier;

    uint256 rewardBlockLength = block.number.sub(walletStake[uuid].start);
    uint256 leptonDepositLength = block.number.sub(leptonStake.depositBlockNumber);

    if (multiplier == 0 || leptonDepositLength == 0 || rewardBlockLength == 0) {
      return amount;
    }

    if (leptonDepositLength > rewardBlockLength) {
      leptonDepositLength = rewardBlockLength;
    }
    
    // Percentage of the total program that the lepton was deposited for
    uint256 percentageOfLeptonInReward = leptonDepositLength.mul(PERCENTAGE_SCALE).div(rewardBlockLength);

    // Amount of reward that the lepton is responsible for 
    uint256 amountInMultiplier = amount.mul(percentageOfLeptonInReward);

    uint256 multipliedReward = amountInMultiplier.mul(multiplier).div(PERCENTAGE_SCALE);

    uint256 percentageWithoutLeptonReward = amount.sub(amountInMultiplier.div(PERCENTAGE_SCALE));

    return percentageWithoutLeptonReward.add(multipliedReward);
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

  function setLepton(address leptonAddress)
    external
    onlyOwner
  {
    lepton = leptonAddress;
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
