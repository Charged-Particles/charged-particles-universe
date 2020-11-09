
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

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  log("Charged Particles NFT: Proton - Contract Initialization");
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");

  log("  Using Network: ", chainName(network.chainId));
  log("  Using Accounts:");
  log("  - Deployer:    ", deployer);
  log("  - Owner:       ", owner);
  log(" ");

  log("  Loading ChargedParticles from: ", deployData['ChargedParticles'].address);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticles = await ChargedParticles.attach(deployData['ChargedParticles'].address);

  log("\n  Deploying Proton NFT...");
  const lastKnownAddress = _.get(deployData, 'Proton.address', '');
  const Proton = await ethers.getContractFactory('Proton');
  const ProtonInstance = await Proton.deploy();
  const proton = await ProtonInstance.deployed();
  if (lastKnownAddress === proton.address) {
    log("\n  No Changes! Contracts Already Deployed at:");
    log("  - Proton:  ", proton.address);
    return;
  }

  deployData['Proton'] = {
    abi: getContractAbi('Proton'),
    address: proton.address,
    deployTransaction: proton.deployTransaction,
  }

  log("  - Registering ChargedParticles with Proton...");
  await proton.setChargedParticles(deployData['ChargedParticles'].address);

  log("  - Registering Proton with ChargedParticles...");
  await chargedParticles.updateWhitelist(proton.address, true);

  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n\n  Contracts:");
  log("  - Proton:      ", proton.address);
  log("     - Gas Cost: ", getTxGasCost({deployTransaction: proton.deployTransaction}));

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
