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
  toBytes,
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
const TokenInfoProxy = require('../build/contracts/contracts/lib/TokenInfoProxy.sol/TokenInfoProxy.json');
const ERC20Mintable = require('../build/contracts/contracts/test/ERC20Mintable.sol/ERC20Mintable.json');
const daiABI = require('./abis/dai');

const daiHodler = "0x55e4d16f9c3041EfF17Ca32850662f3e9Dddbce7"; // Hodler with the highest current amount of DAI, used for funding our operations on mainnet fork.

const TEST_TOKEN_ID = '1337';

let overrides = { gasLimit: 20000000 }

describe("Charged State", () => {
  let chainId;

  // External contracts
  let erc20token;
  let erc721chargeable;
  let daiAddress;

  // Internal contracts
  let universe;
  let chargedState;
  let chargedSettings;
  let chargedManagers;
  let chargedParticles;
  let newGenericWalletManager;
  let newGenericBasketManager;
  let tokenInfoProxy;
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

    // With Forked Mainnet
    dai = new ethers.Contract(daiAddress, daiABI, daiSigner);

    // Deploy Mocked Contracts
    erc20token = await deployMockContract(signerD, ERC20Mintable.abi, overrides);
    erc721chargeable = await deployMockContract(signerD, IERC721Chargeable.abi, overrides);
    tokenInfoProxy = await deployMockContract(signerD, TokenInfoProxy.abi, overrides);

    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    universe = Universe.attach(getDeployData('Universe', chainId).address);

    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    await chargedParticles.setController(tokenInfoProxy.address, 'tokeninfo');

    const ChargedState = await ethers.getContractFactory('ChargedState');
    chargedState = ChargedState.attach(getDeployData('ChargedState', chainId).address);
    await chargedState.setController(tokenInfoProxy.address, 'tokeninfo');

    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    chargedSettings = ChargedSettings.attach(getDeployData('ChargedSettings', chainId).address);
    await chargedSettings.setController(tokenInfoProxy.address, 'tokeninfo');

    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    chargedManagers = ChargedManagers.attach(getDeployData('ChargedManagers', chainId).address);
    await chargedManagers.setController(tokenInfoProxy.address, 'tokeninfo');

    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const GenericWalletManagerInstance = await GenericWalletManager.deploy();
    newGenericWalletManager = await GenericWalletManagerInstance.deployed();

    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const GenericBasketManagerInstance = await GenericBasketManager.deploy();
    newGenericBasketManager = await GenericBasketManagerInstance.deployed();
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiHodler]
    });
  });

  describe('Token Discharge Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
      await tokenInfoProxy.mock.getTokenOwner.withArgs(erc721chargeable.address, TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for discharge', async () => {
      expect(await chargedState.callStatic.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for discharge', async () => {
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1).returns(true);
      await chargedState.connect(signer1).setDischargeApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedState.callStatic.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for discharge', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user2).returns(true);
      await chargedState.connect(signer2).setDischargeApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedState.callStatic.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for discharge', async () => {
      expect(await chargedState.callStatic.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });

  describe('Token Release Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
      await tokenInfoProxy.mock.getTokenOwner.withArgs(erc721chargeable.address, TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for release', async () => {
      expect(await chargedState.callStatic.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for release', async () => {
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1).returns(true);
      await chargedState.connect(signer1).setReleaseApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedState.callStatic.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for release', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user2).returns(true);
      await chargedState.connect(signer2).setReleaseApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedState.callStatic.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for release', async () => {
      expect(await chargedState.callStatic.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });

  describe('Token Break-Bond Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
      await tokenInfoProxy.mock.getTokenOwner.withArgs(erc721chargeable.address, TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for break-bond', async () => {
      expect(await chargedState.callStatic.isApprovedForBreakBond(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for break-bond', async () => {
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1).returns(true);
      await chargedState.connect(signer1).setBreakBondApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedState.callStatic.isApprovedForBreakBond(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for break-bond', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user2).returns(true);
      await chargedState.connect(signer2).setBreakBondApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedState.callStatic.isApprovedForBreakBond(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for break-bond', async () => {
      expect(await chargedState.callStatic.isApprovedForBreakBond(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });

  describe('Token Timelock Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
      await tokenInfoProxy.mock.getTokenOwner.withArgs(erc721chargeable.address, TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for timelock', async () => {
      expect(await chargedState.callStatic.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for timelock', async () => {
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1).returns(true);
      await chargedState.connect(signer1).setTimelockApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedState.callStatic.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for timelock', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await tokenInfoProxy.mock.isNFTOwnerOrOperator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user2).returns(true);
      await chargedState.connect(signer2).setTimelockApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedState.callStatic.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for timelock', async () => {
      expect(await chargedState.callStatic.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });



  describe('Contract Configurations', async () => {
    it('should allow the contract owner to set the ChargedSettings contract', async () => {
      expect(await chargedState.connect(signerD).setController(chargedSettings.address, 'settings'))
        .to.emit(chargedState, 'ControllerSet')
        .withArgs(chargedSettings.address, 'settings');
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
      await expect(signer1.sendTransaction({to: chargedParticles.address, value: toWei('10')}))
        .to.be.revertedWith('function selector was not recognized and there\'s no fallback nor receive function');
    });

    it('should allow only the contract owner to release stuck ETH from the contract', async () => {
      const amount = toWei('10');

      // Force ETH into ChargedParticles Contract
      await signer1.sendTransaction({to: ethSender.address, value: amount});
      await ethSender.sendEther(chargedParticles.address);

      // Attempt withdraw by Non-Owner
      await expect(chargedParticles.connect(signer2).withdrawEther(user2, amount))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(chargedParticles.connect(signerD).withdrawEther(user1, amount))
        .to.emit(chargedParticles, 'WithdrawStuckEther')
        .withArgs(user1, amount);
    });

    it('should allow the contract owner to release stuck ERC20s from the contract', async () => {
      const amount = toWei('10');

      await erc20token.mock.balanceOf.withArgs(chargedParticles.address).returns(amount);
      await erc20token.mock.transfer.withArgs(user1, amount).returns(true);

      // Attempt withdraw by Non-Owner
      await expect(chargedParticles.connect(signer2).withdrawErc20(user1, erc20token.address, amount))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(chargedParticles.connect(signerD).withdrawErc20(user1, erc20token.address, amount))
        .to.emit(chargedParticles, 'WithdrawStuckERC20')
        .withArgs(user1, erc20token.address, amount);
    });

    it('should allow the contract owner to release stuck ERC721s from the contract', async () => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(chargedParticles.address);
      await erc721chargeable.mock.transferFrom.withArgs(chargedParticles.address, user1, TEST_TOKEN_ID).returns();

      // Attempt withdraw by Non-Owner
      await expect(chargedParticles.connect(signer2).withdrawERC721(user1, erc721chargeable.address, TEST_TOKEN_ID))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(chargedParticles.connect(signerD).withdrawERC721(user1, erc721chargeable.address, TEST_TOKEN_ID))
        .to.emit(chargedParticles, 'WithdrawStuckERC721')
        .withArgs(user1, erc721chargeable.address, TEST_TOKEN_ID);
    });
  });

});
