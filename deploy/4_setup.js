const {
  chainNameById,
  chainIdByName,
  getDeployData,
  log,
  presets,
} = require("../js-helpers/deploy");

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 3;

    const chainId = chainIdByName(network.name);

    const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[chainId];
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];
    const referralCode = presets.Aave.referralCode[chainId];
    const mintFee = presets.Proton.mintFee;

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveBridgeV1 = getDeployData('AaveBridgeV1', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddProton = getDeployData('Proton', chainId);
    const ddIon = getDeployData('Ion', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    log('  Loading Universe from: ', ddUniverse.address);
    const Universe = await ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    log('  Loading AaveWalletManager from: ', ddAaveWalletManager.address);
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading Ion from: ', ddIon.address);
    const Ion = await ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Charged Particles & Universe
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log('\n  - Universe: Registering ChargedParticles')(alchemyTimeout);
    await universe.setChargedParticles(ddChargedParticles.address);

    // log(`  - Universe: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await universe.transferOwnership(owner);

    log('  - ChargedParticles: Registering Universe')(alchemyTimeout);
    await chargedParticles.setUniverse(ddUniverse.address);

    // log('  - ChargedParticles: Setting Deposit Fee')(alchemyTimeout);
    // const depositFees = _.map(presets.ChargedParticles.fees, 'fee');
    // const depositLimits = _.map(presets.ChargedParticles.fees, 'limit');
    // await chargedParticles.setDepositFees(depositLimits, depositFees);

    // log(`  - ChargedParticles: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await chargedParticles.transferOwnership(owner);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Aave Wallet Manager
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log('  - AaveWalletManager: Setting Charged Particles as Controller')(alchemyTimeout);
    await aaveWalletManager.setController(ddChargedParticles.address);

    if (lendingPoolProviderV2.length > 0) {
      log('  - AaveWalletManager: Setting Aave Bridge to V2')(alchemyTimeout);
      await aaveWalletManager.setAaveBridge(ddAaveBridgeV2.address);
    } else {
      if (lendingPoolProviderV1.length > 0) {
        log('  - AaveWalletManager: Setting Aave Bridge to V1')(alchemyTimeout);
        await aaveWalletManager.setAaveBridge(ddAaveBridgeV1.address);
      } else {
        log('  - AaveWalletManager: NO Aave Bridge Available!!!');
      }
    }

    if (referralCode.length > 0) {
      log('  - AaveWalletManager: Setting Referral Code')(alchemyTimeout);
      await aaveWalletManager.setReferralCode(referralCode);
    }

    log('  - AaveWalletManager: Registering Aave as LP with ChargedParticles')(alchemyTimeout);
    await chargedParticles.registerLiquidityProvider('aave', ddAaveWalletManager.address);

    // log(`  - AaveWalletManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await aaveWalletManager.transferOwnership(owner);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Proton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log('  - Proton: Registering Universe')(alchemyTimeout);
    await proton.setUniverse(ddUniverse.address);

    log('  - Proton: Registering ChargedParticles')(alchemyTimeout);
    await proton.setChargedParticles(ddChargedParticles.address);

    log('  - Proton: Setting Mint Fee:', mintFee.toString())(alchemyTimeout);
    await proton.setMintFee(mintFee);

    log('  - ChargedParticles: Registering Proton')(alchemyTimeout);
    await chargedParticles.updateWhitelist(ddProton.address, true);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Ion
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log('  - Ion: Registering Universe')(alchemyTimeout);
    await ion.setUniverse(ddUniverse.address);

    log('  - Universe: Registering Ion')(alchemyTimeout);
    await universe.setIonToken(ddIon.address);

    let assetTokenId;
    let assetTokenAddress;
    let assetTokenMultiplier;
    for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
        assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
        assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

        log('  - Universe: Setting Ion Rewards Multiplier for Asset Token: ', assetTokenAddress, ' to: ', assetTokenMultiplier)(alchemyTimeout);
        await universe.setIonRewardsMultiplier(assetTokenAddress, assetTokenMultiplier);
    }


    log('\n  Contract Initialization Complete!')(alchemyTimeout);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['setup']
