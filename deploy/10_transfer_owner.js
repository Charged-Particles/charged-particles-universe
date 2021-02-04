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
    const alchemyTimeout = 5;

    if (chainId !== 1) { return; } // Only for Mainnet

    const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[chainId];
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveBridgeV1 = getDeployData('AaveBridgeV1', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
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

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading Ion from: ', ddIon.address);
    const Ion = await ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address);

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Transfer Ownership of All Contracts
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`  - Universe: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await universe.transferOwnership(owner);

    await log(`  - ChargedParticles: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await chargedParticles.transferOwnership(owner);

    await log(`  - GenericWalletManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await genericWalletManager.transferOwnership(owner);

    await log(`  - GenericBasketManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await genericBasketManager.transferOwnership(owner);

    await log(`  - AaveWalletManager: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await aaveWalletManager.transferOwnership(owner);

    await log(`  - Proton: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await proton.transferOwnership(owner);

    await log(`  - Ion: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
    await ion.transferOwnership(owner);

    if (lendingPoolProviderV2.length > 0) {
      log('  Loading AaveBridgeV2 from: ', ddAaveBridgeV2.address);
      const AaveBridgeV2 = await ethers.getContractFactory('AaveBridgeV2');
      const aaveBridgeV2 = await AaveBridgeV2.attach(ddAaveBridgeV2.address);

      await log(`  - AaveBridgeV2: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
      await aaveBridgeV2.transferOwnership(owner);

    } else {
      if (lendingPoolProviderV1.length > 0) {
        log('  Loading AaveBridgeV1 from: ', ddAaveBridgeV1.address);
        const AaveBridgeV1 = await ethers.getContractFactory('AaveBridgeV1');
        const aaveBridgeV1 = await AaveBridgeV1.attach(ddAaveBridgeV1.address);

        await log(`  - AaveBridgeV1: Transferring Contract Ownership to '${owner}'`)(alchemyTimeout);
        await aaveBridgeV1.transferOwnership(owner);
      }
    }

    await log(`\n  Contract Initialization Complete!`)(alchemyTimeout);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['transfer-owner']
