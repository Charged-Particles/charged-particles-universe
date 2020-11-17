
const { ethers, upgrades, getNamedAccounts, deployments } = require('@nomiclabs/buidler');
const _ = require('lodash');

const {
  chainName,
  getDeployData,
  getContractAbi,
  getTxGasCost,
  saveDeploymentData,
  presets,
} = require('../js-utils/deploy-helpers');


async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);
  const deployData = {};

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles LP: Aave - Contract Initialization');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading ChargedParticles from: ', ddChargedParticles.address);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

  log('\n  Deploying AaveWalletManager...');
  const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
  const AaveWalletManagerInstance = await AaveWalletManager.deploy();
  const aaveWalletManager = await AaveWalletManagerInstance.deployed();

  const lendingPoolProvider = presets.Aave.lendingPoolProvider[network.chainId];
  deployData['AaveWalletManager'] = {
    abi: getContractAbi('AaveWalletManager'),
    address: aaveWalletManager.address,
    lendingPoolProvider,
    deployTransaction: aaveWalletManager.deployTransaction,
  }

  log('  - Setting Charged Particles as Controller...');
  await aaveWalletManager.setController(ddChargedParticles.address);

  log('  - Setting Lending Pool Provider...');
  await aaveWalletManager.setLendingPoolProvider(lendingPoolProvider);

  if (presets.Aave.referralCode.length > 0) {
    log('  - Setting Referral Code...');
    await aaveWalletManager.setReferralCode(presets.Aave.referralCode);
  }

  log('  - Registering LP with ChargedParticles...');
  await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);

  // log(`  Transferring Contract Ownership to '${owner}'...`);
  // await aaveWalletManager.transferOwnership(owner);


  // Display Contract Addresses
  log('\n  Contract Deployments Complete!\n\n  Contracts:');
  log('  - AaveWalletManager:  ', aaveWalletManager.address);
  log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveWalletManager.deployTransaction}));

  saveDeploymentData(network.chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployed" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
