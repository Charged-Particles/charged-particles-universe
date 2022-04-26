const {
  getDeployData,
} = require('../js-helpers/deploy');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');


const _PAUSED_STATE = false;
const _ACTION = _PAUSED_STATE ? 'Pausing' : 'Unpausing';


module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;

  const chainId = chainIdByName(network.name);
  const {isProd, isHardhat} = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 1 : 3);

  if (chainId !== 1) { return; } // Mainnet only

  const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
  const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
  const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
  const ddAaveWalletManagerB = getDeployData('AaveWalletManagerB', chainId);
  const ddGenericWalletManagerB = getDeployData('GenericWalletManagerB', chainId);
  const ddGenericBasketManagerB = getDeployData('GenericBasketManagerB', chainId);
  const ddProton = getDeployData('Proton', chainId);
  const ddLepton = getDeployData('Lepton', chainId);
  const ddLepton2 = getDeployData('Lepton2', chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Pause All Contracts');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', protocolOwner);
  log(' ');

  log('  Loading GenericWalletManager from: ', ddGenericWalletManager.address);
  const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
  const genericWalletManager = await GenericWalletManager.attach(ddGenericWalletManager.address);

  log('  Loading GenericBasketManager from: ', ddGenericBasketManager.address);
  const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
  const genericBasketManager = await GenericBasketManager.attach(ddGenericBasketManager.address);

  log('  Loading AaveWalletManager from: ', ddAaveWalletManager.address);
  const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
  const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

  log('  Loading GenericWalletManagerB from: ', ddGenericWalletManagerB.address);
  const GenericWalletManagerB = await ethers.getContractFactory('GenericWalletManagerB');
  const genericWalletManagerB = await GenericWalletManagerB.attach(ddGenericWalletManagerB.address);

  log('  Loading GenericBasketManagerB from: ', ddGenericBasketManagerB.address);
  const GenericBasketManagerB = await ethers.getContractFactory('GenericBasketManagerB');
  const genericBasketManagerB = await GenericBasketManagerB.attach(ddGenericBasketManagerB.address);

  log('  Loading AaveWalletManagerB from: ', ddAaveWalletManagerB.address);
  const AaveWalletManagerB = await ethers.getContractFactory('AaveWalletManagerB');
  const aaveWalletManagerB = await AaveWalletManagerB.attach(ddAaveWalletManagerB.address);

  log('  Loading Proton from: ', ddProton.address);
  const Proton = await ethers.getContractFactory('Proton');
  const proton = await Proton.attach(ddProton.address);

  log('  Loading Lepton from: ', ddLepton.address);
  const Lepton = await ethers.getContractFactory('Lepton');
  const lepton = await Lepton.attach(ddLepton.address);

  log('  Loading Lepton2 from: ', ddLepton2.address);
  const Lepton2 = await ethers.getContractFactory('Lepton2');
  const lepton2 = await Lepton2.attach(ddLepton2.address);


  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Set Paused State
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await log(`  - ${_ACTION} GenericWalletManager...`)(alchemyTimeout);
  await genericWalletManager.setPausedState(_PAUSED_STATE);

  await log(`  - ${_ACTION} GenericBasketManager...`)(alchemyTimeout);
  await genericBasketManager.setPausedState(_PAUSED_STATE);

  await log(`  - ${_ACTION} AaveWalletManager...`)(alchemyTimeout);
  await aaveWalletManager.setPausedState(_PAUSED_STATE);

  await log(`  - ${_ACTION} Proton...`)(alchemyTimeout);
  await proton.setPausedState(_PAUSED_STATE);

  await log(`  - ${_ACTION} Lepton...`)(alchemyTimeout);
  await lepton.setPausedState(_PAUSED_STATE);

  await log(`  - ${_ACTION} Lepton2...`)(alchemyTimeout);
  await lepton2.setPausedState(_PAUSED_STATE);


  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['pause-all']