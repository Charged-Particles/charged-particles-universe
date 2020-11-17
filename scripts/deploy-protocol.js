
const { ethers, upgrades, getNamedAccounts, deployments } = require('@nomiclabs/buidler');

const {
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  chainName,
  presets,
  toWei,
} = require('../js-utils/deploy-helpers');

async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner, trustedForwarder } = await getNamedAccounts();

  const deployData = {};

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Protocol - Contract Initialization');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', owner);
  log('  - Trusted Forwarder: ', trustedForwarder);
  log(' ');


  log('  Deploying Universe...');
  const Universe = await ethers.getContractFactory('Universe');
  const UniverseInstance = await upgrades.deployProxy(Universe, []);
  const universe = await UniverseInstance.deployed();
  deployData['Universe'] = {
    abi: getContractAbi('Universe'),
    address: universe.address,
    deployTransaction: universe.deployTransaction,
  }

  log('  Deploying ChargedParticles...');
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [trustedForwarder]);
  const chargedParticles = await ChargedParticlesInstance.deployed();
  deployData['ChargedParticles'] = {
    abi: getContractAbi('ChargedParticles'),
    address: chargedParticles.address,
    deployTransaction: chargedParticles.deployTransaction,
  }

  log('  - Registering ChargedParticles with Universe...');
  await universe.setChargedParticles(chargedParticles.address);

  log('  - Registering Universe with ChargedParticles...');
  await chargedParticles.setUniverse(universe.address);

  log('  - Setting Deposit Fee...');
  await chargedParticles.setDepositFee(presets.ChargedParticles.fees.deposit);

  // log(`  Transferring Contract Ownership to '${owner}'...`);
  // await universe.transferOwnership(owner);
  // await chargedParticles.transferOwnership(owner);

  // Display Contract Addresses
  log('\n  Contract Deployments Complete!\n\n  Contracts:');
  log('  - Universe:         ', universe.address);
  log('     - Gas Cost:      ', getTxGasCost({deployTransaction: universe.deployTransaction}));
  log('  - ChargedParticles: ', chargedParticles.address);
  log('     - Gas Cost:      ', getTxGasCost({deployTransaction: chargedParticles.deployTransaction}));

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
