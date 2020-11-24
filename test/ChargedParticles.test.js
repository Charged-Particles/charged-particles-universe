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
    universe = await (await ethers.getContractFactory('Universe')).attach(getDeployData('Universe', network.config.chainId).address);
    chargedParticles = await (await ethers.getContractFactory('ChargedParticles')).attach(getDeployData('ChargedParticles', network.config.chainId).address);
    aaveWalletManager = await (await ethers.getContractFactory('AaveWalletManager')).attach(getDeployData('AaveWalletManager', network.config.chainId).address);
    proton = await (await ethers.getContractFactory('Proton')).attach(getDeployData('Proton', network.config.chainId).address);
    ion = await (await ethers.getContractFactory('Ion')).attach(getDeployData('Ion', network.config.chainId).address);
    timelocks = Object.values(getDeployData('IonTimelocks', network.config.chainId)).map(async ionTimelock => await (await ethers.getContractFactory('IonTimelock')).attach(ionTimelock.address));
  });

  it("Liquidity provider is Aave", async () => {
    expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
  });

  it("Lending Pool has been set for Aave", async () => {
    expect(await aaveWalletManager.lendingPoolProvider()).to.equal(presets.Aave.lendingPoolProvider[network.config.chainId])
  });
});
