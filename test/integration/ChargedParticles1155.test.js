const {
  ethers,
  network,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
  presets
} = require('../../js-helpers/deploy');

const {
  toWei,
  toBN,
} = require('../../js-helpers/utils');

const { deployMockContract } = require('../../js-helpers/deployMockContract');

const {
  callAndReturn,
  callAndReturnWithLogs,
} = require('../../js-helpers/test')(network);

const { expect, assert } = require('chai');
const _ = require('lodash');

const TokenInfoProxyMock = require('../../build/contracts/contracts/lib/TokenInfoProxy.sol/TokenInfoProxy.json');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';

let overrides = { gasLimit: 20000000 }


describe("[INTEGRATION] Charged Particles with ERC1155", () => {
  let chainId;

  // Internal contracts
  let universe;
  let chargedState;
  let chargedSettings;
  let chargedManagers;
  let chargedParticles;
  let proton;
  let protonB;
  let tokenInfoProxyMock;
  let fungibleERC1155;
  let nonFungibleERC1155;

  let deployer;
  let user1;
  let user2;
  let user3;
  let signerD;
  let signer1;
  let signer2;
  let signer3;

  beforeEach(async () => {
    chainId = await getChainId();

    const namedAccts = (await getNamedAccounts());
    deployer = namedAccts.deployer
    user1 = namedAccts.user1;
    user2 = namedAccts.user2;
    user3 = namedAccts.user3;
    signerD = ethers.provider.getSigner(deployer);
    signer1 = ethers.provider.getSigner(user1);
    signer2 = ethers.provider.getSigner(user2);
    signer3 = ethers.provider.getSigner(user3);

    tokenInfoProxyMock = await deployMockContract(signerD, TokenInfoProxyMock.abi, overrides);

    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const Proton = await ethers.getContractFactory('Proton');
    const ProtonB = await ethers.getContractFactory('ProtonB');
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
    const FungibleERC1155 = await ethers.getContractFactory('FungibleERC1155');
    const NonFungibleERC1155 = await ethers.getContractFactory('NonFungibleERC1155');

    universe = Universe.attach(getDeployData('Universe', chainId).address);
    chargedState = ChargedState.attach(getDeployData('ChargedState', chainId).address);
    chargedSettings = ChargedSettings.attach(getDeployData('ChargedSettings', chainId).address);
    chargedManagers = ChargedManagers.attach(getDeployData('ChargedManagers', chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    proton = Proton.attach(getDeployData('Proton', chainId).address);
    protonB = ProtonB.attach(getDeployData('ProtonB', chainId).address);
    tokenInfoProxy = TokenInfoProxy.attach(getDeployData('TokenInfoProxy', chainId).address);
    fungibleERC1155 = FungibleERC1155.attach(getDeployData('FungibleERC1155', chainId).address);
    nonFungibleERC1155 = NonFungibleERC1155.attach(getDeployData('NonFungibleERC1155', chainId).address);

    await proton.connect(signerD).setPausedState(false);
    await protonB.connect(signerD).setPausedState(false);

    // Non-Fungible ERC1155 with an "ownerOf" function can be whitelisted for Energize
    await chargedSettings.enableNftContracts([nonFungibleERC1155.address])
  });


  describe('Non-Fungible ERC1155s', () => {
    it('can successfully energize and release an ERC1155 with Proton A', async () => {
      const _nftAmount = 1;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonA
      await universe.setProtonToken(proton.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: proton,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: nonFungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(nonFungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await proton.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          nonFungibleERC1155.address,
          erc1155,
          'generic.B',
          proton.address,
          protonId,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(_.toLower(await proton.ownerOf(protonId))).to.be.equal(smartBasketAddress);
      expect(await chargedParticles.currentParticleCovalentBonds(nonFungibleERC1155.address, erc1155, 'generic.B')).to.be.equal(_nftAmount);

      // Release Proton from ERC1155
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        nonFungibleERC1155.address,
        erc1155,
        'generic.B',
        proton.address,
        protonId,
        _nftAmount
      );
      expect(await proton.ownerOf(protonId)).to.be.equal(user1);
      expect(await chargedParticles.currentParticleCovalentBonds(nonFungibleERC1155.address, erc1155, 'generic.B')).to.be.equal(0);
    });

    it('can successfully energize and release an ERC1155 with Proton B', async () => {
      const _nftAmount = 1;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonB
      await universe.setProtonToken(protonB.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: protonB,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: nonFungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(nonFungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await protonB.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          nonFungibleERC1155.address,
          erc1155,
          'generic.B',
          protonB.address,
          protonId,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(_.toLower(await protonB.ownerOf(protonId))).to.be.equal(smartBasketAddress);
      expect(await chargedParticles.currentParticleCovalentBonds(nonFungibleERC1155.address, erc1155, 'generic.B')).to.be.equal(_nftAmount);

      // Release Proton from ERC1155
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        nonFungibleERC1155.address,
        erc1155,
        'generic.B',
        protonB.address,
        protonId,
        _nftAmount
      );
      expect(await protonB.ownerOf(protonId)).to.be.equal(user1);
      expect(await chargedParticles.currentParticleCovalentBonds(nonFungibleERC1155.address, erc1155, 'generic.B')).to.be.equal(0);
    });

    it("can succesfully energize and release a single ERC1155 into Proton A", async () => {
      const _nftAmount = 1;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonA
      await universe.setProtonToken(proton.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: proton,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: nonFungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(nonFungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await nonFungibleERC1155.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          proton.address,
          protonId,
          'generic.B',
          nonFungibleERC1155.address,
          erc1155,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(await nonFungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(_nftAmount);

      // Release ERC1155 from Proton
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        proton.address,
        protonId,
        'generic.B',
        nonFungibleERC1155.address,
        erc1155,
        _nftAmount
      );
      expect(await nonFungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount);
      expect(await nonFungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(0);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(0);
    });

    it("can succesfully energize and release a single ERC1155 into Proton B", async () => {
      const _nftAmount = 1;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonB
      await universe.setProtonToken(protonB.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: protonB,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: nonFungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(nonFungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await nonFungibleERC1155.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          protonB.address,
          protonId,
          'generic.B',
          nonFungibleERC1155.address,
          erc1155,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(await nonFungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(_nftAmount);

      // Release ERC1155 from Proton
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        protonB.address,
        protonId,
        'generic.B',
        nonFungibleERC1155.address,
        erc1155,
        _nftAmount
      );
      expect(await nonFungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount);
      expect(await nonFungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(0);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(0);
    });
  });



  describe('Fungible ERC1155s', () => {
    it("can succesfully energize and release multiple ERC1155s into Proton A", async () => {
      const _nftAmount = 10;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonA
      await universe.setProtonToken(proton.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: proton,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: fungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
          _nftAmount,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(fungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await fungibleERC1155.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          proton.address,
          protonId,
          'generic.B',
          fungibleERC1155.address,
          erc1155,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(_nftAmount);

      // Release ERC1155 from Proton
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        proton.address,
        protonId,
        'generic.B',
        fungibleERC1155.address,
        erc1155,
        _nftAmount
      );
      expect(await fungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(0);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(0);
    });

    it("can succesfully release multiple ERC1155s multiple times from Proton A", async () => {
      const _nftAmount = 10;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonA
      await universe.setProtonToken(proton.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: proton,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: fungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
          _nftAmount,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(fungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await fungibleERC1155.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          proton.address,
          protonId,
          'generic.B',
          fungibleERC1155.address,
          erc1155,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(_nftAmount);

      // Release Some
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        proton.address,
        protonId,
        'generic.B',
        fungibleERC1155.address,
        erc1155,
        _nftAmount / 2
      );
      expect(await fungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount / 2);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount / 2);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(_nftAmount / 2);

      // Release the Rest
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        proton.address,
        protonId,
        'generic.B',
        fungibleERC1155.address,
        erc1155,
        _nftAmount / 2
      );
      expect(await fungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(0);
      expect(await chargedParticles.currentParticleCovalentBonds(proton.address, protonId, 'generic.B')).to.be.equal(0);
    });

    it("can succesfully energize and release multiple ERC1155s into Proton B", async () => {
      const _nftAmount = 10;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonB
      await universe.setProtonToken(protonB.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: protonB,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: fungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
          _nftAmount,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(fungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await fungibleERC1155.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          protonB.address,
          protonId,
          'generic.B',
          fungibleERC1155.address,
          erc1155,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(_nftAmount);

      // Release ERC1155 from Proton
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        protonB.address,
        protonId,
        'generic.B',
        fungibleERC1155.address,
        erc1155,
        _nftAmount
      );
      expect(await fungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(0);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(0);
    });

    it("can succesfully release multiple ERC1155s multiple times from Proton B", async () => {
      const _nftAmount = 10;

      await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
      await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

      await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
      await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

      // Switch to protonB
      await universe.setProtonToken(protonB.address);

      // Mint a Proton
      const protonId = await callAndReturn({
        contractInstance: protonB,
        contractMethod: 'createBasicProton',
        contractCaller: signer1,
        contractParams: [
          user1,                      // creator
          user1,                      // receiver
          TEST_NFT_TOKEN_URI,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, protonId.toString()).returns(user1);

      // Mint a Non-Fungible ERC1155
      const erc1155 = await callAndReturn({
        contractInstance: fungibleERC1155,
        contractMethod: 'mintNft',
        contractCaller: signer1,
        contractParams: [
          user1,
          _nftAmount,
        ],
      });
      await tokenInfoProxyMock.mock.getTokenOwner.withArgs(fungibleERC1155.address, erc1155.toString()).returns(user1);

      // Deposit ERC1155 into Proton
      await fungibleERC1155.connect(signer1).setApprovalForAll(chargedParticles.address, true);
      const bondResults = await callAndReturnWithLogs({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer1,
        contractParams: [
          protonB.address,
          protonId,
          'generic.B',
          fungibleERC1155.address,
          erc1155,
          _nftAmount
        ],
      });

      // Get Basket Address from NewSmartBasket event
      let smartBasketAddress = false;
      const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
      _.forEach(bondResults.txResults.events, (e) => {
        if (e.topics[0] === eventHash) {
          smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
        }
      })
      expect(smartBasketAddress).to.not.be.equal(false);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(_nftAmount);

      // Release Some
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        protonB.address,
        protonId,
        'generic.B',
        fungibleERC1155.address,
        erc1155,
        _nftAmount / 2
      );
      expect(await fungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount / 2);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(_nftAmount / 2);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(_nftAmount / 2);

      // Release the Rest
      await chargedParticles.connect(signer1).breakCovalentBond(
        user1,
        protonB.address,
        protonId,
        'generic.B',
        fungibleERC1155.address,
        erc1155,
        _nftAmount / 2
      );
      expect(await fungibleERC1155.balanceOf(user1, erc1155)).to.be.equal(_nftAmount);
      expect(await fungibleERC1155.balanceOf(smartBasketAddress, erc1155)).to.be.equal(0);
      expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, protonId, 'generic.B')).to.be.equal(0);
    });
  });

});
