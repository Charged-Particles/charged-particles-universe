const buidler = require("@nomiclabs/buidler");
const { deploy, toBN } = require("../js-utils/deploy-helpers");
const { expect } = require("chai");

describe("Charged Particles", () => {

    let universe;
    let chargedParticles;
    let aaveWalletManager;
    let proton;
    let ion;
    let timelocks;

    beforeEach(async () => {
        let res = await deploy(buidler).protocol();
        universe = res.universe; chargedParticles = res.chargedParticles;
        res = await deploy(buidler).aave();
        aaveWalletManager = res.aaveWalletManager;
        res = await deploy(buidler).proton();
        proton = res.proton;
        res = await deploy(buidler).ion();
        ion = res.ion;
        res = await deploy(buidler).timelocks();
        timelocks = res.ionTimelocks
    });

    it("liquidity provider is Aave", async () => {
      expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
    });
  });