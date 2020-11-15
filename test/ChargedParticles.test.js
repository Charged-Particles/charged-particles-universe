const hre = require('hardhat');
const { presets, deploy } = require('../js-utils/deploy-helpers');
const { expect } = require('chai');

let alchemyTimeout = 1; // wait 1s between requests, so Infura doesn't overheat.

describe("Charged Particles", () => {

    let universe;
    let chargedParticles;
    let aaveWalletManager;
    let proton;
    let ion;
    let timelocks;

    beforeEach(async () => {
        let protocolDeployments = await deploy(hre, alchemyTimeout).protocol();
        universe = protocolDeployments.universe;
        chargedParticles = protocolDeployments.chargedParticles;
        aaveWalletManager = await deploy(hre, alchemyTimeout).aave();
        proton = await deploy(hre, alchemyTimeout).proton();
        ion = await deploy(hre, alchemyTimeout).ion();
        timelocks = await deploy(hre, alchemyTimeout).timelocks();
    });

    it("Liquidity provider is Aave", async () => {
      expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
    });

    it("Lending Pool has been set for Aave", async () => {
        expect((aaveWalletManager.filters.LendingPoolProviderSet(presets.Aave.lendingPoolProvider[hre.network.chainId])).length).to.equal(1);
    });

  });