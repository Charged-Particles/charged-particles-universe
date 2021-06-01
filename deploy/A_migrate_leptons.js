const {
  getDeployData,
  getActualTxGasCost,
} = require('../js-helpers/deploy');

const {
  log,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');


// 1 - Gas Cost:  0.0121224
// 2 - Gas Cost:  0.0154279    (diff: 0.0033055)
// 3 - Gas Cost:  0.0187334    (diff: 0.0033055)
// 4 - Gas Cost:  0.0220389    (diff: 0.0033055)
// 5 - Gas Cost:  0.0253444    (diff: 0.0033055)
// ...
// 100 - Estimated between 0.3393669 ETH  to  0.8522872 ETH

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
  // Migrate Leptons
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await log(`  - Migrating ${_AMOUNT_TO_MIGRATE} Tokens from ${ddLepton.address}...`)(alchemyTimeout);
  const result = await lepton2.migrateAccounts(ddLepton.address, _AMOUNT_TO_MIGRATE);
  log('     - Gas Cost: ', (await getActualTxGasCost(result)));


  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['migrate-leptons']