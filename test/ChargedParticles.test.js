const { presets, getDeployData } = require('../js-utils/deploy-helpers');
const { expect } = require('chai');
const { ethers, network } = require('hardhat');

const alchemyTimeout = 1; // wait 1s between requests, so AlchemyAPI doesn't overheat.

const decoder = new ethers.utils.AbiCoder();

describe("Charged Particles", () => {

  let universe;
  let chargedParticles;
  let aaveWalletManager;
  let proton;
  let ion;
  let timelocks;

  beforeEach(async () => {
    const Universe = await ethers.getContractFactory('Universe');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const Proton = await ethers.getContractFactory('Proton');
    const Ion = await ethers.getContractFactory('Ion');
    const IonTimelock = await ethers.getContractFactory('IonTimelock');

    universe = Universe.attach(getDeployData('Universe', network.config.chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', network.config.chainId).address);
    aaveWalletManager = AaveWalletManager.attach(getDeployData('AaveWalletManager', network.config.chainId).address);
    proton = Proton.attach(getDeployData('Proton', network.config.chainId).address);
    ion = Ion.attach(getDeployData('Ion', network.config.chainId).address);
    timelocks = Object.values(getDeployData('IonTimelocks', network.config.chainId))
      .map(async ionTimelock => (IonTimelock.attach(ionTimelock.address)));
  });

  it("should deploy with the liquidity provider set to 'Aave'", async () => {
    expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
  });

});
