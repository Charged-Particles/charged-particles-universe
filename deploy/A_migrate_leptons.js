const {
  chainNameById,
  chainIdByName,
  getDeployData,
  log,
} = require("../js-helpers/deploy");

const _ = require('lodash');


const _AMOUNT_TO_MIGRATE = 100;

module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;

  const chainId = chainIdByName(network.name);
  const alchemyTimeout = 0;

  // if (chainId !== 1) { return; } // Mainnet only

  const ddLepton = getDeployData('Lepton', chainId);
  const ddLepton2 = getDeployData('Lepton2', chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Migrate Leptons');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', protocolOwner);
  log(' ');

  log('  Loading Lepton2 from: ', ddLepton2.address);
  const Lepton2 = await ethers.getContractFactory('Lepton2');
  const lepton2 = await Lepton2.attach(ddLepton2.address);


  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Migrate Users
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await log(`  - Migrating ${_AMOUNT_TO_MIGRATE} Tokens...`)(alchemyTimeout);
  await lepton2.migrateAccounts(ddLepton.address, _AMOUNT_TO_MIGRATE);


  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['pause-all']