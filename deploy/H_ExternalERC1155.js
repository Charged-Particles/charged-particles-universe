const {
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
} = require('../js-helpers/deploy');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre;
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};

  const chainId = chainIdByName(network.name);
  const { isProd, isHardhat } = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 3 : 2);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Tokens - Contract Deployment');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log('  - Trusted Forwarder: ', trustedForwarder);
  log(' ');

  await log('\n  Deploying ExternalERC1155 NFT...')(alchemyTimeout);
  const ExternalERC1155 = await ethers.getContractFactory('ExternalERC1155');
  const External1155Instance = await ExternalERC1155.deploy();
  const externalERC1155 = await External1155Instance.deployed();
  deployData['ExternalERC1155'] = {
    abi: getContractAbi('ExternalERC1155'),
    address: externalERC1155.address,
    deployTransaction: externalERC1155.deployTransaction,
  };

  // Display Address
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - ExternalERC1155:      ', externalERC1155.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: externalERC1155.deployTransaction }));

  // save deployment data
  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['ExternalERC1155'];