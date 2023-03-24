const { expect } = require('chai');
const { deployMockContract } = require('ethereum-waffle');

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
    it('Changes wallet and basket manager address', async () => {
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

    it('Verifies lepton reward calculation', async () => {
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
     const reward = await rewardProgramDeployerSigner.calculateLeptonReward(uuid, 100);
     console.log(reward.toString());
    });
    
  });
});