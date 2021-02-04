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

describe("Charged Particles", () => {
  let chainId;

  // External contracts
  let erc20token;
  let erc721chargeable;
  let dai;
  let daiAddress;

  // Internal contracts
  let chargedParticles;
  let universe;
  let newGenericWalletManager;
  let newGenericBasketManager;
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

    // Connect to Internal Contracts
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    const Universe = await ethers.getContractFactory('Universe');
    universe = Universe.attach(getDeployData('Universe', chainId).address);
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

  describe('Wallet Managers', async () => {
    it('should have enabled "aave" and "generic" as wallet managers', async () => {
      expect(await chargedParticles.isWalletManagerEnabled('aave')).to.equal(true);
      expect(await chargedParticles.isWalletManagerEnabled('generic')).to.equal(true);
      expect(await chargedParticles.getWalletManagerCount()).to.equal(2);
      expect(await chargedParticles.getWalletManagerByIndex(0)).to.equal('generic');
      expect(await chargedParticles.getWalletManagerByIndex(1)).to.equal('aave');
    });

    it('should have enabled "generic" as a basket manager', async () => {
      expect(await chargedParticles.isNftBasketEnabled('generic')).to.equal(true);
      expect(await chargedParticles.getNftBasketCount()).to.equal(1);
      expect(await chargedParticles.getNftBasketByIndex(0)).to.equal('generic');
    });
  });

  describe('isTokenCreator', async () => {
    it('should return the NFT creator address', async () => {
      await erc721chargeable.mock.creatorOf.withArgs(TEST_TOKEN_ID).returns(user3);
      expect(await chargedParticles.isTokenCreator(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.equal(true);
    });
  });

  describe('getTokenUUID', async () => {
    it('should compute correct Token UUID', async () => {
      expect(await chargedParticles.getTokenUUID(TEST_ADDRESS, TEST_TOKEN_ID)).to.equal(TEST_TOKEN_UUID);
    });
  });

  describe('getOwnerUUID', async () => {
    it('should compute correct Owner UUID', async () => {
      expect(await chargedParticles.getOwnerUUID('generic', TEST_ADDRESS)).to.equal(TEST_OWNER_UUID);
    });
  });

  describe('Creator Annuities', async () => {
    it('should allow the creator to set interest annuities', async () => {
      await erc721chargeable.mock.creatorOf.withArgs(TEST_TOKEN_ID).returns(user1);

      const annuitiesBasisPoints = toBN('5000'); // 50%
      let tx = chargedParticles.connect(signer1).setCreatorConfigs(erc721chargeable.address, TEST_TOKEN_ID, user1, annuitiesBasisPoints);
      await expect(tx)
        .to.emit(chargedParticles, 'TokenCreatorConfigsSet')
        .withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1, annuitiesBasisPoints);

      expect(await chargedParticles.getCreatorAnnuities(erc721chargeable.address, TEST_TOKEN_ID))
        .to.deep.equal([user1, annuitiesBasisPoints]);
    });

    it('should not allow anyone else to set interest annuities', async () => {
      await erc721chargeable.mock.creatorOf.withArgs(TEST_TOKEN_ID).returns(user1);

      const annuitiesBasisPoints = toBN('100'); // 1%
      await expect(chargedParticles.connect(signer2).setCreatorConfigs(erc721chargeable.address, TEST_TOKEN_ID, user1, annuitiesBasisPoints))
        .to.be.revertedWith('CP: E-104');
    });

    it('should allow the creator to redirect interest annuities', async () => {
      await erc721chargeable.mock.creatorOf.withArgs(TEST_TOKEN_ID).returns(user1);

      let tx = chargedParticles.connect(signer1).setCreatorAnnuitiesRedirect(erc721chargeable.address, TEST_TOKEN_ID, user3);
      await expect(tx)
        .to.emit(chargedParticles, 'TokenCreatorAnnuitiesRedirected')
        .withArgs(erc721chargeable.address, TEST_TOKEN_ID, user3);

      expect(await chargedParticles.getCreatorAnnuitiesRedirect(erc721chargeable.address, TEST_TOKEN_ID)).to.equal(user3);
    });

    it('should not allow anyone else to redirect interest annuities', async () => {
      await erc721chargeable.mock.creatorOf.withArgs(TEST_TOKEN_ID).returns(user1);

      await expect(chargedParticles.connect(signer2).setCreatorAnnuitiesRedirect(erc721chargeable.address, TEST_TOKEN_ID, user3))
        .to.be.revertedWith('CP: E-104');
    });
  });

  describe('Token Discharge Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for discharge', async () => {
      expect(await chargedParticles.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for discharge', async () => {
      await chargedParticles.connect(signer1).setDischargeApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedParticles.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for discharge', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await chargedParticles.connect(signer2).setDischargeApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedParticles.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for discharge', async () => {
      expect(await chargedParticles.isApprovedForDischarge(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });

  describe('Token Release Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for release', async () => {
      expect(await chargedParticles.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for release', async () => {
      await chargedParticles.connect(signer1).setReleaseApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedParticles.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for release', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await chargedParticles.connect(signer2).setReleaseApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedParticles.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for release', async () => {
      expect(await chargedParticles.isApprovedForRelease(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });

  describe('Token Timelock Approvals', async () => {

    beforeEach(async() => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
    });

    it('should confirm operator approval for timelock', async () => {
      expect(await chargedParticles.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user1)).to.be.true;
    });

    it('should allow the NFT owner to set an operator for timelock', async () => {
      await chargedParticles.connect(signer1).setTimelockApproval(erc721chargeable.address, TEST_TOKEN_ID, user2);
      expect(await chargedParticles.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.true;
    });

    it('should allow the NFT operator to set an operator for timelock', async () => {
      await erc721chargeable.mock.isApprovedForAll.withArgs(user1, user2).returns(true);
      await chargedParticles.connect(signer2).setTimelockApproval(erc721chargeable.address, TEST_TOKEN_ID, user3);
      expect(await chargedParticles.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user3)).to.be.true;
    });

    it('should not allow anyone else to set an operator for timelock', async () => {
      expect(await chargedParticles.isApprovedForTimelock(erc721chargeable.address, TEST_TOKEN_ID, user2)).to.be.false;
    });
  });



  describe('External NFT Integrations', async () => {

    const assetDepositMin = toWei('1');
    const assetDepositMax = toWei('1000');
    const INTERFACE_SIGNATURE_ERC721 = '0x80ac58cd';
    const INTERFACE_SIGNATURE_ERC1155 = '0xd9b67a26';

    beforeEach(async () => {
      await erc721chargeable.mock.owner.withArgs().returns(user1);
      await erc721chargeable.mock.supportsInterface.withArgs(INTERFACE_SIGNATURE_ERC721).returns(true); // supports ERC721 interface
      await erc721chargeable.mock.supportsInterface.withArgs(INTERFACE_SIGNATURE_ERC1155).returns(false); // does not support ERC1155 interface
      await chargedParticles.connect(signerD).enableNftContracts([erc721chargeable.address]);
    });

    it('should return the contract owner of the external NFT contract', async () => {
      expect(await chargedParticles.isContractOwner(erc721chargeable.address, user1));
    });

    it('should allow the external NFT contract owner to configure integration settings', async () => {
      await expect(chargedParticles.connect(signer1).setExternalContractConfigs(erc721chargeable.address, 'newGeneric', 'newGeneric', daiAddress, assetDepositMin, assetDepositMax)).to.emit(chargedParticles, 'TokenContractConfigsSet').withArgs(
        erc721chargeable.address,
        'newGeneric',
        'newGeneric',
        daiAddress,
        assetDepositMin,
        assetDepositMax
      );
    });
    
    it('should allow the Charged Particles admin to configure external NFT contract integration settings', async () => {
      await expect(chargedParticles.connect(signerD).setExternalContractConfigs(erc721chargeable.address, 'newGeneric', 'newGeneric', daiAddress, assetDepositMin, assetDepositMax)).to.emit(chargedParticles, 'TokenContractConfigsSet').withArgs(
        erc721chargeable.address,
        'newGeneric',
        'newGeneric',
        daiAddress,
        assetDepositMin,
        assetDepositMax
      );
    });

    it('should not allow anyone else to configure external NFT contract integration settings', async () => {
      await expect(chargedParticles.connect(signer2).setExternalContractConfigs(erc721chargeable.address, 'newGeneric', 'newGeneric', daiAddress, assetDepositMin, assetDepositMax)).to.be.revertedWith('CP: E-103');
    });
  });


  describe('Contract Configurations', async () => {
    it('should allow the contract owner to update the whitelist of supported NFTs', async () => {
      expect(await chargedParticles.connect(signerD).enableNftContracts([erc721chargeable.address]))
      .to.emit(chargedParticles, 'WhitelistedForCharge').withArgs(erc721chargeable.address, true)
      .and.to.emit(chargedParticles, 'WhitelistedForBasket').withArgs(erc721chargeable.address, true)
      .and.to.emit(chargedParticles, 'WhitelistedForTimelockSelf').withArgs(erc721chargeable.address, true);
    });

    it('should allow the contract owner to set the Universe contract', async () => {
      expect(await chargedParticles.connect(signerD).setUniverse(universe.address)).to.emit(chargedParticles, 'UniverseSet').withArgs(universe.address);
    });

    it('should allow the contract owner to register new wallet managers', async () => {
      expect(await chargedParticles.connect(signerD).registerWalletManager('newGeneric', newGenericWalletManager.address)).to.emit(chargedParticles, 'WalletManagerRegistered').withArgs('newGeneric', newGenericWalletManager.address);
    });

    it('should allow the contract owner to register new basket managers', async () => {
      expect(await chargedParticles.connect(signerD).registerBasketManager('newGeneric', newGenericBasketManager.address)).to.emit(chargedParticles, 'BasketManagerRegistered').withArgs('newGeneric', newGenericBasketManager.address);
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
