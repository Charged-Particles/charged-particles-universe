
const { ethers, getNamedAccounts } = require('@nomiclabs/buidler');
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

  const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[network.chainId];
  const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[network.chainId];
  const referralCode = presets.Aave.referralCode[network.chainId];

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
  deployData['AaveWalletManager'] = {
    abi: getContractAbi('AaveWalletManager'),
    address: aaveWalletManager.address,
    deployTransaction: aaveWalletManager.deployTransaction,
  }

  let AaveBridgeV1;
  let AaveBridgeV1Instance;
  let aaveBridgeV1;
  if (lendingPoolProviderV1.length > 0) {
    log('\n  Deploying AaveBridgeV1...');
    AaveBridgeV1 = await ethers.getContractFactory('AaveBridgeV1');
    AaveBridgeV1Instance = await AaveBridgeV1.deploy(lendingPoolProviderV1);
    aaveBridgeV1 = await AaveBridgeV1Instance.deployed();
    deployData['AaveBridgeV1'] = {
      abi: getContractAbi('AaveBridgeV1'),
      address: aaveBridgeV1.address,
      lendingPoolProvider: lendingPoolProviderV1,
      deployTransaction: aaveBridgeV1.deployTransaction,
    }
  }

  let AaveBridgeV2;
  let AaveBridgeV2Instance;
  let aaveBridgeV2;
  if (lendingPoolProviderV2.length > 0) {
    log('\n  Deploying AaveBridgeV2...');
    AaveBridgeV2 = await ethers.getContractFactory('AaveBridgeV2');
    AaveBridgeV2Instance = await AaveBridgeV2.deploy(lendingPoolProviderV2);
    aaveBridgeV2 = await AaveBridgeV2Instance.deployed();
    deployData['AaveBridgeV2'] = {
      abi: getContractAbi('AaveBridgeV2'),
      address: aaveBridgeV2.address,
      lendingPoolProvider: lendingPoolProviderV2,
      deployTransaction: aaveBridgeV2.deployTransaction,
    }
  }

  log('\n  - Setting Charged Particles as Controller...');
  await aaveWalletManager.setController(ddChargedParticles.address);

  if (lendingPoolProviderV1.length > 0) {
    log('  - Setting Aave Bridge to V1...');
    await aaveWalletManager.setAaveBridge(aaveBridgeV1.address);
  } else {
    if (lendingPoolProviderV2.length > 0) {
      log('  - Setting Aave Bridge to V2...');
      await aaveWalletManager.setAaveBridge(aaveBridgeV2.address);
    } else {
      log('  - NO Aave Bridge Available!!!');
    }
  }

  if (referralCode.length > 0) {
    log('  - Setting Referral Code...');
    await aaveWalletManager.setReferralCode(referralCode);
  }

  log('  - Registering Wallet Manager with ChargedParticles...');
  await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);

  // log(`  Transferring Contract Ownership to '${owner}'...`);
  // await aaveWalletManager.transferOwnership(owner);


  // Display Contract Addresses
  log('\n  Contract Deployments Complete!\n\n  Contracts:');
  log('  - AaveWalletManager:  ', aaveWalletManager.address);
  log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveWalletManager.deployTransaction}));
  if (lendingPoolProviderV1.length > 0) {
    log('  - AaveBridgeV1:       ', aaveBridgeV1.address);
    log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveBridgeV1.deployTransaction}));
  }
  if (lendingPoolProviderV2.length > 0) {
    log('  - AaveBridgeV2:       ', aaveBridgeV2.address);
    log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveBridgeV2.deployTransaction}));
  }

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
