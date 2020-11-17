
const { ethers, getNamedAccounts } = require('@nomiclabs/buidler');
const _ = require('lodash');

const {
  chainName,
  getDeployData,
} = require('../js-utils/deploy-helpers');


async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);
  const ddAaveWalletManager = getDeployData('AaveWalletManager', network.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Execute Transaction');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading AaveWalletManager from: ', ddChargedParticles.address);
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
