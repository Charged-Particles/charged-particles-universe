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
  getNetworkBlockNumber,
  setNetworkAfterBlockNumber,
  setNetworkAfterTimestamp
} = require('../../js-helpers/test')(network);

const { expect, assert } = require('chai');
const _ = require('lodash');

const { AddressZero } = require('ethers').constants;

const CryptoPunksMarket = require('../../build/contracts/contracts/test/CryptoPunks.sol/CryptoPunksMarket.json');
const TokenInfoProxyMock = require('../../build/contracts/contracts/lib/TokenInfoProxy.sol/TokenInfoProxy.json');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';
const TEST_NFT_AMOUNT = 1;

const daiABI = require('../abis/dai');
const erc20ABI = require('../abis/erc20');
const { balanceOf } = require('../../js-helpers/balanceOf');
const daiHodler = "0x55e4d16f9c3041EfF17Ca32850662f3e9Dddbce7"; // Hodler with the highest current amount of DAI, used for funding our operations on mainnet fork.
const amplHodler = "0x6723B7641c8Ac48a61F5f505aB1E9C03Bb44a301";

let overrides = { gasLimit: 20000000 }
const buyProtonGasLimit = toWei('0.5');

describe("[INTEGRATION] Charged Particles", () => {
  let chainId;

  // External contracts
  let dai;
  let daiAddress;
  let ampl;
  let amplAddress;
  let cryptoPunksMarket;

  // Internal contracts
  let universe;
  let chargedState;
  let chargedSettings;
  let chargedManagers;
  let chargedParticles;
  let particleSplitter;
  let aaveWalletManager;
  let genericWalletManager;
  let genericBasketManager;
  let proton;
  let protonB;
  let lepton;
  let ionx;
  let timelocks;
  let tokenInfoProxy;
  let tokenInfoProxyMock;

  // Settings
  let annuityPct = '1000';  // 10%

  // Accounts
  let trustedForwarder;

  let daiSigner;
  let amplSigner;
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
    amplAddress = presets.Aave.v2.ampl[chainId];

    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [daiHodler]
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [amplHodler]
    });

    daiSigner = ethers.provider.getSigner(daiHodler);
    amplSigner = ethers.provider.getSigner(amplHodler);
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
    ampl = new ethers.Contract(amplAddress, erc20ABI, amplSigner);

    // test NFTs that are non-compliant with ERC721 standard
    cryptoPunksMarket = await deployMockContract(signerD, CryptoPunksMarket.abi, overrides);
    tokenInfoProxyMock = await deployMockContract(signerD, TokenInfoProxyMock.abi, overrides);

    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ParticleSplitter = await ethers.getContractFactory('ParticleSplitter');
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const Proton = await ethers.getContractFactory('Proton');
    const ProtonB = await ethers.getContractFactory('ProtonB');
    const Lepton = await ethers.getContractFactory('Lepton2');
    const Ionx = await ethers.getContractFactory('Ionx');
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy')

    universe = Universe.attach(getDeployData('Universe', chainId).address);
    chargedState = ChargedState.attach(getDeployData('ChargedState', chainId).address);
    chargedSettings = ChargedSettings.attach(getDeployData('ChargedSettings', chainId).address);
    chargedManagers = ChargedManagers.attach(getDeployData('ChargedManagers', chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    particleSplitter = ParticleSplitter.attach(getDeployData('ParticleSplitter', chainId).address);
    aaveWalletManager = AaveWalletManager.attach(getDeployData('AaveWalletManager', chainId).address);
    genericWalletManager = GenericWalletManager.attach(getDeployData('GenericWalletManager', chainId).address);
    genericBasketManager = GenericBasketManager.attach(getDeployData('GenericBasketManager', chainId).address);
    proton = Proton.attach(getDeployData('Proton', chainId).address);
    protonB = ProtonB.attach(getDeployData('ProtonB', chainId).address);
    lepton = Lepton.attach(getDeployData('Lepton2', chainId).address);
    ionx = Ionx.attach(getDeployData('Ionx', chainId).address);
    tokenInfoProxy = TokenInfoProxy.attach(getDeployData('TokenInfoProxy', chainId).address);

    await proton.connect(signerD).setPausedState(false);
    await protonB.connect(signerD).setPausedState(false);
    await lepton.connect(signerD).setPausedState(false);
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiHodler]
    });
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [amplHodler]
    });
  });

  it("can succesfully energize and release proton on 'aave'", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave',                       // walletManagerId
        daiAddress,                   // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);
    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      daiAddress
    );

    expect(await dai.balanceOf(user2)).to.be.above(toWei('9.9'));
  });

  it("can succesfully energize and release proton on 'aave.B'", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave.B',                     // walletManagerId
        daiAddress,                   // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);
    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave.B',
      daiAddress
    );

    expect(await dai.balanceOf(user2)).to.be.above(toWei('9.9'));
  });

  it("can succesfully energize and release proton on 'generic'", async () => {
    const amountToTransfer = toWei('10');
    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: amountToTransfer }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, amountToTransfer);
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, amountToTransfer);

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const initialBalance = await dai.balanceOf(user2);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic',                     // walletManagerId
        daiAddress,                   // assetToken
        amountToTransfer,                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);
    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'generic',
      daiAddress
    );

    expect(await dai.balanceOf(user2)).to.be.equal(initialBalance.add(amountToTransfer));
  });

  it("can succesfully energize and release proton on 'generic.B'", async () => {
    const amountToTransfer = toWei('10');
    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: amountToTransfer }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, amountToTransfer);
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, amountToTransfer);

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const initialBalance = await dai.balanceOf(user2);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic.B',                     // walletManagerId
        daiAddress,                   // assetToken
        amountToTransfer,                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);
    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'generic.B',
      daiAddress
    );

    expect(await dai.balanceOf(user2)).to.be.equal(initialBalance.add(amountToTransfer));
  });

  it("can execute for account on energized protonB", async () => {

    // Switch to protonB
    await universe.setProtonToken(protonB.address);

    const amountToTransfer = toWei('10');
    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: amountToTransfer }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, amountToTransfer);
    await dai.connect(signer1)['approve(address,uint256)'](protonB.address, amountToTransfer);

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const initialBalance = await dai.balanceOf(user2);

    const energizedParticleId = await callAndReturn({
      contractInstance: protonB,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic.B',                     // walletManagerId
        daiAddress,                   // assetToken
        amountToTransfer,                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, energizedParticleId.toString()).returns(user2);


    // Encoded Transfer function to transfer the DAI out
    var iDAI = new ethers.utils.Interface(daiABI);
    const encodedParams = iDAI.encodeFunctionData('transfer', [user2, amountToTransfer]);

    // Should fail before setExternalContracts is called
    await expect(particleSplitter.connect(signer2).executeForWallet(
      protonB.address,
      energizedParticleId,
      'generic.B',
      daiAddress,
      encodedParams
    )).to.be.revertedWith('PS:E-117');


    await particleSplitter.setExternalContracts([daiAddress], true);

    await particleSplitter.connect(signer2).executeForWallet(
      protonB.address,
      energizedParticleId,
      'generic.B',
      daiAddress,
      encodedParams
    );
    expect(await dai.balanceOf(user2)).to.be.equal(initialBalance.add(amountToTransfer));

    await particleSplitter.setExternalContracts([daiAddress], false);

    await expect(particleSplitter.connect(signer2).executeForWallet(
      protonB.address,
      energizedParticleId,
      'generic.B',
      daiAddress,
      encodedParams
    )).to.be.revertedWith('PS:E-117');
  });

  it("can execute for account on basket", async () => {

    // Switch to protonB
    await universe.setProtonToken(protonB.address);

    const amountToTransfer = toWei('10');
    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: amountToTransfer }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const initialBalance = await dai.balanceOf(user2);

    // Create Charged Particle #1
    const tokenId1 = await callAndReturn({
      contractInstance: protonB,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic.B',                  // walletManagerId
        daiAddress,                   // assetToken
        '0',                          // assetAmount  -- We dont want to Energize here, as the assets will go into a WalletManager not a BasketManager
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, tokenId1.toString()).returns(user2);

    // Create Charged Particle #2
    const tokenId2 = await callAndReturn({
      contractInstance: protonB,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic.B',                  // walletManagerId
        daiAddress,                   // assetToken
        '0',                          // assetAmount  -- We dont want to Energize here, as the assets will go into a WalletManager not a BasketManager
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(protonB.address, tokenId2.toString()).returns(user2);

    // Deposit Charged Particle #2 inside of #1
    await protonB.connect(signer2).approve(chargedParticles.address, tokenId2);
    const bondResults = await callAndReturnWithLogs({
      contractInstance: chargedParticles,
      contractMethod: 'covalentBond',
      contractCaller: signer2,
      contractParams: [
        protonB.address,
        tokenId1,
        'generic.B',
        protonB.address,
        tokenId2,
        TEST_NFT_AMOUNT
      ],
    });
    expect(await chargedParticles.currentParticleCovalentBonds(protonB.address, tokenId1, 'generic.B')).to.be.equal(1);

    // Get Basket Address from NewSmartBasket event
    let smartBasketAddress = false;
    const eventHash = ethers.utils.solidityKeccak256(['string'], ['NewSmartBasket(address,uint256,address)']);
    _.forEach(bondResults.txResults.events, (e) => {
      if (e.topics[0] === eventHash) {
        smartBasketAddress = '0x' + e.topics[3].slice(26); // addresses are padded to fill 32 bytes (0x + 24 leading zeroes)
      }
    })
    expect(smartBasketAddress).to.not.be.equal(false);

    // Deposit DAI directly into the SmartBasket of Charged Particle #1
    await dai.connect(daiSigner).transfer(smartBasketAddress, amountToTransfer);

    // Encoded Transfer function to transfer the DAI out
    var iDAI = new ethers.utils.Interface(daiABI);
    const encodedParams = iDAI.encodeFunctionData('transfer', [user2, amountToTransfer]);

    // signer2 owns tokenId1 at the root so acting on tokenId2 will revert
    await expect(particleSplitter.connect(signer2).executeForBasket(
      protonB.address,
      tokenId2,
      'generic.B',
      daiAddress,
      encodedParams
    )).to.be.revertedWith('PS:E-102');

    // "daiAddress" is not whitelisted, so this should fail before setExternalContracts is called
    await expect(particleSplitter.connect(signer2).executeForBasket(
      protonB.address,
      tokenId1,
      'generic.B',
      daiAddress,
      encodedParams
    )).to.be.revertedWith('PS:E-117');

    // Whitelist DAI, and try again, this time should pass
    await particleSplitter.setExternalContracts([daiAddress], true);

    particleSplitter.connect(signer2).executeForBasket(
      protonB.address,
      tokenId1,
      'generic.B',
      daiAddress,
      encodedParams
    );
    expect(await dai.balanceOf(user2)).to.be.equal(initialBalance.add(amountToTransfer));
  });

  it("can discharge only after timelock expired", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const user2BalanceBefore = await dai.balanceOf(user2);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,
        user2,
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,
        'aave',
        daiAddress,
        toWei('10'),
        annuityPct,
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);

    const blockNumberTimelock = (await getNetworkBlockNumber()).add(toBN('10'));

    await chargedState.connect(signer2).setDischargeTimelock(
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
      daiAddress
    )).to.be.revertedWith("CP:E-302");

    await setNetworkAfterBlockNumber(blockNumberTimelock);

    await chargedParticles.connect(signer2).dischargeParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      daiAddress
    );

    expect((await dai.balanceOf(user2)).sub(user2BalanceBefore)).to.be.above(toWei('0'));
  });

  it("creator receieves royalties, old owner receives the sale price and the new owner receives the token", async () => {

    // Switch to protonB
    await universe.setProtonToken(protonB.address);

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](protonB.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const energizedParticleId = await callAndReturn({
      contractInstance: protonB,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,
        user1,
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,
        'aave',
        daiAddress,
        toWei('10'),
        annuityPct,
      ],
    });

    await protonB.connect(signer1).setSalePrice(energizedParticleId, toWei('0.1'));
    await protonB.connect(signer1).setRoyaltiesPct(energizedParticleId, 500); // royaltyPct = 5%
    const user1Balance1 = await ethers.provider.getBalance(user1);
    await protonB.connect(signer2).buyProton(energizedParticleId, buyProtonGasLimit, { value: toWei('0.1') })
    const user1Balance2 = await ethers.provider.getBalance(user1);

    expect(user1Balance2.sub(user1Balance1)).to.be.equal(toWei('0.1'));
    expect(await protonB.ownerOf(energizedParticleId)).to.be.equal(user2);

    await protonB.connect(signer2).setSalePrice(energizedParticleId, toWei('1'));
    const user2Balance1 = await ethers.provider.getBalance(user2);
    await protonB.connect(signer3).buyProton(energizedParticleId, buyProtonGasLimit, { value: toWei('1') })
    const user1Balance3 = await ethers.provider.getBalance(user1);
    const user2Balance2 = await ethers.provider.getBalance(user2);

    expect(user2Balance2.sub(user2Balance1)).to.be.equal(toWei('0.955'));
    expect(await protonB.ownerOf(energizedParticleId)).to.be.equal(user3);

    // Creator Royalties (not transferred at time of sale, must be claimed by receiver)
    expect(user1Balance3.sub(user1Balance2)).to.be.equal(toWei('0'));
    expect(await protonB.connect(signer1).claimCreatorRoyalties())
      .to.emit(protonB, 'RoyaltiesClaimed')
      .withArgs(user1, toWei('0.045'));
  });

  it('Can buy old and new protons', async () => {

    await signerD.sendTransaction({ to: user2, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    // Switch to protonA
    await universe.setProtonToken(proton.address);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createBasicProton',
      contractCaller: signer1,
      contractParams: [
        user1,                      // creator
        user1,                      // receiver
        TEST_NFT_TOKEN_URI,
      ],
    });

    await proton.connect(signer1).setSalePrice(energizedParticleId, toWei('0.1'));
    await proton.connect(signer2).buyProton(energizedParticleId, { value: toWei('0.1') });
    expect(await proton.ownerOf(energizedParticleId)).to.be.equal(user2);

    // Switch to protonB
    await universe.setProtonToken(protonB.address);
    await proton.setUniverse(AddressZero);

    const energizedParticleIdProtonB = await callAndReturn({
      contractInstance: protonB,
      contractMethod: 'createBasicProton',
      contractCaller: signer1,
      contractParams: [
        user1,                      // creator
        user1,                      // receiver
        TEST_NFT_TOKEN_URI,
      ],
    });

    await protonB.connect(signer1).setSalePrice(energizedParticleIdProtonB, toWei('0.1'));

    await protonB.connect(signer2).buyProton(energizedParticleIdProtonB, buyProtonGasLimit, { value: toWei('0.1') })
    expect(await protonB.ownerOf(energizedParticleIdProtonB)).to.be.equal(user2);
  });

  it("generic smart wallet and manager succesfully hold erc20 tokens", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const user2BalanceBefore = await dai.balanceOf(user2);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic',                    // walletManagerId
        daiAddress,                   // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);
    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'generic',
      daiAddress
    );

    expect((await dai.balanceOf(user2)).sub(user2BalanceBefore)).to.be.equal(toWei('10'));
  });

  it("generic smart basket and manager succesfully hold erc721 tokens", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const tokenId1 = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic',                    // walletManagerId
        daiAddress,                   // assetToken
        toWei('3'),                   // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, tokenId1.toString()).returns(user2);

    const tokenId2 = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user3,                        // creator
        user2,                        // receiver
        user1,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic',                    // walletManagerId
        daiAddress,                   // assetToken
        toWei('7'),                   // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, tokenId2.toString()).returns(user2);

    await proton.connect(signer2).approve(chargedParticles.address, tokenId2);

    await chargedParticles.connect(signer2).covalentBond(
      proton.address,
      tokenId1,
      'generic',
      proton.address,
      tokenId2,
      TEST_NFT_AMOUNT
    );

    await expect(chargedParticles.connect(signer2).breakCovalentBond(
      user1,
      proton.address,
      tokenId1,
      'generic',
      proton.address,
      tokenId2,
      TEST_NFT_AMOUNT
    )).to.emit(genericBasketManager, 'BasketRemove').withArgs(
      user1,
      proton.address,
      tokenId1,
      proton.address,
      tokenId2,
      TEST_NFT_AMOUNT
    );

    expect(await proton.ownerOf(tokenId2)).to.be.equal(user1);
  });

  it("prevents an NFT from being deposited into itself", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const tokenId1 = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createProton',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, tokenId1.toString()).returns(user2);

    await proton.connect(signer2).approve(chargedParticles.address, tokenId1);

    await expect(chargedParticles.connect(signer2).covalentBond(
      proton.address,
      tokenId1,
      'generic',
      proton.address,
      tokenId1,
      TEST_NFT_AMOUNT
    )).to.be.revertedWith('CP:E-433');
  });

  it("cannot discharge more than the wallet holds", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave',                       // walletManagerId
        daiAddress,                   // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);

    await expect(chargedParticles.connect(signer2).dischargeParticleAmount(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      daiAddress,
      toWei('5')
    )).to.be.revertedWith('AWM:E-412');
  });

  it("can order to release more than the wallet holds, but receive only the wallet amount", async () => {

    await chargedState.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedSettings.setController(tokenInfoProxyMock.address, 'tokeninfo');
    await chargedManagers.setController(tokenInfoProxyMock.address, 'tokeninfo');

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    await tokenInfoProxyMock.mock.isNFTContractOrCreator.returns(true);
    await tokenInfoProxyMock.mock.getTokenCreator.returns(user1);

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
      contractMethod: 'createChargedParticle',
      contractCaller: signer1,
      contractParams: [
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave',                       // walletManagerId
        daiAddress,                   // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });
    await tokenInfoProxyMock.mock.getTokenOwner.withArgs(proton.address, energizedParticleId.toString()).returns(user2);

    const user2BalanceBefore = await dai.balanceOf(user2);

    await chargedParticles.connect(signer2).releaseParticleAmount(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      daiAddress,
      toWei('20')
    );

    expect((await dai.balanceOf(user2)).sub(user2BalanceBefore)).to.be.above(toWei('9.9')).and.to.be.below(toWei('10.1'));
  });

  // it("can succesfully conduct Electrostatic Discharge", async () => {
  //   await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

  //   await dai.connect(daiSigner).transfer(user1, toWei('10'));
  //   await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

  //   const energizedParticleId = await callAndReturn({
  //     contractInstance: proton,
  //     contractMethod: 'createChargedParticle',
  //     contractCaller: signer1,
  //     contractParams: [
  //       user1,                        // creator
  //       user2,                        // receiver
  //       user3,                        // referrer
  //       TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //       'aave',                       // walletManagerId
  //       daiAddress,                   // assetToken
  //       toWei('10'),                  // assetAmount
  //       annuityPct,                   // annuityPercent
  //     ],
  //   });

  //   await chargedParticles.connect(signer2).releaseParticle(
  //     user2,
  //     proton.address,
  //     energizedParticleId,
  //     'aave',
  //     daiAddress
  //   );

  //   const bondWeight = toWei('1');
  //   const user2BalanceBefore = await ionx.balanceOf(user2);

  //   await universe.connect(signer2).conductElectrostaticDischarge(user2, bondWeight);

  //   expect(await ionx.balanceOf(user2)).to.be.above(user2BalanceBefore).and.below(user2BalanceBefore.add(bondWeight));
  // });

  // it("charging a proton with a lepton should multiply ion return", async () => {
  //   const assetAmount10 = toWei('10');
  //   const assetAmount20 = toWei('20');
  //   await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens
  //   await dai.connect(daiSigner).transfer(user1, assetAmount20);
  //   await dai.connect(signer1)['approve(address,uint256)'](proton.address, assetAmount20);

  //   const protonId1 = await callAndReturn({
  //     contractInstance: proton,
  //     contractMethod: 'createChargedParticle',
  //     contractCaller: signer1,
  //     contractParams: [
  //       user1,                        // creator
  //       user2,                        // receiver
  //       user3,                        // referrer
  //       TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //       'aave',                       // walletManagerId
  //       daiAddress,                   // assetToken
  //       assetAmount10,                  // assetAmount
  //       annuityPct,                   // annuityPercent
  //     ],
  //   });

  //   // need to wait for the same amount of time as in the case where the lepton is charged with, otherwise, Aave will render a smaller interest amount
  //   await setNetworkAfterBlockNumber(Number((await getNetworkBlockNumber()).toString()) + 2);

  //   await chargedParticles.connect(signer2).releaseParticle(
  //     user2,
  //     proton.address,
  //     protonId1,
  //     'aave',
  //     daiAddress
  //   );

  //   const bondWeight = toWei('1');
  //   const ionBalance1 = await ionx.balanceOf(user2);

  //   await universe.conductElectrostaticDischarge(user2, bondWeight);

  //   const ionBalance2 = await ionx.balanceOf(user2);

  //   expect(ionBalance2).to.be.above(ionBalance1).and.below(ionBalance1.add(bondWeight));

  //   await lepton.connect(signerD).setPausedState(false);
  //   const price = await lepton.getNextPrice();

  //   const leptonId = await callAndReturn({
  //     contractInstance: lepton,
  //     contractMethod: 'mintLepton',
  //     contractCaller: signer3,
  //     contractParams: [],
  //     callValue: price.toString()
  //   });

  //   const multiplier = Number((await lepton.getMultiplier(leptonId)).toString()) / 1e4;

  //   const protonId2 = await callAndReturn({
  //     contractInstance: proton,
  //     contractMethod: 'createChargedParticle',
  //     contractCaller: signer1,
  //     contractParams: [
  //       user1,                        // creator
  //       user2,                        // receiver
  //       user3,                        // referrer
  //       TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //       'aave',                       // walletManagerId
  //       daiAddress,                   // assetToken
  //       assetAmount10,                  // assetAmount
  //       annuityPct,                   // annuityPercent
  //     ],
  //   });

  //   await lepton.connect(signer3).approve(chargedParticles.address, leptonId);

  //   await chargedParticles.connect(signer3).covalentBond(
  //     proton.address,
  //     protonId2,
  //     'generic',
  //     lepton.address,
  //     leptonId,
  //     TEST_NFT_AMOUNT
  //   );

  //   await chargedParticles.connect(signer2).releaseParticle(
  //     user2,
  //     proton.address,
  //     protonId2,
  //     'aave',
  //     daiAddress
  //   );

  //   const ionBalance3 = await ionx.balanceOf(user2);

  //   await universe.conductElectrostaticDischarge(user2, bondWeight);

  //   const ionBalance4 = await ionx.balanceOf(user2);

  //   expect(ionBalance4).to.be.above(ionBalance3).and.below(ionBalance3.add(bondWeight));

  //   expect(Number(ionBalance4.sub(ionBalance3).toString()) / Number(ionBalance2.sub(ionBalance1).toString()) - Number(multiplier.toString())).to.be.above(1.0).and.below(1.05);
  // });

  // it("should not allow to charge a proton with a lepton multiple times", async () => {
  //   await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

  //   await dai.connect(daiSigner).transfer(user1, toWei('10'));
  //   await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

  //   const protonId = await callAndReturn({
  //     contractInstance: proton,
  //     contractMethod: 'createChargedParticle',
  //     contractCaller: signer1,
  //     contractParams: [
  //       user1,                        // creator
  //       user2,                        // receiver
  //       user3,                        // referrer
  //       TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //       'aave',                       // walletManagerId
  //       daiAddress,                   // assetToken
  //       toWei('10'),                  // assetAmount
  //       annuityPct,                   // annuityPercent
  //     ],
  //   });

  //   await lepton.connect(signerD).setPausedState(false);

  //   const price1 = await lepton.getNextPrice();

  //   const leptonId1 = await callAndReturn({
  //     contractInstance: lepton,
  //     contractMethod: 'mintLepton',
  //     contractCaller: signer3,
  //     contractParams: [],
  //     callValue: price1.toString()
  //   });

  //   const price2 = await lepton.getNextPrice();

  //   const leptonId2 = await callAndReturn({
  //     contractInstance: lepton,
  //     contractMethod: 'mintLepton',
  //     contractCaller: signer3,
  //     contractParams: [],
  //     callValue: price2.toString()
  //   });

  //   await lepton.connect(signer3).approve(chargedParticles.address, leptonId1);
  //   await lepton.connect(signer3).approve(chargedParticles.address, leptonId2);

  //   await chargedParticles.connect(signer3).covalentBond(
  //     proton.address,
  //     protonId,
  //     'generic',
  //     lepton.address,
  //     leptonId1,
  //     '0x',
  //     '0x'
  //   );

  //   await expect(chargedParticles.connect(signer3).covalentBond(
  //     proton.address,
  //     protonId,
  //     'generic',
  //     lepton.address,
  //     leptonId2,
  //     '0x',
  //     '0x'
  //   )).to.be.revertedWith('CP:E-430');
  // });

  it("leptons switch to the next tier after minting all the available leptons in the previous tier", async () => {
    const maxMintPerTx = 5; // presets.Lepton.maxMintPerTx;
    await lepton.setMaxMintPerTx(maxMintPerTx);

    let supply;
    let remainder;
    let price;
    let txsPerType;
    for (let i = 0; i < 3; i++) {
      supply = presets.Lepton.types[i].supply[31337];
      remainder = supply.mod(maxMintPerTx);
      price = presets.Lepton.types[i].price[31337];
      txsPerType = supply.sub(remainder).div(maxMintPerTx).add((remainder > 0) ? 1 : 0).toNumber();

      for (let j = 0; j < txsPerType; j++) {
        await lepton.batchMintLepton(maxMintPerTx, { value: price.mul(maxMintPerTx).add(toWei('1')) });
      }

      expect(await lepton.getNextPrice()).to.be.equal(presets.Lepton.types[i + 1].price[31337]);
    }
  });

  it("cannot mint more leptons in the same tx than the max allowed", async () => {
    const testMaxMintPerTx = 3;
    await lepton.setMaxMintPerTx(testMaxMintPerTx);
    await expect(lepton.batchMintLepton(4, { value: toWei('1') })).to.be.revertedWith('LPT:E-429');
  });

  it("can withdraw ether piled up in the lepton contract", async () => {
    await lepton.mintLepton({ value: toWei('1') })
    const ethToWithdraw = await ethers.provider.getBalance(lepton.address);
    const ethBal1 = await ethers.provider.getBalance(user1);
    await lepton.withdrawEther(user1, ethToWithdraw);
    const ethBal2 = await ethers.provider.getBalance(user1);
    expect(ethBal2.sub(ethBal1)).to.be.equal(ethToWithdraw);
  });

  it("can add non-compliant tokens to invalidAssets", async () => {
    expect(
      await chargedSettings.connect(signerD).setAssetInvalidity(amplAddress, true)
    ).to.emit(chargedSettings, 'AssetInvaliditySet').withArgs(amplAddress, true)

    await signerD.sendTransaction({ to: amplHodler, value: toWei('10') });

    await ampl.connect(amplSigner).transfer(user1, '100000000000');
    await ampl.connect(signer1).approve(proton.address, '100000000000');

    await expect(
      proton.connect(signer1).createChargedParticle(
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'generic',                    // walletManagerId
        amplAddress,                  // assetToken
        '100000000000',               // assetAmount
        annuityPct                    // annuityPercent
      )
    ).to.be.revertedWith('CP:E-424');

    await expect(
      proton.connect(signer1).createChargedParticle(
        user1,                        // creator
        user2,                        // receiver
        user3,                        // referrer
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave',                       // walletManagerId
        amplAddress,                  // assetToken
        '100000000000',               // assetAmount
        annuityPct                    // annuityPercent
      )
    ).to.be.revertedWith('CP:E-424');
  })

  // it("can accept a cryptopunks deposit", async () => {
  //     let punksAddress = cryptoPunksMarket.address;
  //     let fnSig = cryptoPunksMarket.interface.getSighash('punkIndexToAddress(uint256)');
  //     expect(
  //         await tokenInfoProxy.setContractFnOwnerOf(punksAddress, fnSig)
  //     ).to.emit(tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
  //         punksAddress, 'ownerOf', fnSig
  //     )

  //     fnSig = cryptoPunksMarket.interface.getSighash('buyPunk(uint256)');
  //     expect(
  //         await tokenInfoProxy.setContractFnCollectOverride(punksAddress, fnSig)
  //     ).to.emit(tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
  //         punksAddress, 'collectOverride', fnSig
  //     )

  //     fnSig = cryptoPunksMarket.interface.getSighash('transferPunk(address,uint256)');
  //     expect(
  //         await tokenInfoProxy.setContractFnDepositOverride(punksAddress, fnSig)
  //     ).to.emit(tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
  //         punksAddress, 'depositOverride', fnSig
  //     )

  //     // const tokenId1 = await callAndReturn({
  //     //   contractInstance: proton,
  //     //   contractMethod: 'createChargedParticle',
  //     //   contractCaller: signer1,
  //     //   contractParams: [
  //     //     user1,                        // creator
  //     //     user2,                        // receiver
  //     //     user3,                        // referrer
  //     //     TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //     //     'generic',                    // walletManagerId
  //     //     daiAddress,                   // assetToken
  //     //     toWei('3'),                   // assetAmount
  //     //     annuityPct,                   // annuityPercent
  //     //   ],
  //     // });
  //     //
  //     // await chargedParticles.connect(signer1).covalentBond(
  //     //   proton.address,
  //     //   tokenId1,
  //     //   'generic',
  //     //   proton.address,
  //     //   tokenId2,
  //     //   '0x',
  //     //   '0x'
  //     // );

  // });

});
