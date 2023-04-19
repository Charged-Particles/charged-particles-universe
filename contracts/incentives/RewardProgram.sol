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
  mapping(uint256 => Stake) public walletStake;
  mapping(uint256 => LeptonsStake) public leptonsStake;

  address public rewardWalletManager;
  address public rewardBasketManager;
  uint256 public baseMultiplier;
  address public lepton = 0x3Cd2410EAa9c2dCE50aF6CCAb72Dc93879a09c1F;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;   // 10000 (100%)
  uint256 constant internal LEPTON_MULTIPLIER_SCALE = 1e2;   // 100

  constructor(
    address _stakingToken,
    address _rewardToken,
    address _rewardWalletManager,
    uint256 _duration,
    uint256 _baseMultiplier
  ) public {
    _programData.rewardDuration = _duration;
    _programData.stakingToken = _stakingToken;
    _programData.rewardToken = _rewardToken;
    _programData.rewardPool = address(this);

    rewardWalletManager = _rewardWalletManager;
    baseMultiplier = _baseMultiplier;

    emit RewardProgramCreated(address(this));
  }

  function getProgramData()
    external
    view
    returns (ProgramRewardData memory programData)
  {
    return _programData;
  }

  function fundProgram(uint256 amount)
    external
    override
    onlyOwner
  {
    IERC20 token = IERC20(_programData.rewardToken);

    token.transferFrom(msg.sender, address(this), amount);

    _programData.rewardPoolBalance += amount;

    emit RewardProgramFunded(amount);
  }

  function stake(
    uint256 uuid,
    uint256 amount
  )
    override
    external
    onlyWalletManager
  {
    bool stakeInitialized = walletStake[uuid].started;

    if (!stakeInitialized) {
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
    uint256 generatedCharge
  ) 
    override
    external
    onlyWalletManager
  {
    uint256 reward = calculateRewardsEarned(uuid, generatedCharge);

    Stake storage stake = walletStake[uuid];
    uint256 totalReward = stake.reward.add(reward.sub(stake.reward));

    stake.reward = 0;
    
    // transfer ionx to user
    IERC20(_programData.rewardToken).transfer(receiver, totalReward);

    emit Unstaked(uuid, totalReward);
  }

  function registerLeptonDeposit(uint256 uuid, uint256 tokenId)
    external
    onlyBasketManager
  {
    uint256 multiplier = ILepton(lepton).getMultiplier(tokenId);

    leptonsStake[uuid] = LeptonsStake(multiplier, block.number, 0);
    emit LeptonDeposit(uuid);
  }

  function registerLeptonRelease(
    address basketNFT,
    uint256 basketTokenId,
    uint256 uuid
  )
    external
    onlyBasketManager
  {
    // get this charged amount 
   (, uint256 generatedCharge) = IBaseWalletManager(rewardWalletManager) 
      .getInterest(basketNFT, basketTokenId, _programData.stakingToken);

    // Calculate reward
    uint256 reward = calculateRewardsEarned(uuid, generatedCharge);

    LeptonsStake storage leptonStake = leptonsStake[uuid];
    leptonStake.releaseBlockNumber = block.number;

    Stake storage stake = walletStake[uuid];
    stake.reward = stake.reward.add(reward.sub(stake.reward));
    stake.start = block.number;

    emit LeptonRelease(uuid);
  }

  // Reward calculation
  function calculateBaseReward(
    uint256 amount
  )
    public
    view
    returns(
      uint256 ajustedReward
    )
  {
    uint256 baseReward = amount.mul(baseMultiplier).div(PERCENTAGE_SCALE);
    ajustedReward = convertDecimals(baseReward);
  }

  function calculateLeptonMultipliedReward(
    uint256 uuid,
    uint256 amount
  )
    public
    view
    returns(
      uint256
    )
  {
    LeptonsStake memory leptonStake = leptonsStake[uuid];
    uint256 multiplier = leptonStake.multiplier;

    uint256 rewardBlockLength = block.number.sub(walletStake[uuid].start);
    uint256 leptonDepositLength;

    if (leptonStake.releaseBlockNumber > 0 ) {
      leptonDepositLength = leptonStake.releaseBlockNumber.sub(leptonStake.depositBlockNumber);
    } else {
      leptonDepositLength = block.number.sub(leptonStake.depositBlockNumber);
    }

    if (multiplier == 0 || leptonDepositLength == 0 || rewardBlockLength == 0) {
      return amount;
    }

    if (leptonDepositLength > rewardBlockLength) {
      leptonDepositLength = rewardBlockLength;
    }
    
    // Percentage of the total program that the lepton was deposited for
    uint256 percentageOfLeptonInReward = leptonDepositLength.mul(PERCENTAGE_SCALE).div(rewardBlockLength);

    // Amount of reward that the lepton is responsible for 
    uint256 amountGenerateDuringLeptonDeposit = amount.mul(percentageOfLeptonInReward);

    uint256 multipliedReward = amountGenerateDuringLeptonDeposit.mul(multiplier.mul(LEPTON_MULTIPLIER_SCALE))
      .div(PERCENTAGE_SCALE * LEPTON_MULTIPLIER_SCALE);

    uint256 amountGeneratedWithoutLeptonDeposit = amount.sub(amountGenerateDuringLeptonDeposit.div(PERCENTAGE_SCALE));

    return amountGeneratedWithoutLeptonDeposit.add(multipliedReward);
  }

  function convertDecimals(
    uint256 reward
  )
    internal
    view
    returns (
      uint256 rewardAjustedDecimals
    )
  {
    rewardAjustedDecimals = reward.mul(10**(12));
  }

  function calculateRewardsEarned(
    uint256 uuid,
    uint256 generatedCharge
  )
    public
    view
    returns (
      uint256 totalReward
  ) {
    uint256 baseReward = calculateBaseReward(generatedCharge);
    totalReward = calculateLeptonMultipliedReward(uuid, baseReward);
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

interface IBaseWalletManager {
    function getInterest(address contractAddress, uint256 tokenId, address assetToken)
    external
    returns (uint256 creatorInterest, uint256 ownerInterest);
}