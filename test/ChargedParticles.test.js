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

const {
  callAndReturn,
  getNetworkBlockNumber,
  setNetworkAfterBlockNumber,
  setNetworkAfterTimestamp
} = require('../js-helpers/test')(network);

const { expect } = require('chai');
const { max } = require('lodash');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';

const daiABI = require('./abis/dai');
const daiHodler = "0x55e4d16f9c3041EfF17Ca32850662f3e9Dddbce7"; // Hodler with the highest current amount of DAI, used for funding our operations on mainnet fork.

describe("Charged Particles", () => {
  let chainId;

  // External contracts
  let dai;
  let daiAddress;

  // Internal contracts
  let universe;
  let chargedParticles;
  let aaveWalletManager;
  let genericERC20WalletManager;
  let genericERC721WalletManager;
  let proton;
  let ion;
  let timelocks;

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

    // Connect to Internal Contracts
    const Universe = await ethers.getContractFactory('Universe');
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const GenericERC20WalletManager = await ethers.getContractFactory('GenericERC20WalletManager');
    const GenericERC721WalletManager = await ethers.getContractFactory('GenericERC721WalletManager');
    const Proton = await ethers.getContractFactory('Proton');
    const Ion = await ethers.getContractFactory('Ion');
    const IonTimelock = await ethers.getContractFactory('IonTimelock');

    universe = Universe.attach(getDeployData('Universe', chainId).address);
    chargedParticles = ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address);
    aaveWalletManager = AaveWalletManager.attach(getDeployData('AaveWalletManager', chainId).address);
    genericERC20WalletManager = GenericERC20WalletManager.attach(getDeployData('GenericERC20WalletManager', chainId).address);
    genericERC721WalletManager = GenericERC721WalletManager.attach(getDeployData('GenericERC721WalletManager', chainId).address);
    proton = Proton.attach(getDeployData('Proton', chainId).address);
    ion = Ion.attach(getDeployData('Ion', chainId).address);
    timelocks = Object.values(getDeployData('IonTimelocks', chainId))
      .map(ionTimelock => (IonTimelock.attach(ionTimelock.address)));
  });

  afterEach(async () => {
    // With Forked Mainnet
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [daiHodler]
    });
  });

  it('charged particles should have enabled "aave" and "generic" as liquidity providers', async () => {
    expect(await chargedParticles.isLiquidityProviderEnabled('aave')).to.equal(true);
    expect(await chargedParticles.isLiquidityProviderEnabled('genericERC20')).to.equal(true);
    expect(await chargedParticles.isLiquidityProviderEnabled('genericERC721')).to.equal(true);
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
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'aave',                       // liquidityProviderId
        daiAddress, // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
      callValue: presets.Proton.mintFee,
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
        TEST_NFT_TOKEN_URI,
        'aave',
        daiAddress,
        toWei('10'),
        annuityPct,
      ],
      callValue: presets.Proton.mintFee
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
      daiAddress
    )).to.be.revertedWith("ChargedParticles: E-302");

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
        TEST_NFT_TOKEN_URI,
        'aave',
        daiAddress,
        toWei('10'),
        annuityPct,
      ],
      callValue: presets.Proton.mintFee
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
    expect(user1Balance3.sub(user1Balance2)).to.be.equal(toWei('0.045'));
    expect(await proton.ownerOf(energizedParticleId)).to.be.equal(user3);
  });

  it("iontimelocks succesfully release ions to receivers", async () => {
    const receivers = await Promise.all(timelocks.map(async timelock => await timelock.receiver()));

    const balancesBefore = await Promise.all(receivers.map(async receiver => await ion.balanceOf(receiver)));

    const releaseTimes = await Promise.all(timelocks.map(async timelock => await timelock.nextReleaseTime()));

    await Promise.all(timelocks.map(async timelock => {
      await expect(timelock.release()).to.not.emit(timelock, 'PortionReleased');
    }));

    const maxReleaseTime = max(releaseTimes);

    await setNetworkAfterTimestamp(Number(maxReleaseTime.toString()));

    await Promise.all(timelocks.map(async timelock => {
      await expect(timelock.release()).to.emit(timelock, 'PortionReleased');
    }));

    await Promise.all(receivers.map(async (receiver, i) => {
      expect(await ion.balanceOf(receiver)).to.be.above(balancesBefore[i]);
    }));

  });

  it("ions can only be transferred after locking block", async () => {
    const blocks = 10;
    const receivers = await Promise.all(timelocks.map(async timelock => await timelock.receiver()));
    const maxReleaseTime = max(await Promise.all(timelocks.map(async timelock => await timelock.nextReleaseTime())));
    await setNetworkAfterTimestamp(Number(maxReleaseTime.toString()));
    await Promise.all(timelocks.map(async timelock => {
      await timelock.release();
    }));
    user1 = receivers[0];
    user2 = receivers[1];
    signer1 = ethers.provider.getSigner(user1);
    signer2 = ethers.provider.getSigner(user2);

    await expect(ion.connect(signer2).lock(user1, await ion.balanceOf(user1), blocks)).to.be.revertedWith("ION: E-409");

    await ion.connect(signer1).increaseLockAllowance(user2, await ion.balanceOf(user1));

    await ion.connect(signer2).lock(user1, await ion.balanceOf(user1), blocks);

    await expect(ion.connect(signer1).transfer(user3, await ion.balanceOf(user1))).to.be.revertedWith("ION: E-409");

    await setNetworkAfterBlockNumber(Number((await getNetworkBlockNumber()).toString()) + blocks);

    const balance1Before = await ion.balanceOf(user1);
    const balance3Before = await ion.balanceOf(user3);

    await ion.connect(signer1).transfer(user3, balance1Before);

    expect(await ion.balanceOf(user3)).to.be.equal(balance3Before.add(balance1Before));
  });

  it("genericERC20 smart wallet and manager succesfully hold erc20 tokens", async () => {
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
        TEST_NFT_TOKEN_URI,           // tokenMetaUri
        'genericERC20',               // liquidityProviderId
        daiAddress,                   // assetToken
        toWei('10'),                  // assetAmount
        annuityPct,                   // annuityPercent
      ],
      callValue: presets.Proton.mintFee,
    });

    await chargedParticles.connect(signer2).releaseParticle(
      user2,
      proton.address,
      energizedParticleId,
      'genericERC20',
      daiAddress
    );

    expect((await dai.balanceOf(user2)).sub(user2BalanceBefore)).to.be.equal(toWei('10'));
  });

  // it("genericERC721 smart wallet and manager succesfully hold erc721 tokens", async () => {
  //   await signerD.sendTransaction({ to: daiHodler, value: toWei('10') }); // charge up the dai hodler with a few ether in order for it to be able to transfer us some tokens

  //   await dai.connect(daiSigner).transfer(user1, toWei('10'));
  //   await dai.connect(signer1)['approve(address,uint256)'](proton.address, toWei('10'));

  //   const tokenId = await callAndReturn({
  //     contractInstance: proton,
  //     contractMethod: 'createChargedParticle',
  //     contractCaller: signer1,
  //     contractParams: [
  //       user1,                        // creator
  //       user2,                        // receiver
  //       TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //       'genericERC20',               // liquidityProviderId
  //       daiAddress,                   // assetToken
  //       toWei('10'),                  // assetAmount
  //       annuityPct,                   // annuityPercent
  //     ],
  //     callValue: presets.Proton.mintFee,
  //   });

  //   const energizedParticleId = await callAndReturn({
  //     contractInstance: proton,
  //     contractMethod: 'createChargedParticle',
  //     contractCaller: signer2,
  //     contractParams: [
  //       user2,                        // creator
  //       user3,                        // receiver
  //       TEST_NFT_TOKEN_URI,           // tokenMetaUri
  //       'genericERC721',              // liquidityProviderId
  //       proton.address,               // assetToken
  //       tokenId,                      // assetID
  //       annuityPct,                   // annuityPercent
  //     ],
  //     callValue: presets.Proton.mintFee,
  //   });

  //   await chargedParticles.connect(signer3).releaseParticle(
  //     user3,
  //     proton.address,
  //     energizedParticleId,
  //     'genericERC721',
  //     proton.address
  //   );

  //   expect(await proton.ownerOf(tokenId)).to.be.equal(user3);
  // });

});
