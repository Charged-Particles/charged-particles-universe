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

  describe ('Reward basket manager', async () => {

    const ddChargedParticles = getDeployData('ChargedParticles', chainId);

    // impersonate charged particles address
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ddChargedParticles.address]
    });
    const chargedParticlesSigner = ethers.provider.getSigner(ddChargedParticles.address);

    const ddRewardBasketManager = getDeployData('RewardBasketManager', chainId);
    const RewardBasketManager = await ethers.getContractFactory('RewardBasketManager');
    const rewardBasketManager = await RewardBasketManager.attach(ddRewardBasketManager.address);
    console.log(rewardBasketManager.address);

    // test add basket 
    it ('Adds into basket', async () => {
      
    });

    // test release from basket
  });

  describe('Leptons staking', async () => {
    it ('Changes wallet and basket manager address', async () => {
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
      const uuid = 20;
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
      const uuid = 21;
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

    it('Checks lepton reward calculation with time spent', async () => {

      const stakeInfoCases = [
        {
          amount: 100,
          blocksUntilLeptonDeposit: 0,
          blocksUntilLeptonRelease: 500,
          blocksUntilCalculation: 495,
          leptonStakeMultiplier: 2,
          expectedReward: 150,
        },
        {
          amount: 100,
          blocksUntilLeptonDeposit: 0,
          blocksUntilLeptonRelease: 1000,
          blocksUntilCalculation: 0,
          leptonStakeMultiplier: 4,
          expectedReward: 399,
        },
        {
          amount: 100,
          blocksUntilLeptonDeposit: 500,
          blocksUntilLeptonRelease: 500,
          blocksUntilCalculation: 500,
          leptonStakeMultiplier: 2,
          expectedReward: 133,
        },
        {
          amount: 100,
          blocksUntilLeptonDeposit: 500,
          blocksUntilLeptonRelease: 500,
          blocksUntilCalculation: 500,
          leptonStakeMultiplier: 0,
          expectedReward: 100,
        },
      ];
      
      for(let i = 0; i < stakeInfoCases.length; i++) {
        await leptonMock.mock.getMultiplier.returns(stakeInfoCases[i].leptonStakeMultiplier);
  
        await rewardProgramDeployerSigner.stake(i, stakeInfoCases[i].amount).then(tx => tx.wait());
        
        await mineBlocks(stakeInfoCases[i].blocksUntilLeptonDeposit);
        await rewardProgramDeployerSigner.leptonDeposit(i, i).then(tx => tx.wait());

        await mineBlocks(stakeInfoCases[i].blocksUntilLeptonRelease);
        await rewardProgramDeployerSigner.leptonRelease(i).then(tx => tx.wait());

        await mineBlocks(stakeInfoCases[i].blocksUntilCalculation);
  
        const reward = await rewardProgramDeployerSigner.calculateLeptonReward(i, stakeInfoCases[i].amount);
        expect(reward).to.be.eq(stakeInfoCases[i].expectedReward);
      }
    });

    it('Calculates reward without removing lepton', async () => {
      const uuid = 100;
      const amount = 100;
      const leptonId = 35;
      const multiplier = 2;

      await leptonMock.mock.getMultiplier.returns(multiplier);

      await rewardProgramDeployerSigner.stake(uuid, amount).then(tx => tx.wait());
      await rewardProgramDeployerSigner.leptonDeposit(uuid, leptonId).then(tx => tx.wait());
        
      await mineBlocks(100)

      const reward = await rewardProgramDeployerSigner.calculateLeptonReward(uuid, amount); 
      expect(reward).to.be.eq((amount * multiplier) - 1);
    });
    
    it ('Calculates reward with lepton re-staking, resets lepton staking.', async () => {
      const uuid = 101;
      const amount = 100;
      const leptonId = 36;
      const multiplier = 2;

      await leptonMock.mock.getMultiplier.returns(multiplier);

      await rewardProgramDeployerSigner.stake(uuid, amount).then(tx => tx.wait());
      await rewardProgramDeployerSigner.leptonDeposit(uuid, leptonId).then(tx => tx.wait());

      await rewardProgramDeployerSigner.leptonRelease(uuid).then(tx => tx.wait());
      await rewardProgramDeployerSigner.leptonDeposit(uuid, leptonId).then(tx => tx.wait());

      await mineBlocks(1000);

      const reward = await rewardProgramDeployerSigner.calculateLeptonReward(uuid, amount); 
      expect(reward).to.be.eq(200);
    });
  });

});

const mineBlocks = async (numberOfBlocks) => {
  await ethers.provider.send("hardhat_mine", [ ethers.utils.hexValue(numberOfBlocks) ]);
  await ethers.provider.send("evm_mine");
}
