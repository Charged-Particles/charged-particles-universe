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
const TokenInfoProxy = require('../build/contracts/contracts/lib/TokenInfoProxy.sol/TokenInfoProxy.json');
const daiABI = require('./abis/dai');

const daiHodler = "0x55e4d16f9c3041EfF17Ca32850662f3e9Dddbce7"; // Hodler with the highest current amount of DAI, used for funding our operations on mainnet fork.

const { AddressZero } = require('ethers').constants

const TEST_TOKEN_ID = '1337';

let overrides = { gasLimit: 20000000 }

describe("Charged Settings", () => {
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
  let tokenInfoProxy;
  let ethSender;

  // Deploy Data from Internal Contracts
  let ddChargedParticles;
  let ddProton;

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

    ddChargedParticles = getDeployData('ChargedParticles', chainId);
    ddProton = getDeployData('Proton', chainId);
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiHodler]
    });
  });

  describe('Wallet Managers', async () => {
    it('should have enabled "aave", "aave.B", "generic" and "generic.B" as wallet managers', async () => {
      expect(await chargedManagers.isWalletManagerEnabled('aave')).to.equal(true);
      expect(await chargedManagers.isWalletManagerEnabled('aave.B')).to.equal(true);
      expect(await chargedManagers.isWalletManagerEnabled('generic')).to.equal(true);
      expect(await chargedManagers.isWalletManagerEnabled('generic.B')).to.equal(true);
    });

    it('should have enabled "generic" and "generic.B" as a basket managers', async () => {
      expect(await chargedManagers.isNftBasketEnabled('generic')).to.equal(true);
      expect(await chargedManagers.isNftBasketEnabled('generic.B')).to.equal(true);
    });
  });

  describe('Creator Annuities', async () => {
    beforeEach(async () => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(user1);
      await erc721chargeable.mock.creatorOf.withArgs(TEST_TOKEN_ID).returns(user1);
      await tokenInfoProxy.mock.getTokenCreator.withArgs(erc721chargeable.address, TEST_TOKEN_ID).returns(user1);
      await tokenInfoProxy.mock.isNFTContractOrCreator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1).returns(true);
    });

    it('should allow the creator to set interest annuities', async () => {
      const annuitiesBasisPoints = toBN('5000'); // 50%
      let tx = chargedSettings.connect(signer1).setCreatorAnnuities(erc721chargeable.address, TEST_TOKEN_ID, user1, annuitiesBasisPoints);
      await expect(tx)
        .to.emit(chargedSettings, 'TokenCreatorConfigsSet')
        .withArgs(erc721chargeable.address, TEST_TOKEN_ID, user1, annuitiesBasisPoints);

      expect(await chargedSettings.callStatic.getCreatorAnnuities(erc721chargeable.address, TEST_TOKEN_ID))
        .to.deep.equal([user1, annuitiesBasisPoints]);
    });

    it('should not allow anyone else to set interest annuities', async () => {
      await tokenInfoProxy.mock.isNFTContractOrCreator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user2).returns(false);
      const annuitiesBasisPoints = toBN('100'); // 1%
      await expect(chargedSettings.connect(signer2).setCreatorAnnuities(erc721chargeable.address, TEST_TOKEN_ID, user1, annuitiesBasisPoints))
        .to.be.revertedWith('CP:E-104');
    });

    it('should allow the creator to redirect interest annuities', async () => {
      let tx = chargedSettings.connect(signer1).setCreatorAnnuitiesRedirect(erc721chargeable.address, TEST_TOKEN_ID, user3);
      await expect(tx)
        .to.emit(chargedSettings, 'TokenCreatorAnnuitiesRedirected')
        .withArgs(erc721chargeable.address, TEST_TOKEN_ID, user3);

      expect(await chargedSettings.getCreatorAnnuitiesRedirect(erc721chargeable.address, TEST_TOKEN_ID)).to.equal(user3);
    });

    it('should not allow anyone else to redirect interest annuities', async () => {
      await tokenInfoProxy.mock.isNFTContractOrCreator.withArgs(erc721chargeable.address, TEST_TOKEN_ID, user2).returns(false);
      await expect(chargedSettings.connect(signer2).setCreatorAnnuitiesRedirect(erc721chargeable.address, TEST_TOKEN_ID, user3))
        .to.be.revertedWith('CP:E-104');
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
      await chargedSettings.connect(signerD).enableNftContracts([erc721chargeable.address]);
    });

    it('should return the contract owner of the external NFT contract', async () => {
      expect(await chargedManagers.isContractOwner(erc721chargeable.address, user1));
    });

    describe('setRequiredWalletManager', async () => {
      it('should allow the external NFT contract owner to configure', async () => {
        await expect(chargedSettings.connect(signer1).setRequiredWalletManager(
          erc721chargeable.address,
          'newGeneric'
        ))
          .to.emit(chargedSettings, 'RequiredWalletManagerSet')
          .withArgs(
            erc721chargeable.address,
            'newGeneric',
          );
      });

      it('should allow the Charged Particles admin to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signerD).setRequiredWalletManager(
          erc721chargeable.address,
          'newGeneric'
        ))
          .to.emit(chargedSettings, 'RequiredWalletManagerSet')
          .withArgs(
            erc721chargeable.address,
            'newGeneric'
          );
      });

      it('should not allow anyone else to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signer2).setRequiredWalletManager(
          erc721chargeable.address,
          'newGeneric'
        ))
          .to.be.revertedWith('CP:E-103');
      });
    });

    describe('setRequiredBasketManager', async () => {
      it('should allow the external NFT contract owner to configure', async () => {
        await expect(chargedSettings.connect(signer1).setRequiredBasketManager(
          erc721chargeable.address,
          'newGeneric'
        ))
          .to.emit(chargedSettings, 'RequiredBasketManagerSet')
          .withArgs(
            erc721chargeable.address,
            'newGeneric',
          );
      });

      it('should allow the Charged Particles admin to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signerD).setRequiredBasketManager(
          erc721chargeable.address,
          'newGeneric'
        ))
          .to.emit(chargedSettings, 'RequiredBasketManagerSet')
          .withArgs(
            erc721chargeable.address,
            'newGeneric'
          );
      });

      it('should not allow anyone else to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signer2).setRequiredBasketManager(
          erc721chargeable.address,
          'newGeneric'
        ))
          .to.be.revertedWith('CP:E-103');
      });
    });

    describe('setAssetTokenRestrictions', async () => {
      it('should allow the external NFT contract owner to configure', async () => {
        await expect(chargedSettings.connect(signer1).setAssetTokenRestrictions(
          erc721chargeable.address,
          true
        ))
          .to.emit(chargedSettings, 'AssetTokenRestrictionsSet')
          .withArgs(
            erc721chargeable.address,
            true
          );
      });

      it('should allow the Charged Particles admin to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signerD).setAssetTokenRestrictions(
          erc721chargeable.address,
          true
        ))
          .to.emit(chargedSettings, 'AssetTokenRestrictionsSet')
          .withArgs(
            erc721chargeable.address,
            true
          );
      });

      it('should not allow anyone else to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signer2).setAssetTokenRestrictions(
          erc721chargeable.address,
          true
        ))
          .to.be.revertedWith('CP:E-103');
      });
    });

    describe('setAllowedAssetToken', async () => {
      it('should allow the external NFT contract owner to configure', async () => {
        await expect(chargedSettings.connect(signer1).setAllowedAssetToken(
          erc721chargeable.address,
          daiAddress,
          true
        ))
          .to.emit(chargedSettings, 'AllowedAssetTokenSet')
          .withArgs(
            erc721chargeable.address,
            daiAddress,
            true
          );
      });

      it('should allow the Charged Particles admin to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signerD).setAllowedAssetToken(
          erc721chargeable.address,
          daiAddress,
          true
        ))
          .to.emit(chargedSettings, 'AllowedAssetTokenSet')
          .withArgs(
            erc721chargeable.address,
            daiAddress,
            true
          );
      });

      it('should not allow anyone else to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signer2).setAllowedAssetToken(
          erc721chargeable.address,
          daiAddress,
          true
        ))
          .to.be.revertedWith('CP:E-103');
      });
    });

    describe('setAssetTokenLimits', async () => {
      it('should allow the external NFT contract owner to configure', async () => {
        await expect(chargedSettings.connect(signer1).setAssetTokenLimits(
          erc721chargeable.address,
          daiAddress,
          assetDepositMin,
          assetDepositMax
        ))
          .to.emit(chargedSettings, 'AssetTokenLimitsSet')
          .withArgs(
            erc721chargeable.address,
            daiAddress,
            assetDepositMin,
            assetDepositMax
          );
      });

      it('should allow the Charged Particles admin to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signerD).setAssetTokenLimits(
          erc721chargeable.address,
          daiAddress,
          assetDepositMin,
          assetDepositMax
        ))
          .to.emit(chargedSettings, 'AssetTokenLimitsSet')
          .withArgs(
            erc721chargeable.address,
            daiAddress,
            assetDepositMin,
            assetDepositMax
          );
      });

      it('should not allow anyone else to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signer2).setAssetTokenLimits(
          erc721chargeable.address,
          daiAddress,
          assetDepositMin,
          assetDepositMax
        ))
          .to.be.revertedWith('CP:E-103');
      });
    });

    describe('setMaxNfts', async () => {
      it('should allow the external NFT contract owner to configure', async () => {
        await expect(chargedSettings.connect(signer1).setMaxNfts(
          erc721chargeable.address,
          ddProton.address,
          toBN('1')
        ))
          .to.emit(chargedSettings, 'MaxNftsSet')
          .withArgs(
            erc721chargeable.address,
            ddProton.address,
            toBN('1')
          );
      });

      it('should allow the Charged Particles admin to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signerD).setMaxNfts(
          erc721chargeable.address,
          ddProton.address,
          toBN('1')
        ))
          .to.emit(chargedSettings, 'MaxNftsSet')
          .withArgs(
            erc721chargeable.address,
            ddProton.address,
            toBN('1')
          );
      });

      it('should not allow anyone else to configure external NFT contract', async () => {
        await expect(chargedSettings.connect(signer2).setMaxNfts(
          erc721chargeable.address,
          ddProton.address,
          toBN('1')
        ))
          .to.be.revertedWith('CP:E-103');
      });
    });
  });


  describe('Contract Configurations', async () => {
    it('should allow the contract owner to update the whitelist of supported NFTs', async () => {
      expect(await chargedSettings.connect(signerD).enableNftContracts([erc721chargeable.address]))
      .to.emit(chargedSettings, 'PermsSetForCharge').withArgs(erc721chargeable.address, true)
      .and.to.emit(chargedSettings, 'PermsSetForBasket').withArgs(erc721chargeable.address, true)
      .and.to.emit(chargedSettings, 'PermsSetForTimelockSelf').withArgs(erc721chargeable.address, true);
    });

    it('should allow the contract owner to register new wallet managers', async () => {
      expect(await chargedManagers.connect(signerD).registerWalletManager('newGeneric', newGenericWalletManager.address))
        .to.emit(chargedManagers, 'WalletManagerRegistered')
        .withArgs('newGeneric', newGenericWalletManager.address);
    });

    it('should allow the contract owner to register new basket managers', async () => {
      expect(await chargedManagers.connect(signerD).registerBasketManager('newGeneric', newGenericBasketManager.address))
        .to.emit(chargedManagers, 'BasketManagerRegistered')
        .withArgs('newGeneric', newGenericBasketManager.address);
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
      await expect(signer1.sendTransaction({to: chargedSettings.address, value: toWei('10')}))
        .to.be.revertedWith('function selector was not recognized and there\'s no fallback nor receive function');
    });

    it('should allow only the contract owner to release stuck ETH from the contract', async () => {
      const amount = toWei('10');

      // Force ETH into chargedSettings Contract
      await signer1.sendTransaction({to: ethSender.address, value: amount});
      await ethSender.sendEther(chargedSettings.address);

      // Attempt withdraw by Non-Owner
      await expect(chargedSettings.connect(signer2).withdrawEther(user2, amount))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(chargedSettings.connect(signerD).withdrawEther(user1, amount))
        .to.emit(chargedSettings, 'WithdrawStuckEther')
        .withArgs(user1, amount);
    });

    it('should allow the contract owner to release stuck ERC20s from the contract', async () => {
      const amount = toWei('10');

      await erc20token.mock.balanceOf.withArgs(chargedSettings.address).returns(amount);
      await erc20token.mock.transfer.withArgs(user1, amount).returns(true);

      // Attempt withdraw by Non-Owner
      await expect(chargedSettings.connect(signer2).withdrawErc20(user1, erc20token.address, amount))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(chargedSettings.connect(signerD).withdrawErc20(user1, erc20token.address, amount))
        .to.emit(chargedSettings, 'WithdrawStuckERC20')
        .withArgs(user1, erc20token.address, amount);
    });

    it('should allow the contract owner to release stuck ERC721s from the contract', async () => {
      await erc721chargeable.mock.ownerOf.withArgs(TEST_TOKEN_ID).returns(chargedSettings.address);
      await erc721chargeable.mock.transferFrom.withArgs(chargedSettings.address, user1, TEST_TOKEN_ID).returns();

      // Attempt withdraw by Non-Owner
      await expect(chargedSettings.connect(signer2).withdrawERC721(user1, erc721chargeable.address, TEST_TOKEN_ID))
        .to.be.revertedWith('Ownable: caller is not the owner');

      // Withdraw by Owner
      await expect(chargedSettings.connect(signerD).withdrawERC721(user1, erc721chargeable.address, TEST_TOKEN_ID))
        .to.emit(chargedSettings, 'WithdrawStuckERC721')
        .withArgs(user1, erc721chargeable.address, TEST_TOKEN_ID);
    });
  });

});
