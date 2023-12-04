const hre = require("hardhat");
const {
  getDeployData,
  presets,
} = require('../js-helpers/deploy');
const { Contract } = require("ethers");

async function main() {
  const { ethers, getNamedAccounts } = hre;
  const log = console.log;
  const network = await ethers.provider.getNetwork();
  log(network);

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Execute Transaction');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', network.chainId);
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  // Create contract
  const universe = new Contract('Universe', [
    
  ])


  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
