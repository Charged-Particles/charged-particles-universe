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
  getNetworkBlockNumber,
  setNetworkAfterBlockNumber,
  setNetworkAfterTimestamp
} = require('../../js-helpers/test')(network);

const { expect, assert } = require('chai');
const { max } = require('lodash');

const CryptoPunksMarket = require('../../build/contracts/contracts/test/CryptoPunks.sol/CryptoPunksMarket.json');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';

const daiABI = require('../abis/dai');
const { balanceOf } = require('../../js-helpers/balanceOf');
const daiHodler = "0x55e4d16f9c3041EfF17Ca32850662f3e9Dddbce7"; // Hodler with the highest current amount of DAI, used for funding our operations on mainnet fork.

let overrides = { gasLimit: 20000000 }

describe("[INTEGRATION] Charged Particles", () => {
  let chainId;

  // External contracts
  let dai;
  let daiAddress;
  let cryptoPunksMarket;

  // Internal contracts
  let universe;
  let chargedParticles;
  let aaveWalletManager;
  let genericWalletManager;
  let genericBasketManager;
  let proton;
  let lepton;
  let ionx;
  let timelocks;
  let tokenInfoProxy;

  // Settings
  let annuityPct = '1000';  // 10%

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

    // test NFTs that are non-compliant with ERC721 standard
    cryptoPunksMarket = await deployMockContract(signerD, CryptoPunksMarket.abi, overrides);

    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const Proton = await ethers.getContractFactory('Proton');
    const Lepton = await ethers.getContractFactory('Lepton2');
    const Ionx = await ethers.getContractFactory('Ionx');
    const IonxTimelock = await ethers.getContractFactory('IonxTimelock');
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy')

    tokenInfoProxy = TokenInfoProxy.attach(getDeployData('TokenInfoProxy', chainId).address)
    universe = Universe.attach(getDeployData('Universe', chainId).address);
    chargedState = ChargedState.attach(getDeployData('ChargedState', chainId).address);
    chargedSettings = ChargedSettings.attach(getDeployData('ChargedSettings', chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    aaveWalletManager = AaveWalletManager.attach(getDeployData('AaveWalletManager', chainId).address);
    genericWalletManager = GenericWalletManager.attach(getDeployData('GenericWalletManager', chainId).address);
    genericBasketManager = GenericBasketManager.attach(getDeployData('GenericBasketManager', chainId).address);
    proton = Proton.attach(getDeployData('Proton', chainId).address);
    lepton = Lepton.attach(getDeployData('Lepton2', chainId).address);
    ionx = Ionx.attach(getDeployData('Ionx', chainId).address);
    timelocks = Object.values(getDeployData('IonxTimelocks', chainId))
      .map(ionxTimelock => (IonxTimelock.attach(ionxTimelock.address)));

    await lepton.connect(signerD).setPausedState(false);
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiHodler]
    });
  });

  it("can succesfully energize and release proton", async () => {

    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

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
        daiAddress, // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
    });

    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'aave',
      daiAddress
    );

    expect(await dai.balanceOf(user2)).to.be.above(toWei('9.9'));
  });

  it("can discharge only after timelock expired", async () => {
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

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
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    const energizedParticleId = await callAndReturn({
      contractInstance: proton,
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

    await proton.connect(signer1).setSalePrice(energizedParticleId, toWei('0.1'));
    await proton.connect(signer1).setRoyaltiesPct(energizedParticleId, 500); // royaltyPct = 5%
    const user1Balance1 = await ethers.provider.getBalance(user1);
    await proton.connect(signer2).buyProton(energizedParticleId, { value: toWei('0.1') })
    const user1Balance2 = await ethers.provider.getBalance(user1);

    expect(user1Balance2.sub(user1Balance1)).to.be.equal(toWei('0.1'));
    expect(await proton.ownerOf(energizedParticleId)).to.be.equal(user2);

    await proton.connect(signer2).setSalePrice(energizedParticleId, toWei('1'));
    const user2Balance1 = await ethers.provider.getBalance(user2);
    await proton.connect(signer3).buyProton(energizedParticleId, { value: toWei('1') })
    const user1Balance3 = await ethers.provider.getBalance(user1);
    const user2Balance2 = await ethers.provider.getBalance(user2);

    expect(user2Balance2.sub(user2Balance1)).to.be.equal(toWei('0.955'));
    expect(await proton.ownerOf(energizedParticleId)).to.be.equal(user3);

    // Creator Royalties (not transferred at time of sale, must be claimed by receiver)
    expect(user1Balance3.sub(user1Balance2)).to.be.equal(toWei('0'));
    expect(await proton.connect(signer1).claimCreatorRoyalties())
      .to.emit(proton, 'RoyaltiesClaimed')
      .withArgs(user1, toWei('0.045'));
  });

  it("IonxTimelocks succesfully release Ionx to receivers", async () => {
    const receivers = await Promise.all(timelocks.map(async timelock => await timelock.receiver()));

    const balancesBefore = await Promise.all(receivers.map(async receiver => await ionx.balanceOf(receiver)));

    const releaseTimes = await Promise.all(timelocks.map(async timelock => await timelock.nextReleaseTime()));

    await Promise.all(timelocks.map(async timelock => {
      await expect(timelock.release('0', '0')).to.not.emit(timelock, 'PortionReleased');
    }));

    const maxReleaseTime = max(releaseTimes);

    await setNetworkAfterTimestamp(Number(maxReleaseTime.toString()));

    await Promise.all(timelocks.map(async timelock => {
      await expect(timelock.release('0', '0')).to.emit(timelock, 'PortionReleased');
    }));

    await Promise.all(receivers.map(async (receiver, i) => {
      expect(await ionx.balanceOf(receiver)).to.be.above(balancesBefore[i]);
    }));

  });

  it("generic smart wallet and manager succesfully hold erc20 tokens", async () => {
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

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
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

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

    await proton.connect(signer2).approve(chargedParticles.address, tokenId2);

    await chargedParticles.connect(signer2).covalentBond(
      proton.address,
      tokenId1,
      'generic',
      proton.address,
      tokenId2,
      '0x',
      '0x'
    );

    await chargedParticles.connect(signer2).breakCovalentBond(
      user1,
      proton.address,
      tokenId1,
      'generic',
      proton.address,
      tokenId2
    );

    expect(await proton.ownerOf(tokenId2)).to.be.equal(user1);
  });

  it("cannot discharge more than the wallet holds", async () => {
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

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
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

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
  //     leptonId
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

  it("should not allow to charge a proton with a lepton multiple times", async () => {
    await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

    await dai.connect(daiSigner).transfer(user1, toWei('10'));
    await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

    const protonId = await callAndReturn({
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

    await lepton.connect(signerD).setPausedState(false);

    const price1 = await lepton.getNextPrice();

    const leptonId1 = await callAndReturn({
      contractInstance: lepton,
      contractMethod: 'mintLepton',
      contractCaller: signer3,
      contractParams: [],
      callValue: price1.toString()
    });

    const price2 = await lepton.getNextPrice();

    const leptonId2 = await callAndReturn({
      contractInstance: lepton,
      contractMethod: 'mintLepton',
      contractCaller: signer3,
      contractParams: [],
      callValue: price2.toString()
    });

    await lepton.connect(signer3).approve(chargedParticles.address, leptonId1);
    await lepton.connect(signer3).approve(chargedParticles.address, leptonId2);

    await chargedParticles.connect(signer3).covalentBond(
      proton.address,
      protonId,
      'generic',
      lepton.address,
      leptonId1,
      '0x',
      '0x'
    );

    await expect(chargedParticles.connect(signer3).covalentBond(
      proton.address,
      protonId,
      'generic',
      lepton.address,
      leptonId2,
      '0x',
      '0x'
    )).to.be.revertedWith('CP:E-430');
  });

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

  it("can accept a cryptopunks deposit", async () => {
      let punksAddress = cryptoPunksMarket.address;
      let fnSig = cryptoPunksMarket.interface.getSighash('punkIndexToAddress(uint256)');
      expect(
          await tokenInfoProxy.setContractFnOwnerOf(punksAddress, fnSig)
      ).to.emit(tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
          punksAddress, 'ownerOf', fnSig
      )

      fnSig = cryptoPunksMarket.interface.getSighash('buyPunk(uint256)');
      expect(
          await tokenInfoProxy.setContractFnCollectOverride(punksAddress, fnSig)
      ).to.emit(tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
          punksAddress, 'collectOverride', fnSig
      )

      fnSig = cryptoPunksMarket.interface.getSighash('transferPunk(address,uint256)');
      expect(
          await tokenInfoProxy.setContractFnDepositOverride(punksAddress, fnSig)
      ).to.emit(tokenInfoProxy, 'ContractFunctionSignatureSet').withArgs(
          punksAddress, 'depositOverride', fnSig
      )

      // const tokenId1 = await callAndReturn({
      //   contractInstance: proton,
      //   contractMethod: 'createChargedParticle',
      //   contractCaller: signer1,
      //   contractParams: [
      //     user1,                        // creator
      //     user2,                        // receiver
      //     user3,                        // referrer
      //     TEST_NFT_TOKEN_URI,           // tokenMetaUri
      //     'generic',                    // walletManagerId
      //     daiAddress,                   // assetToken
      //     toWei('3'),                   // assetAmount
      //     annuityPct,                   // annuityPercent
      //   ],
      // });
      //
      // await chargedParticles.connect(signer1).covalentBond(
      //   proton.address,
      //   tokenId1,
      //   'generic',
      //   proton.address,
      //   tokenId2,
      //   '0x',
      //   '0x'
      // );

  });

});
