
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

  const ddChargedParticles = getDeployData('ChargedParticles', network.config.chainId);
  const ddAaveWalletManager = getDeployData('AaveWalletManager', network.config.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Execute Transaction');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(network.config.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading AaveWalletManager from: ', ddAaveWalletManager.address);
  const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
  const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

  log('  - Setting Charged Particles as Controller...');
  await aaveWalletManager.setController(ddChargedParticles.address);

  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
