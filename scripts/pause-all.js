
const { ethers, getNamedAccounts } = require('@nomiclabs/buidler');
const _ = require('lodash');

const {
  chainNameById,
  getDeployData,
} = require('../js-helpers/deploy');


async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  const ddAaveWalletManager = getDeployData('AaveWalletManager', network.config.chainId);
  const ddGenericWalletManager = getDeployData('GenericWalletManager', network.config.chainId);
  const ddGenericBasketManager = getDeployData('GenericBasketManager', network.config.chainId);
  const ddProton = getDeployData('Proton', network.config.chainId);
  const ddLepton = getDeployData('Lepton', network.config.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Pause All Contracts');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(network.config.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
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

  log('  Loading Proton from: ', ddProton.address);
  const Proton = await ethers.getContractFactory('Proton');
  const proton = await Proton.attach(ddProton.address);

  log('  Loading Lepton from: ', ddLepton.address);
  const Lepton = await ethers.getContractFactory('Lepton');
  const lepton = await Lepton.attach(ddLepton.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Set Paused State
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  log('  - Pausing GenericWalletManager...');
  await genericWalletManager.setPausedState(true);

  log('  - Pausing GenericBasketManager...');
  await genericBasketManager.setPausedState(true);

  log('  - Pausing AaveWalletManager...');
  await aaveWalletManager.setPausedState(true);

  log('  - Pausing Proton...');
  await proton.setPausedState(true);

  log('  - Pausing Lepton...');
  await lepton.setPausedState(true);


  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
