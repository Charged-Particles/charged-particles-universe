const { expect } = require('chai');

const {
  ethers,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
} = require('../../js-helpers/deploy');

const { getChargedContracts } = require('../helpers.js')

describe('Reward program', function () {
  let rewardProgram,
    ionx,
    protocolOwnerAddress,
    deployerAddress,
    protocolOwnerSigner,
    deployerSigner;

  before(async () => {
    const { deployer, protocolOwner } = await getNamedAccounts();
    protocolOwnerAddress = protocolOwner;
    deployerAddress = deployer;
    protocolOwnerSigner = ethers.provider.getSigner(protocolOwnerAddress);
    deployerSigner = ethers.provider.getSigner(deployerAddress);
  });

  before(async () => {
    const chainId = await getChainId();

    const ddIonx = getDeployData('Ionx', chainId);
    const Ionx = await ethers.getContractFactory('Ionx');
    ionx = await Ionx.attach(ddIonx.address);

    const { protonC } = await getChargedContracts();

    console.log(protonC);
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
  });
});