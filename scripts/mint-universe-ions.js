
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

  const deployData = getDeployData({chainId: network.chainId});

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Mint Ion Tokens ');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  const IonTimelock = await ethers.getContractFactory('IonTimelock');
  const ionAddress = deployData['Ion'].address;

  deployData['IonTimelock'] = deployData['IonTimelock'] || [];

  // let receiver;
  // let IonTimelockInstance;
  // let ionTimelock;
  // for (let i = 0; i < presets.Ion.timelocks.length; i++) {
  //   receiver = presets.Ion.timelocks[i].receiver;

  //   log('\n  Deploying Ion Timelock for Receiver: ', receiver);
  //   IonTimelockInstance = await IonTimelock.deploy(receiver, ionAddress);
  //   ionTimelock = await IonTimelockInstance.deployed();

  //   deployData['IonTimelock'].push({
  //     abi: getContractAbi('IonTimelock'),
  //     address: ionTimelock.address,
  //     receiver,
  //     deployTransaction: ionTimelock.deployTransaction,
  //   });

  //   log('  - IonTimelock: ', ionTimelock.address);
  //   log('     - Gas Cost: ', getTxGasCost({deployTransaction: ionTimelock.deployTransaction}));
  // }

  // Display Contract Addresses
  log('\n  Contract Deployments Complete!');

  const filename = saveDeploymentData({chainId: network.chainId, deployData});
  log('\n  Contract Deployment Data saved to file: ');
  log('   ', filename);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
