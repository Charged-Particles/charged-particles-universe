const {
  getDeployData,
  getContractAbi,
  getTxGasCost,
  saveDeploymentData,
  distributeInitialFunds,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  bn,
  tokensBN,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const chalk = require('chalk');
const util = require('util');
const _ = require('lodash');


const __VESTING_CLAIM_INDEX = 7;


module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
  const network = await hre.network;

  const deployData = {};

  const chainId = chainIdByName(network.name);
  const {isProd, isHardhat} = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);
  const vesting = presets.Vesting[`month${__VESTING_CLAIM_INDEX}`];

  const daoSigner = ethers.provider.getSigner(protocolOwner);

  const ddIonx = getDeployData('Ionx', chainId);
  const VestingClaim = await ethers.getContractFactory(`VestingClaim${__VESTING_CLAIM_INDEX}`);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Airdrop - Contract Initialization');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(chainId));
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log('  - Trusted Forwarder: ', trustedForwarder);
  log(' ');

  log('  Loading Ionx from: ', ddIonx.address);
  const Ionx = await ethers.getContractFactory('Ionx');
  const ionx = await Ionx.attach(ddIonx.address);

  await log(`\n  Deploying VestingClaim${__VESTING_CLAIM_INDEX} with Expiry: ${new Date(vesting.expiryDate * 1000).toLocaleDateString("en-US")}...`)(alchemyTimeout);
  const VestingClaimInstance = await VestingClaim.deploy(ddIonx.address, vesting.merkleRoot, vesting.expiryDate);
  const vestingClaim = await VestingClaimInstance.deployed();
  deployData[`VestingClaim${__VESTING_CLAIM_INDEX}`] = {
    abi: getContractAbi(`VestingClaim${__VESTING_CLAIM_INDEX}`),
    address: vestingClaim.address,
    constructorArgs: [ddIonx.address, vesting.merkleRoot, vesting.expiryDate],
    deployTransaction: vestingClaim.deployTransaction,
  };

  // Next transfer appropriate funds (Testnet only; Mainnet requires IONX DAO)
  if (chainId != 1) {
    log(`\n   Distributing Vested funds to VestingClaim${__VESTING_CLAIM_INDEX}...`);
    await distributeInitialFunds(
      ionx.connect(daoSigner),
      vestingClaim,
      vesting.totalIonx,
      protocolOwner,
    );
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log(`  - VestingClaim${__VESTING_CLAIM_INDEX}: ${vestingClaim.address}`);
  log('     - Gas Cost:  ', getTxGasCost({ deployTransaction: vestingClaim.deployTransaction }));

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['vesting'];
