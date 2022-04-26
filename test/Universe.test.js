const {
  ethers,
  network,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
  presets
} = require('../js-helpers/deploy');

const {
  toWei,
  toBN,
} = require('../js-helpers/utils');

const { deployMockContract } = require('../js-helpers/deployMockContract');

const {
  callAndReturn,
  getNetworkBlockNumber,
  setNetworkAfterBlockNumber,
  setNetworkAfterTimestamp
} = require('../js-helpers/test')(network);

const { expect } = require('chai');
const { max } = require('lodash');

const EthSender = require('../build/contracts/contracts/test/EthSender.sol/EthSender.json');
const IERC721Chargeable = require('../build/contracts/contracts/interfaces/IERC721Chargeable.sol/IERC721Chargeable.json');
const ERC20Mintable = require('../build/contracts/contracts/test/ERC20Mintable.sol/ERC20Mintable.json');
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
  let erc20token;
  let erc721chargeable;
  let dai;
  let daiAddress;

  // Internal contracts
  let universe;
  let chargedParticlesAddress;
  let ionxAddress;
  let protonAddress;
  let ethSender;

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
    ionxAddress = getDeployData('Ionx', chainId).address;
    protonAddress = getDeployData('Proton', chainId).address;

    // With Forked Mainnet
    dai = new ethers.Contract(daiAddress, daiABI, daiSigner);

    // Deploy Mocked Contracts
    erc20token = await deployMockContract(signerD, ERC20Mintable.abi, overrides);
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

  describe('Events', async () => {
    it('should only allow ChargedParticles to call specific events', async () => {
      await expect(universe.connect(signer1).onEnergize(user1, user2, TEST_ADDRESS, TEST_TOKEN_ID, 'generic', daiAddress, toWei('1')))
        .to.be.revertedWith('UNI:E-108');

      await expect(universe.connect(signer1).onDischarge(TEST_ADDRESS, TEST_TOKEN_ID, 'generic', daiAddress, toWei('1'), toWei('1')))
        .to.be.revertedWith('UNI:E-108');

      await expect(universe.connect(signer1).onDischargeForCreator(TEST_ADDRESS, TEST_TOKEN_ID, 'generic', daiAddress, daiAddress, toWei('1')))
        .to.be.revertedWith('UNI:E-108');

      await expect(universe.connect(signer1).onRelease(TEST_ADDRESS, TEST_TOKEN_ID, 'generic', daiAddress, toWei('1'), toWei('1'), toWei('1')))
        .to.be.revertedWith('UNI:E-108');

      await expect(universe.connect(signer1).onCovalentBond(TEST_ADDRESS, TEST_TOKEN_ID, 'generic', daiAddress, '1', 1))
        .to.be.revertedWith('UNI:E-108');

      await expect(universe.connect(signer1).onCovalentBreak(TEST_ADDRESS, TEST_TOKEN_ID, 'generic', daiAddress, '1', 1))
        .to.be.revertedWith('UNI:E-108');
    });

    it('should only allow Proton to call specific events', async () => {
      await expect(universe.connect(signer1).onProtonSale(TEST_ADDRESS, TEST_TOKEN_ID, user2, user3, toWei('1'), user1, toWei('1')))
        .to.be.revertedWith('UNI:E-110');
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
        .to.be.revertedWith('UNI:E-417');

      await expect(universe.connect(signerD).setChargedParticles(TEST_ADDRESS))
        .to.be.revertedWith('UNI:E-417');
    });


    it('should allow the contract owner to set the Ion contract', async () => {
      let tx = universe.connect(signerD).setPhoton(ionxAddress, toWei('1'));
      await expect(tx)
        .to.emit(universe, 'PhotonSet')
        .withArgs(ionxAddress, toWei('1'));
    });

    it('should not allow anyone else to set the Ion contract', async () => {
      await expect(universe.connect(signer2).setPhoton(ionxAddress, toWei('1')))
        .to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should not allow setting Ion to a non-contract address', async () => {
      await expect(universe.connect(signerD).setPhoton(AddressZero, toWei('1')))
        .to.be.revertedWith('UNI:E-417');

      await expect(universe.connect(signerD).setPhoton(TEST_ADDRESS, toWei('1')))
        .to.be.revertedWith('UNI:E-417');
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
        .to.be.revertedWith('UNI:E-417');

      await expect(universe.connect(signerD).setProtonToken(TEST_ADDRESS))
        .to.be.revertedWith('UNI:E-417');
    });
  });


  describe('Blackhole Prevention', async () => {
    beforeEach(async () => {
      const EthSenderFactory = new ethers.ContractFactory(EthSender.abi, EthSender.bytecode, signerD);
      ethSender = await EthSenderFactory.deploy();
      await ethSender.deployTransaction.wait();
    });

    it('should not allow sending ETH into the contract', async () => {
      // No fallback or receive functions
      await expect(signer1.sendTransaction({to: universe.address, value: toWei('10')}))
        .to.be.revertedWith('function selector was not recognized and there\'s no fallback nor receive function');
    });

    it('should allow only the contract owner to release stuck ETH from the contract', async () => {
      const amount = toWei('10');

      // Force ETH into ChargedParticles Contract
      await signer1.sendTransaction({to: ethSender.address, value: amount});
      await ethSender.sendEther(universe.address);

      // Attempt withdraw by Non-Owner
      await expect(universe.connect(signer2).withdrawEther(user2, amount))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(universe.connect(signerD).withdrawEther(user1, amount))
        .to.emit(universe, 'WithdrawStuckEther')
        .withArgs(user1, amount);
    });

    it('should allow the contract owner to release stuck ERC20s from the contract', async () => {
      const amount = toWei('10');

      await erc20token.mock.balanceOf.withArgs(universe.address).returns(amount);
      await erc20token.mock.transfer.withArgs(user1, amount).returns(true);

      // Attempt withdraw by Non-Owner
      await expect(universe.connect(signer2).withdrawErc20(user1, erc20token.address, amount))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(universe.connect(signerD).withdrawErc20(user1, erc20token.address, amount))
        .to.emit(universe, 'WithdrawStuckERC20')
        .withArgs(user1, erc20token.address, amount);
    });

    it('should allow the contract owner to release stuck ERC721s from the contract', async () => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(universe.address);
      await erc721chargeable.mock.transferFrom.withArgs(universe.address, user1, TEST_TOKEN_ID).returns();

      // Attempt withdraw by Non-Owner
      await expect(universe.connect(signer2).withdrawERC721(user1, erc721chargeable.address, TEST_TOKEN_ID))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(universe.connect(signerD).withdrawERC721(user1, erc721chargeable.address, TEST_TOKEN_ID))
        .to.emit(universe, 'WithdrawStuckERC721')
        .withArgs(user1, erc721chargeable.address, TEST_TOKEN_ID);
    });
  });

});
