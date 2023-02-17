const { expect } = require('chai');

const {
  ethers,
  network,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
  presets
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
    it.skip('Deposits IONX into the reward pool', async () => {

    });
  });
});