const { ethers, network } = require('hardhat');
const { expect } = require('chai');
const { presets, getDeployData, toWei, toBN } = require('../js-utils/deploy-helpers');
const { getNetworkBlockNumber, setNetworkAfterBlockNumber } = require('./helpers/network')(network);
const daiABI = require('./abis/dai');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';
const daiMaster = '0x9eb7f2591ed42dee9315b6e2aaf21ba85ea69f8c';

describe("Charged Particles", () => {
  let dai;
  let universe;
  let chargedParticles;
  let aaveWalletManager;
  let proton;
  let ion;
  let timelocks;

  let annuityPct;
  let burnToRelease;

  let daiSigner;
  let user1;
  let user2;
  let protonCreator;
  let dischargeBeneficiary;

  beforeEach(async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [daiMaster]
    });

    daiSigner = ethers.provider.getSigner(daiMaster);
    user1 = (await getNamedAccounts()).user1;
    user2 = (await getNamedAccounts()).user2;
    protonCreator = ethers.provider.getSigner(user1);
    dischargeBeneficiary = ethers.provider.getSigner(user2);

    annuityPct = '1000'; // 10%
    burnToRelease = false;

    const Universe = await ethers.getContractFactory('Universe');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const Proton = await ethers.getContractFactory('Proton');
    const Ion = await ethers.getContractFactory('Ion');
    const IonTimelock = await ethers.getContractFactory('IonTimelock');

    dai = new ethers.Contract(presets.Aave.v1.dai['31337'], daiABI, daiSigner);
    universe = Universe.attach(getDeployData('Universe', network.config.chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', network.config.chainId).address);
    aaveWalletManager = AaveWalletManager.attach(getDeployData('AaveWalletManager', network.config.chainId).address);
    proton = Proton.attach(getDeployData('Proton', network.config.chainId).address);
    ion = Ion.attach(getDeployData('Ion', network.config.chainId).address);
    timelocks = Object.values(getDeployData('IonTimelocks', network.config.chainId))
      .map(async ionTimelock => (IonTimelock.attach(ionTimelock.address)));
  });

  afterEach(async () => {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiMaster]
    });
  });

  it("should deploy with the liquidity provider set to 'Aave'", async () => {
    expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
  });

  it("can succesfully energize and release proton", async () => {

    await dai.transfer(user1, toWei('10'));
    await dai.connect(protonCreator)['approve(address,uint256)'](proton.address, toWei('10'));

    const energizedParticleId = await proton.connect(protonCreator).callStatic.createChargedParticle(
      user1,
      user2,
      TEST_NFT_TOKEN_URI,
      'aave',
      presets.Aave.v1.dai['31337'],
      toWei('10'),
      annuityPct,
      burnToRelease,
      {
        value: presets.Proton.mintFee.toString()
      }
    );
    await proton.connect(protonCreator).createChargedParticle(
      user1,
      user2,
      TEST_NFT_TOKEN_URI,
      'aave',
      presets.Aave.v1.dai['31337'],
      toWei('10'),
      annuityPct,
      burnToRelease,
      {
        value: presets.Proton.mintFee.toString()
      }
    );

    await proton.connect(dischargeBeneficiary).releaseParticle(
      user2,
      energizedParticleId,
      'aave',
      presets.Aave.v1.dai['31337']
    );

    expect(await dai.balanceOf(user2)).to.be.above(toWei('9.9'));

  });

  it("can discharge only after timelock expired", async () => {
    await dai.transfer(user1, toWei('10'));
    await dai.connect(protonCreator)['approve(address,uint256)'](proton.address, toWei('10'));

    const user2BalanceBefore = await dai.balanceOf(user2);

    const energizedParticleId = await proton.connect(protonCreator).callStatic.createChargedParticle(
      user1,
      user2,
      TEST_NFT_TOKEN_URI,
      'aave',
      presets.Aave.v1.dai['31337'],
      toWei('10'),
      annuityPct,
      burnToRelease,
      {
        value: presets.Proton.mintFee.toString()
      }
    );
    await proton.connect(protonCreator).createChargedParticle(
      user1,
      user2,
      TEST_NFT_TOKEN_URI,
      'aave',
      presets.Aave.v1.dai['31337'],
      toWei('10'),
      annuityPct,
      burnToRelease,
      {
        value: presets.Proton.mintFee.toString()
      }
    );

    const blockNumberTimelock = (await getNetworkBlockNumber()).add(toBN('10'));

    await chargedParticles.connect(dischargeBeneficiary).setDischargeTimelock(
      proton.address,
      energizedParticleId,
      blockNumberTimelock
    );

    expect(await getNetworkBlockNumber()).to.be.below(blockNumberTimelock);

    await expect(chargedParticles.connect(dischargeBeneficiary).dischargeParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      presets.Aave.v1.dai['31337']
    )).to.be.revertedWith("ChargedParticles: TOKEN_TIMELOCKED");

    await setNetworkAfterBlockNumber(blockNumberTimelock);

    await chargedParticles.connect(dischargeBeneficiary).dischargeParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      presets.Aave.v1.dai['31337']
    );

    expect((await dai.balanceOf(user2)).sub(user2BalanceBefore)).to.be.above(toWei('0'));
  });

});
