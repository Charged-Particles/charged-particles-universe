const { expect } = require('chai');

const {
  ethers,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
} = require('../../js-helpers/deploy');

describe('Reward program', function () {
  let rewardProgram, ionx, protocolOwnerAddress, deployerAddress;

  before(async () => {
    const chainId = await getChainId();
    const ddIonx = getDeployData('Ionx', chainId);
    const Ionx = await ethers.getContractFactory('Ionx');
    ionx = await Ionx.attach(ddIonx.address);

    const { deployer, protocolOwner } = await getNamedAccounts();
    protocolOwnerAddress = protocolOwner;
    deployerAddress = deployer;
  });

  beforeEach(async function () {
    const ddRewardProgram = getDeployData('RewardProgram');
    const RewardProgram = await ethers.getContractFactory('RewardProgram');
    rewardProgram = RewardProgram.attach(ddRewardProgram.address); 
  });

  it('should be deployed', async () =>{
    expect(rewardProgram.address).to.not.equal(0);
    const rewardData = await rewardProgram.getProgramData();
    expect(rewardData.totalStake).to.equal(0);
  });

  describe('Funds reward pool', () => {
    it('Has balance', async() => {
      const balance = await ionx.balanceOf(protocolOwnerAddress);
      expect(balance).to.gt(0)
    });
    
    it('Deposits IONX into the reward pool', async () => {
      const protocolOwnerSigner = ethers.provider.getSigner(protocolOwnerAddress);
      const deployerSigner = ethers.provider.getSigner(deployerAddress);

      const approveIonxUsageTx = await ionx.connect(protocolOwnerSigner).transfer(deployerAddress, 1000);
      await approveIonxUsageTx.wait();

      const balance = await ionx.balanceOf(deployerAddress);
      const approveReward = await ionx.connect(deployerSigner).approve(rewardProgram.address, 100).then((tx) => tx.wait());

      const fundTx = await rewardProgram.connect(deployerSigner).fund(1);
      const fundReceipt = await fundTx.wait();
      // console.log(fundReceipt);
      const rewardProgramBalance = await ionx.balanceOf(rewardProgram.address);
      console.log(rewardProgramBalance);
    });
  });
});