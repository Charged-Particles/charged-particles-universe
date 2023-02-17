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
  let rewardProgram;
  beforeEach(async function () {
    const ddRewardProgram = getDeployData('RewardProgram');
    const RewardProgram = await ethers.getContractFactory('RewardProgram');
    rewardProgram = RewardProgram.attach(ddRewardProgram.address); 

    // instantiate ionx erc20s
  });

  it('should be deployed', async () =>{
    expect(rewardProgram.address).to.not.equal(0);

    const rewardData = await rewardProgram.getProgramData();
    expect(rewardData.totalStake).to.equal(0);
  });

  describe('Funds reward pool', () => {
    it('Has balance', async() => {
      const chainId = await getChainId();
      const ddIonx = getDeployData('Ionx', chainId);
      const Ionx = await ethers.getContractFactory('Ionx');
      const ionx = await Ionx.attach(ddIonx.address);

      const { protocolOwner} = await getNamedAccounts();
      const balance = await ionx.balanceOf(protocolOwner);

    });
    
    it.skip('Deposits IONX into the reward pool', async () => {


    });
  });
});