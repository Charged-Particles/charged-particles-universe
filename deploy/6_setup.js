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

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : 5;

    const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[chainId];
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];
    const referralCode = presets.Aave.referralCode[chainId];
    const ionMaxSuppy = presets.Ion.maxSupply;
    const depositCap = presets.ChargedParticles.maxDeposit;
    const tempLockExpiryBlocks = presets.ChargedParticles.tempLockExpiryBlocks;

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveBridgeV1 = getDeployData('AaveBridgeV1', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
    const ddPhoton = getDeployData('Photon', chainId);
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

    log('  Loading GenericWalletManager from: ', ddGenericWalletManager.address);
    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const genericWalletManager = await GenericWalletManager.attach(ddGenericWalletManager.address);

    log('  Loading GenericBasketManager from: ', ddGenericBasketManager.address);
    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const genericBasketManager = await GenericBasketManager.attach(ddGenericBasketManager.address);

    log('  Loading Photon from: ', ddPhoton.address);
    const Photon = await ethers.getContractFactory('Photon');
    const photon = await Photon.attach(ddPhoton.address);

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading Ion from: ', ddIon.address);
    const Ion = await ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address);

    let txCount = 1;

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Charged Particles & Universe
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log(`\n  - [TX-${txCount++}] Universe: Registering ChargedParticles`)(alchemyTimeout);
    await universe.setChargedParticles(ddChargedParticles.address);

    // log(`  - [TX-${txCount++}] Universe: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await universe.transferOwnership(owner);

    log(`  - [TX-${txCount++}] ChargedParticles: Registering Universe`)(alchemyTimeout);
    await chargedParticles.setUniverse(ddUniverse.address);

    log(`  - [TX-${txCount++}] ChargedParticles: Setting Deposit Cap`)(alchemyTimeout);
    await chargedParticles.setDepositCap(depositCap);

    log(`  - [TX-${txCount++}] ChargedParticles: Setting Temp-Lock Expiry Blocks`)(alchemyTimeout);
    await chargedParticles.setTempLockExpiryBlocks(tempLockExpiryBlocks);

    // log(`  - [TX-${txCount++}] ChargedParticles: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await chargedParticles.transferOwnership(owner);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Generic Wallet Managers
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log(`  - [TX-${txCount++}] GenericWalletManager: Setting Charged Particles as Controller`)(alchemyTimeout);
    await genericWalletManager.setController(ddChargedParticles.address);

    log(`  - [TX-${txCount++}] GenericWalletManager: Registering Generic Wallet Manager with ChargedParticles`)(alchemyTimeout);
    await chargedParticles.registerWalletManager('generic', ddGenericWalletManager.address);

    // log(`  - [TX-${txCount++}] GenericWalletManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await genericWalletManager.transferOwnership(owner);

    log(`  - [TX-${txCount++}] GenericBasketManager: Setting Charged Particles as Controller`)(alchemyTimeout);
    await genericBasketManager.setController(ddChargedParticles.address);

    log(`  - [TX-${txCount++}] GenericBasketManager: Registering Generic Basket Manager with ChargedParticles`)(alchemyTimeout);
    await chargedParticles.registerBasketManager('generic', ddGenericBasketManager.address);

    // log(`  - [TX-${txCount++}] GenericBasketManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await genericBasketManager.transferOwnership(owner);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Aave Wallet Manager
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log(`  - [TX-${txCount++}] AaveWalletManager: Setting Charged Particles as Controller`)(alchemyTimeout);
    await aaveWalletManager.setController(ddChargedParticles.address);

    if (lendingPoolProviderV2.length > 0) {
      log(`  - [TX-${txCount++}] AaveWalletManager: Setting Aave Bridge to V2`)(alchemyTimeout);
      await aaveWalletManager.setAaveBridge(ddAaveBridgeV2.address);
    } else {
      if (lendingPoolProviderV1.length > 0) {
        log(`  - [TX-${txCount++}] AaveWalletManager: Setting Aave Bridge to V1`)(alchemyTimeout);
        await aaveWalletManager.setAaveBridge(ddAaveBridgeV1.address);
      } else {
        log(`  - AaveWalletManager: NO Aave Bridge Available!!!`);
      }
    }

    if (referralCode.length > 0) {
      log(`  - [TX-${txCount++}] AaveWalletManager: Setting Referral Code`)(alchemyTimeout);
      await aaveWalletManager.setReferralCode(referralCode);
    }

    log(`  - [TX-${txCount++}] AaveWalletManager: Registering Aave as LP with ChargedParticles`)(alchemyTimeout);
    await chargedParticles.registerWalletManager('aave', ddAaveWalletManager.address);

    // log(`  - [TX-${txCount++}] AaveWalletManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    // await aaveWalletManager.transferOwnership(owner);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Proton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log(`  - [TX-${txCount++}] Proton: Registering Universe`)(alchemyTimeout);
    await proton.setUniverse(ddUniverse.address);

    log(`  - [TX-${txCount++}] Proton: Registering ChargedParticles`)(alchemyTimeout);
    await proton.setChargedParticles(ddChargedParticles.address);

    log(`  - [TX-${txCount++}] ChargedParticles: Whitelisting Proton for Charge`)(alchemyTimeout);
    await chargedParticles.whitelistForCharge(ddProton.address, true);

    log(`  - [TX-${txCount++}] ChargedParticles: Whitelisting Proton for Basket`)(alchemyTimeout);
    await chargedParticles.whitelistForBasket(ddProton.address, true);

    log(`  - [TX-${txCount++}] ChargedParticles: Whitelisting Proton for Timelock-Self`)(alchemyTimeout);
    await chargedParticles.whitelistForTimelockSelf(ddProton.address, true);

    log(`  - [TX-${txCount++}] Universe: Registering Proton`)(alchemyTimeout);
    await universe.setProtonToken(ddProton.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Ion
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log(`  - [TX-${txCount++}] Ion: Registering Universe`)(alchemyTimeout);
    await ion.setUniverse(ddUniverse.address);

    log(`  - [TX-${txCount++}] Universe: Registering Ion`)(alchemyTimeout);
    await universe.setCation(ddIon.address, ionMaxSuppy);

    log(`  - [TX-${txCount++}] Ion: Minting to Universe`)(alchemyTimeout);
    await ion.mintToUniverse(ionMaxSuppy);

    let assetTokenId;
    let assetTokenAddress;
    let assetTokenMultiplier;
    for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
        assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
        assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

        log(`  - [TX-${txCount++}] Universe: Setting ESA Multiplier for Asset Token: `, assetTokenAddress, ` to: `, assetTokenMultiplier)(alchemyTimeout);
        await universe.setEsaMultiplier(assetTokenAddress, assetTokenMultiplier);
    }


    log(`\n  Contract Initialization Complete!`)(alchemyTimeout);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['setup']
