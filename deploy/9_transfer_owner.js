const {
  getDeployData,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);

    if (chainId !== 1) { return; } // Only for Mainnet

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedState = getDeployData('ChargedState', chainId);
    const ddChargedSettings = getDeployData('ChargedSettings', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
    const ddProton = getDeployData('Proton', chainId);
    const ddLepton = getDeployData('Lepton', chainId);
    const ddIonx = getDeployData('Ionx', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Loading Universe from: ', ddUniverse.address);
    const Universe = await ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    log('  Loading ChargedState from: ', ddChargedState.address);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const chargedState = await ChargedState.attach(ddChargedState.address);

    log('  Loading ChargedSettings from: ', ddChargedSettings.address);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

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

    log('  Loading Lepton from: ', ddLepton.address);
    const Lepton = await ethers.getContractFactory('Lepton');
    const lepton = await Lepton.attach(ddLepton.address);

    log('  Loading Ionx from: ', ddIonx.address);
    const Ionx = await ethers.getContractFactory('Ionx');
    const ionx = await Ionx.attach(ddIonx.address);

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Transfer Ownership of All Contracts
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    log(`  - Universe: Transferring Contract Ownership to '${owner}'`);
    await universe.transferOwnership(owner);

    log(`  - ChargedState: Transferring Contract Ownership to '${owner}'`);
    await chargedState.transferOwnership(owner);

    log(`  - ChargedSettings: Transferring Contract Ownership to '${owner}'`);
    await chargedSettings.transferOwnership(owner);

    log(`  - ChargedParticles: Transferring Contract Ownership to '${owner}'`);
    await chargedParticles.transferOwnership(owner);

    log(`  - GenericWalletManager: Transferring Contract Ownership to '${owner}'`);
    await genericWalletManager.transferOwnership(owner);

    log(`  - GenericBasketManager: Transferring Contract Ownership to '${owner}'`);
    await genericBasketManager.transferOwnership(owner);

    log(`  - AaveWalletManager: Transferring Contract Ownership to '${owner}'`);
    await aaveWalletManager.transferOwnership(owner);

    log(`  - Proton: Transferring Contract Ownership to '${owner}'`);
    await proton.transferOwnership(owner);

    log(`  - Lepton: Transferring Contract Ownership to '${owner}'`);
    await lepton.transferOwnership(owner);

    log(`  - Ionx: Transferring Contract Ownership to '${owner}'`);
    await ionx.transferOwnership(owner);

    log('  Loading AaveBridgeV2 from: ', ddAaveBridgeV2.address);
    const AaveBridgeV2 = await ethers.getContractFactory('AaveBridgeV2');
    const aaveBridgeV2 = await AaveBridgeV2.attach(ddAaveBridgeV2.address);
    log(`  - AaveBridgeV2: Transferring Contract Ownership to '${owner}'`);
    await aaveBridgeV2.transferOwnership(owner);

    log(`\n  Contract Initialization Complete!`);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['transfer-owner']
