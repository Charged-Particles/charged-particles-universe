
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

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  log("Charged Particles LP: Aave - Contract Initialization");
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");

  log("  Using Network: ", chainName(network.chainId));
  log("  Using Accounts:");
  log("  - Deployer:    ", deployer);
  log("  - Owner:       ", owner);
  log(" ");

  log("  Loading ChargedParticles from: ", deployData['ChargedParticles'].address);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticles = await ChargedParticles.attach(deployData['ChargedParticles'].address);

  log("\n  Deploying AaveWalletManager...");
  const lastKnownAddress = _.get(deployData, 'AaveWalletManager.address', '');
  const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
  const AaveWalletManagerInstance = await AaveWalletManager.deploy();
  const aaveWalletManager = await AaveWalletManagerInstance.deployed();
  if (lastKnownAddress === aaveWalletManager.address) {
    log("\n  No Changes! Contracts Already Deployed at:");
    log("  - AaveWalletManager:  ", aaveWalletManager.address);
    return;
  }

  const lendingPoolProvider = presets.Aave.lendingPoolProvider[network.chainId];
  deployData['AaveWalletManager'] = {
    abi: getContractAbi('AaveWalletManager'),
    address: aaveWalletManager.address,
    lendingPoolProvider,
    deployTransaction: aaveWalletManager.deployTransaction,
  }

  log("  - Setting Lending Pool Provider...");
  await aaveWalletManager.setLendingPoolProvider(lendingPoolProvider);

  if (presets.Aave.referralCode.length > 0) {
    log("  - Setting Referral Code...");
    await aaveWalletManager.setReferralCode(presets.Aave.referralCode);
  }

  log("  - Registering LP with ChargedParticles...");
  await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);

  // log(`  Transferring Contract Ownership to "${owner}"...`);
  // await aaveWalletManager.transferOwnership(owner);


  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n\n  Contracts:");
  log("  - AaveWalletManager:  ", aaveWalletManager.address);
  log("     - Gas Cost:        ", getTxGasCost({deployTransaction: aaveWalletManager.deployTransaction}));

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
