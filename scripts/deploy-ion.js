
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

  const ddUniverse = getDeployData('Universe', network.chainId);
  const deployData = {};

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles FT: Ion - Contract Initialization');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading Universe from: ', ddUniverse.address);
  const Universe = await ethers.getContractFactory('Universe');
  const universe = await Universe.attach(ddUniverse.address);

  log('\n  Deploying Ion FT...');
  const Ion = await ethers.getContractFactory('Ion');
  const IonInstance = await Ion.deploy();
  const ion = await IonInstance.deployed();
  deployData['Ion'] = {
    abi: getContractAbi('Ion'),
    address: ion.address,
    deployTransaction: ion.deployTransaction,
  }

  log('  - Registering Universe with Ion...');
  await ion.setUniverse(ddUniverse.address);

  log('  - Registering Ion with Universe...');
  await universe.setIonToken(ion.address);

  let assetTokenId;
  let assetTokenAddress;
  let assetTokenMultiplier;
  for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
    assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
    assetTokenAddress = _.get(presets, assetTokenId, {})[network.chainId];
    assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

    log('  - Setting Rewards Multiplier for Asset Token: ', assetTokenAddress, ' to: ', assetTokenMultiplier);
    await universe.setIonRewardsMultiplier(assetTokenAddress, assetTokenMultiplier);
  }

  // Display Contract Addresses
  log('\n  Contract Deployments Complete!\n\n  Contracts:');
  log('  - Ion:         ', ion.address);
  log('     - Gas Cost: ', getTxGasCost({deployTransaction: ion.deployTransaction}));

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
