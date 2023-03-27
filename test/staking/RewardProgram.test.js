const { expect } = require('chai');
const { deployMockContract } = require('ethereum-waffle');
// const { mine } = require("@nomicfoundation/hardhat-network-helpers");

const {
  ethers,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
} = require('../../js-helpers/deploy');

describe('Reward program', function () {

  let rewardProgram,
    ionx,
    protocolOwnerAddress,
    deployerAddress,
    protocolOwnerSigner,
    deployerSigner,
    chainId,
    leptonMock,
    rewardProgramDeployerSigner;

  before(async () => {
    const { deployer, protocolOwner } = await getNamedAccounts();
    protocolOwnerAddress = protocolOwner;
    deployerAddress = deployer;
    protocolOwnerSigner = ethers.provider.getSigner(protocolOwnerAddress);
    deployerSigner = ethers.provider.getSigner(deployerAddress);
  });

  before(async () => {
    chainId = await getChainId();

    const ddIonx = getDeployData('Ionx', chainId);
    const Ionx = await ethers.getContractFactory('Ionx');
    ionx = await Ionx.attach(ddIonx.address);
  });

  beforeEach(async function () {
    const ddRewardProgram = getDeployData('RewardProgram');
    const RewardProgram = await ethers.getContractFactory('RewardProgram');
    rewardProgram = RewardProgram.attach(ddRewardProgram.address); 

    rewardProgramDeployerSigner = rewardProgram.connect(deployerSigner);

    // mock lepton
    const leptonData = getDeployData('Lepton', chainId);
    leptonMock = await deployMockContract(deployerSigner, leptonData.abi);
    rewardProgramDeployerSigner.setLepton(leptonMock.address).then(tx => tx.wait());
  });

  it('should be deployed', async () =>{
    expect(rewardProgramDeployerSigner.address).to.not.equal(0);
    const rewardData = await rewardProgramDeployerSigner.getProgramData();
    expect(rewardData.rewardPool).to.equal(rewardProgramDeployerSigner.address);
  });

  describe('Funds reward pool', () => {
    it('Has balance', async() => {
      const balance = await ionx.balanceOf(protocolOwnerAddress);
      expect(balance).to.gt(0)
    });
    
    it('Deposits IONX into the reward pool', async () => {
      const fundingAmount = 100;

      // Fund owner of reward program contract aka deployer
      const approveIonxUsageTx = await ionx.connect(protocolOwnerSigner).transfer(deployerAddress, fundingAmount);
      await approveIonxUsageTx.wait();

      // Approve reward program contract usage of deployer ionx tokens
      await ionx.connect(deployerSigner).approve(rewardProgram.address, fundingAmount).then((tx) => tx.wait());

      // Fund reward program
      await rewardProgram.connect(deployerSigner).fund(fundingAmount).then(tx => tx.wait());

      expect(await ionx.balanceOf(rewardProgram.address)).to.equal(fundingAmount);
    });

    it ('Calculates reward with multiplier as 100%', async () => {
      const chargedGeneratedInUsdc = ethers.utils.parseUnits('1', 6);
      const reward = await rewardProgram.calculateReward(chargedGeneratedInUsdc);
      expect(ethers.utils.formatEther(reward.toString(), 18)).to.be.eq('1.0');
    });

    it ('Reward with .5 multiplier', async () => {
      await rewardProgram.connect(deployerSigner).setBaseMultiplier(5000);

      const chargedGeneratedInUsdc = ethers.utils.parseUnits('1', 6);
      const reward = await rewardProgram.calculateReward(chargedGeneratedInUsdc);
      expect(ethers.utils.formatEther(reward.toString(), 18)).to.be.eq('0.5');

      await rewardProgram.connect(deployerSigner).setBaseMultiplier(15000);
      expect(ethers.utils.formatEther(await rewardProgram.calculateReward(chargedGeneratedInUsdc), 18)).to.be.eq('1.5');
      await rewardProgram.connect(deployerSigner).setBaseMultiplier(1000);
    });
  });

  describe('Leptons staking', async () => {
    it.only('Changes wallet and basket manager address', async () => {
      await expect(rewardProgramDeployerSigner.leptonDeposit(1,1)).to.be.revertedWith('Not basket manager');

      await rewardProgramDeployerSigner.setRewardWalletManager(deployerAddress).then(
        tx => tx.wait()
      );
      await rewardProgramDeployerSigner.setRewardBasketManager(deployerAddress).then(
        tx => tx.wait()
      );
      expect(await rewardProgram.rewardWalletManager()).to.be.eq(deployerAddress);
      expect(await rewardProgram.rewardBasketManager()).to.be.eq(deployerAddress);
    });

    it('Registers lepton deposit in reward program', async () => {
      const uuid = 1;
      const leptonId = 1;
      const leptonMultiplier = 20000; // x2

      await leptonMock.mock.getMultiplier.returns(leptonMultiplier);
      const blockBeforeDeposit = await ethers.provider.getBlock("latest")

      // only allow deposit if usdc is deposited, reward started.
      await expect(rewardProgramDeployerSigner.leptonDeposit(uuid, leptonId)).to.be.revertedWith('Stake not started');

      // start reward program with usdc
      await rewardProgramDeployerSigner.stake(uuid, 100).then(tx => tx.wait());

      await rewardProgramDeployerSigner.leptonDeposit(uuid, leptonId).then(tx => tx.wait());

      const leptonsData = await rewardProgramDeployerSigner.leptonsStake(uuid);

      expect(leptonsData.multiplier).to.be.eq(leptonMultiplier);
      expect(blockBeforeDeposit.number).to.be.lessThan(leptonsData.depositBlockNumber.toNumber());

      const principalForEmptyMultiplier = 100;
      const emptyMultiplierReward = await rewardProgramDeployerSigner.callStatic.calculateLeptonReward(2, principalForEmptyMultiplier);
      expect(emptyMultiplierReward).to.be.eq(principalForEmptyMultiplier);

      const emptyRewardMultiplier = await rewardProgramDeployerSigner.callStatic.calculateLeptonReward(2, 0);
      expect(emptyRewardMultiplier).to.be.eq(0);
    });

    it('Verifies simple lepton reward calculation', async () => {
      const principal = 100;
      const uuid = 1;
      const leptonId = 1;
      const leptonMultiplier = 20000; // x2

      await leptonMock.mock.getMultiplier.returns(leptonMultiplier);
      // stake 
      await rewardProgramDeployerSigner.stake(uuid, principal).then(tx => tx.wait());

      // deposit lepton
      await rewardProgramDeployerSigner.leptonDeposit(uuid, leptonId).then(tx => tx.wait());

      // calculate reward
     const reward = await rewardProgramDeployerSigner.calculateLeptonReward(uuid, principal);

     // Has multiplier but time spent is 0 so reward is multiplied by 1.
     expect(reward).to.be.eq(100);
    });

    it.only('Checks lepton reward calculation with time spent', async () => {
      const calculateExpectedReward = ({
        amount,
        rewardBlockLength,
        leptonStakeDepositBlockNumber,
        leptonStakeEndBlockNumber,
        leptonStakeMultiplier
      }) => {
        const leptonDepositLength = leptonStakeEndBlockNumber - leptonStakeDepositBlockNumber;
        const leptonPercentageInReward = rewardBlockLength / leptonDepositLength;
        const expectedReward = amount + (amount * leptonPercentageInReward * leptonStakeMultiplier);
        return expectedReward;
      };

      const stakeInfoCases = [
        {
          amount: 1000,
          rewardBlockLength: 150,
          leptonStakeDepositBlockNumber: 100,
          leptonStakeEndBlockNumber: 200,
          leptonStakeMultiplier: 2,
        },
        {
          amount: 5000,
          rewardBlockLength: 300,
          leptonStakeDepositBlockNumber: 200,
          leptonStakeEndBlockNumber: 400,
          leptonStakeMultiplier: 1,
        },
        {
          amount: 2000,
          rewardBlockLength: 400,
          leptonStakeDepositBlockNumber: 250,
          leptonStakeEndBlockNumber: 300,
          leptonStakeMultiplier: 0,
        },
        {
          amount: 3000,
          rewardBlockLength: 200,
          leptonStakeDepositBlockNumber: 150,
          leptonStakeEndBlockNumber: 250,
          leptonStakeMultiplier: 5,
        },
        {
          amount: 500,
          rewardBlockLength: 100,
          leptonStakeDepositBlockNumber: 50,
          leptonStakeEndBlockNumber: 150,
          leptonStakeMultiplier: 3,
        }
      ];
      
      
      await leptonMock.mock.getMultiplier.returns(2);

      await rewardProgramDeployerSigner.stake(1, stakeInfoCases[0].amount).then(tx => tx.wait());

      await rewardProgramDeployerSigner.leptonDeposit(1, 1).then(tx => tx.wait());

      const blockBeforeDeposit = await ethers.provider.getBlock("latest")

      // const rewardA = await rewardProgramDeployerSigner.calculateLeptonReward(1, stakeInfoCases[0].amount);

      await ethers.provider.send("hardhat_mine", [ ethers.utils.hexValue(100000) ]);
      await ethers.provider.send("evm_mine") // this one will have 02:00 PM as its timestamp 
      // await mine(1000);

      const blockAfterDeposit = await ethers.provider.getBlock("latest")
      // console.log(blockAfterDeposit.number - blockBeforeDeposit.number);

      const reward = await rewardProgramDeployerSigner.calculateLeptonReward(1, stakeInfoCases[0].amount);
      console.log(reward.toString());

      // stakeInfoCases.map(stakeInfo => {
      //   // calculate reward
      //   const expectedReward = calculateExpectedReward(stakeInfo);
      //   console.log('expectedReward', expectedReward);

      // });
      
    });
    
  });
});