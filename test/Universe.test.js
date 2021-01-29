const {
  ethers,
  network,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
  toWei,
  toBN,
  presets
} = require('../js-helpers/deploy');

const { deployMockContract } = require('../js-helpers/deployMockContract');

const {
  callAndReturn,
  getNetworkBlockNumber,
  setNetworkAfterBlockNumber,
  setNetworkAfterTimestamp
} = require('../js-helpers/test')(network);

const { expect } = require('chai');
const { max } = require('lodash');

const IERC721Chargeable = require('../build/contracts/contracts/interfaces/IERC721Chargeable.sol/IERC721Chargeable.json');
const daiABI = require('./abis/dai');

const daiHodler = "0x55e4d16f9c3041EfF17Ca32850662f3e9Dddbce7"; // Hodler with the highest current amount of DAI, used for funding our operations on mainnet fork.

const { AddressZero } = require('ethers').constants

const TEST_ADDRESS = '0x1337c0d31337c0D31337C0d31337c0d31337C0d3';
const TEST_TOKEN_ID = '1337';
const TEST_TOKEN_UUID = '8706638828843884997044342892903048393456001661077993410406637059468102631482';
const TEST_OWNER_UUID = '15459833313077053585028058406669211050732661080790169365070923044456438610737';


let overrides = { gasLimit: 20000000 }

describe("Universe", () => {
  let chainId;

  // External contracts
  let erc721chargeable;
  let dai;
  let daiAddress;

  // Internal contracts
  let universe;
  let chargedParticlesAddress;
  let ionAddress;
  let protonAddress;

  // Accounts
  let trustedForwarder;
  let daiSigner;
  let deployer;
  let user1;
  let user2;
  let user3;
  let signerD;
  let signer1;
  let signer2;
  let signer3;

  beforeEach(async () => {
    chainId = await getChainId(); // chainIdByName(network.name);
    daiAddress = presets.Aave.v2.dai[chainId];

    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [daiHodler]
    });

    daiSigner = ethers.provider.getSigner(daiHodler);
    const namedAccts = (await getNamedAccounts());
    deployer = namedAccts.deployer
    trustedForwarder = namedAccts.trustedForwarder;
    user1 = namedAccts.user1;
    user2 = namedAccts.user2;
    user3 = namedAccts.user3;
    signerD = ethers.provider.getSigner(deployer);
    signer1 = ethers.provider.getSigner(user1);
    signer2 = ethers.provider.getSigner(user2);
    signer3 = ethers.provider.getSigner(user3);

    chargedParticlesAddress = getDeployData('ChargedParticles', chainId).address;
    ionAddress = getDeployData('Ion', chainId).address;
    protonAddress = getDeployData('Proton', chainId).address;

    // With Forked Mainnet
    dai = new ethers.Contract(daiAddress, daiABI, daiSigner);

    // Deploy Mocked Contracts
    erc721chargeable = await deployMockContract(signerD, IERC721Chargeable.abi, overrides);

    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    universe = Universe.attach(getDeployData('Universe', chainId).address);
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiHodler]
    });
  });


  describe('Contract Configuration', async () => {
    it('should allow the contract owner to set the ChargedParticles contract', async () => {
      let tx = universe.connect(signerD).setChargedParticles(chargedParticlesAddress);
      await expect(tx)
        .to.emit(universe, 'ChargedParticlesSet')
        .withArgs(chargedParticlesAddress);
    });

    it('should not allow anyone else to set the ChargedParticles contract', async () => {
      await expect(universe.connect(signer2).setChargedParticles(chargedParticlesAddress))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should not allow setting ChargedParticles to a non-contract address', async () => {
      await expect(universe.connect(signerD).setChargedParticles(AddressZero))
        .to.be.revertedWith('Universe: E-417');

      await expect(universe.connect(signerD).setChargedParticles(TEST_ADDRESS))
        .to.be.revertedWith('Universe: E-417');
    });


    it('should allow the contract owner to set the Cation contract', async () => {
      let tx = universe.connect(signerD).setCation(ionAddress, toWei('1'));
      await expect(tx)
        .to.emit(universe, 'CationSet')
        .withArgs(ionAddress, toWei('1'));
    });

    it('should not allow anyone else to set the Cation contract', async () => {
      await expect(universe.connect(signer2).setCation(ionAddress, toWei('1')))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should not allow setting Cation to a non-contract address', async () => {
      await expect(universe.connect(signerD).setCation(AddressZero, toWei('1')))
        .to.be.revertedWith('Universe: E-417');

      await expect(universe.connect(signerD).setCation(TEST_ADDRESS, toWei('1')))
        .to.be.revertedWith('Universe: E-417');
    });


    it('should allow the contract owner to set the Proton contract', async () => {
      let tx = universe.connect(signerD).setProtonToken(protonAddress);
      await expect(tx)
        .to.emit(universe, 'ProtonTokenSet')
        .withArgs(protonAddress);
    });

    it('should not allow anyone else to set the Proton contract', async () => {
      await expect(universe.connect(signer2).setProtonToken(protonAddress))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should not allow setting Proton to a non-contract address', async () => {
      await expect(universe.connect(signerD).setProtonToken(AddressZero))
        .to.be.revertedWith('Universe: E-417');

      await expect(universe.connect(signerD).setProtonToken(TEST_ADDRESS))
        .to.be.revertedWith('Universe: E-417');
    });
  });

});
