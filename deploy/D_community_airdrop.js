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
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const util = require('util');
const _ = require('lodash');


module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
  const network = await hre.network;

  const deployData = {};

  const chainId = chainIdByName(network.name);
  const {isProd, isHardhat} = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);
  const incentives = presets.Incentives[chainId];

  const daoSigner = ethers.provider.getSigner(protocolOwner);

  const ddIonx = getDeployData('Ionx', chainId);

  const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor');

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

  await log(`\n  Deploying MerkleDistributor...`)(alchemyTimeout);
  const MerkleDistributorInstance = await MerkleDistributor.deploy(ddIonx.address, incentives.airdrop.merkleRoot);
  const merkleDistributor = await MerkleDistributorInstance.deployed();
  deployData['MerkleDistributor'] = {
    abi: getContractAbi('MerkleDistributor'),
    address: merkleDistributor.address,
    constructorArgs: [ddIonx.address, incentives.airdrop.merkleRoot],
    deployTransaction: merkleDistributor.deployTransaction,
  };

  // Next transfer appropriate funds (Testnet only; Mainnet requires IONX DAO)
  if (chainId != 1) {
    log('\n   Distributing Airdrop funds to MerkleDistributor...');
    await distributeInitialFunds(
      ionx.connect(daoSigner),
      merkleDistributor,
      incentives.airdrop.totalIonx,
      protocolOwner,
    );
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - MerkleDistributor: ', merkleDistributor.address);
  log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: merkleDistributor.deployTransaction }));

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['airdrop'];
