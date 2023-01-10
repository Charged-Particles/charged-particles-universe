const { executeTx } = require('../js-helpers/executeTx');
const {
  getContractAbi,
  getDeployData,
  saveDeploymentData,
  getTxGasCost,
} = require('../js-helpers/deploy');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};

  const chainId = chainIdByName(network.name);
  const {isProd, isHardhat} = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 3 : 2);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Proton C - Contract Deployment & Setup');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log(' ');

  const ddUniverse = getDeployData('Universe', chainId);
  const ddChargedState = getDeployData('ChargedState', chainId);
  const ddChargedSettings = getDeployData('ChargedSettings', chainId);
  const ddChargedParticles = getDeployData('ChargedParticles', chainId);

  log('  Loading Universe from:              ', ddUniverse.address);
  const Universe = await ethers.getContractFactory('Universe');
  const universe = await Universe.attach(ddUniverse.address);

  log('  Loading ChargedSettings from:       ', ddChargedSettings.address);
  const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
  const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Deploy ProtonC
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await log('\n  Deploying ProtonC NFT...')(alchemyTimeout);
  const ProtonC = await ethers.getContractFactory('ProtonC');
  const ProtonCInstance = await ProtonC.deploy();
  const protonC = await ProtonCInstance.deployed();
  deployData['ProtonC'] = {
    abi: getContractAbi('ProtonC'),
    address: protonC.address,
    deployTransaction: protonC.deployTransaction,
  }
  saveDeploymentData(chainId, deployData);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup ProtonC
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await executeTx('1-a', 'ProtonC: Registering Universe', async () =>
    await protonC.setUniverse(ddUniverse.address)
  );

  await executeTx('1-b', 'ProtonC: Registering ChargedState', async () =>
    await protonC.setChargedState(ddChargedState.address)
  );

  await executeTx('1-c', 'ProtonC: Registering ChargedSettings', async () =>
    await protonC.setChargedSettings(ddChargedSettings.address)
  );

  await executeTx('1-d', 'ProtonC: Registering ChargedParticles', async () =>
    await protonC.setChargedParticles(ddChargedParticles.address)
  );

  await executeTx('1-e', 'ChargedSettings: Enabling ProtonC for Charge', async () =>
    await chargedSettings.enableNftContracts([protonC.address])
  );

  await executeTx('1-g', 'Universe: Registering ProtonC', async () =>
    await universe.setProtonToken(protonC.address)
  );


  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - ProtonC:     ', protonC.address);
  log('     - Block:    ', protonC.deployTransaction.blockNumber);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: protonC.deployTransaction }));

  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['protonC']
