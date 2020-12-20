const {
  ethers,
  network,
  upgrades,
  waffle,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

// This can lead to multiple issues, see: https://hardhat.org/guides/waffle-testing.html#adapting-the-tests
// const {
//   solidity,
//   deployContract
// } = require('ethereum-waffle');

// const {
//   deployContract
// } = waffle;

const {
  getDeployData,
  toWei,
  toBN,
  presets
} = require('../js-utils/deploy-helpers');

const {
  getNetworkBlockNumber,
  setNetworkAfterBlockNumber
} = require('./helpers/network')(network);

const callAndReturn = require('./helpers/callAndReturn');

const chai = require('chai');
// // chai.use(solidity);
const { expect } = chai;


const ERC20Mintable = require('../build/contracts/contracts/test/ERC20Mintable.sol/ERC20Mintable.json');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';

const daiABI = require('./abis/dai');
const daiMaster = '0x9eb7f2591ed42dee9315b6e2aaf21ba85ea69f8c';



describe("Charged Particles", () => {
  let chainId;

  // External contracts
  let dai;

  // Internal contracts
  let universe;
  let chargedParticles;
  let aaveWalletManager;
  let proton;
  let ion;
  let timelocks;

  // Settings
  let annuityPct = '1000';  // 10%
  let burnToRelease = false;

  // Accounts
  let trustedForwarder;
  let deployer;

  // let daiSigner;
  let user1;
  let user2;
  let signer1;
  let signer2;

  beforeEach(async () => {
    chainId = await getChainId(); // chainIdByName(network.name);

    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [daiMaster]
    });

    [deployer] = await ethers.getSigners();

    daiSigner = ethers.provider.getSigner(daiMaster);
    const namedAccts = (await getNamedAccounts());
    trustedForwarder = namedAccts.trustedForwarder;

    user1 = namedAccts.user1;
    user2 = namedAccts.user2;
    signer1 = ethers.provider.getSigner(user1);
    signer2 = ethers.provider.getSigner(user2);

    // With Forked Mainnet
    dai = new ethers.Contract(presets.Aave.v1.dai['31337'], daiABI, daiSigner);

    // Without Forked Mainnet
    // dai = await deployContract(deployer, ERC20Mintable, ['Test Dai', 'DAI']);


    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const Proton = await ethers.getContractFactory('Proton');
    const Ion = await ethers.getContractFactory('Ion');
    const IonTimelock = await ethers.getContractFactory('IonTimelock');

    universe = Universe.attach(getDeployData('Universe', chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    aaveWalletManager = AaveWalletManager.attach(getDeployData('AaveWalletManager', chainId).address);
    proton = Proton.attach(getDeployData('Proton', chainId).address);
    ion = Ion.attach(getDeployData('Ion', chainId).address);
    timelocks = Object.values(getDeployData('IonTimelocks', chainId))
      .map(async ionTimelock => (IonTimelock.attach(ionTimelock.address)));
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiMaster]
    });
  });

  it('should deploy with the liquidity provider set to "Aave"', async () => {
    expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
  });

  it("can succesfully energize and release proton", async () => {

    await dai.transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave',                       // liquidityProviderId
        presets.Aave.v1.dai['31337'], // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
        burnToRelease,                // burnToRelease
      ],
      callValue: presets.Proton.mintFee.toString(),
    });

    await proton.connect(signer2).releaseParticle(
      user2,
      energizedParticleId,
      'aave',
      presets.Aave.v1.dai['31337']
    );

    expect(await dai.balanceOf(user2)).to.be.above(toWei('9.9'));

  });

  it("can discharge only after timelock expired", async () => {
    await dai.transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    const user2BalanceBefore = await dai.balanceOf(user2);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,
        user2,
        TEST_NFT_TOKEN_URI,
        'aave',
        presets.Aave.v1.dai['31337'],
        toWei('10'),
        annuityPct,
        burnToRelease,
      ],
      callValue: presets.Proton.mintFee.toString()
    });

    const blockNumberTimelock = (await getNetworkBlockNumber()).add(toBN('10'));

    await chargedParticles.connect(signer2).setDischargeTimelock(
      proton.address,
      energizedParticleId,
      blockNumberTimelock
    );

    expect(await getNetworkBlockNumber()).to.be.below(blockNumberTimelock);

    await expect(chargedParticles.connect(signer2).dischargeParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      presets.Aave.v1.dai['31337']
    )).to.be.revertedWith("ChargedParticles: TOKEN_TIMELOCKED");

    await setNetworkAfterBlockNumber(blockNumberTimelock);

    await chargedParticles.connect(signer2).dischargeParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      presets.Aave.v1.dai['31337']
    );

    expect((await dai.balanceOf(user2)).sub(user2BalanceBefore)).to.be.above(toWei('0'));
  });

});
