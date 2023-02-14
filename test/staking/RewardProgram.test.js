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
    rewardProgram = await RewardProgram.attach(ddRewardProgram.address); 
  });

  it('should be deployed', async function () {
    console.log(rewardProgram.address);
    expect(rewardProgram.address).to.not.equal(0);
  });
});