const buidler = require("@nomiclabs/buidler");
const { deploy } = require("../js-utils/deploy-helpers");
const { expect } = require("chai");

describe("Charged Particles", () => {

    let universe;
    let chargedParticles;
    let aaveWalletManager;
    let proton;
    let ion;
    let timelocks;

    beforeEach(async () => {
        let protocolDeployments = await deploy(buidler).protocol();
        universe = protocolDeployments.universe;
        chargedParticles = protocolDeployments.chargedParticles;
        aaveWalletManager = await deploy(buidler).aave();
        proton = await deploy(buidler).proton();
        ion = await deploy(buidler).ion();
        timelocks = await deploy(buidler).timelocks();
    });

    it("liquidity provider is Aave", async () => {
      expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
    });

  });