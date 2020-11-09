
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

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  log("Charged Particles FT: Ion - Contract Initialization");
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");

  log("  Using Network: ", chainName(network.chainId));
  log("  Using Accounts:");
  log("  - Deployer:    ", deployer);
  log("  - Owner:       ", owner);
  log(" ");

  log("  Loading Universe from: ", deployData['Universe'].address);
  const Universe = await ethers.getContractFactory('Universe');
  const universe = await Universe.attach(deployData['Universe'].address);

  log("\n  Deploying Ion FT...");
  const lastKnownAddress = _.get(deployData, 'Ion.address', '');
  const Ion = await ethers.getContractFactory('Ion');
  const IonInstance = await Ion.deploy();
  const ion = await IonInstance.deployed();
  if (lastKnownAddress === ion.address) {
    log("\n  No Changes! Contracts Already Deployed at:");
    log("  - Ion:  ", ion.address);
    return;
  }

  deployData['Ion'] = {
    abi: getContractAbi('Ion'),
    address: ion.address,
    deployTransaction: ion.deployTransaction,
  }

  log("  - Registering Universe with Ion...");
  await ion.setUniverse(deployData['Universe'].address);

  log("  - Registering Ion with Universe...");
  await universe.setIonToken(ion.address);

  let assetTokenId;
  let assetTokenAddress;
  let assetTokenMultiplier;
  for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
    assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
    assetTokenAddress = _.get(presets, assetTokenId, {})[network.chainId];
    assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

    log("  - Setting Rewards Multiplier for Asset Token: ", assetTokenAddress, " to: ", assetTokenMultiplier);
    await universe.setIonRewardsMultiplier(assetTokenAddress, assetTokenMultiplier);
  }

  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n\n  Contracts:");
  log("  - Ion:         ", ion.address);
  log("     - Gas Cost: ", getTxGasCost({deployTransaction: ion.deployTransaction}));

  const filename = saveDeploymentData({chainId: network.chainId, deployData});
  log("\n  Contract Deployment Data saved to file: ");
  log("   ", filename);

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
