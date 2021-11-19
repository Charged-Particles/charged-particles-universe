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
  const {isProd, isHardhat} = chainTypeById(chainId);
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

  await log('\n  Deploying WBoson...')(alchemyTimeout);
  const WBoson = await ethers.getContractFactory('WBoson');
  const WBosonInstance = await WBoson.deploy();
  const wBoson = await WBosonInstance.deployed();
  deployData['WBoson'] = {
    abi: getContractAbi('WBoson'),
    address: wBoson.address,
    deployTransaction: wBoson.deployTransaction,
  }

  await log('\n  Deploying Proton NFT...')(alchemyTimeout);
  const Proton = await ethers.getContractFactory('Proton');
  const ProtonInstance = await Proton.deploy();
  const proton = await ProtonInstance.deployed();
  deployData['Proton'] = {
    abi: getContractAbi('Proton'),
    address: proton.address,
    deployTransaction: proton.deployTransaction,
  }

  let LeptonInstance, Lepton, lepton;
  if (isHardhat) {
    await log('\n  Deploying Lepton NFT...')(alchemyTimeout);
    Lepton = await ethers.getContractFactory('Lepton');
    LeptonInstance = await Lepton.deploy();
    lepton = await LeptonInstance.deployed();
    deployData['Lepton'] = {
      abi: getContractAbi('Lepton'),
      address: lepton.address,
      deployTransaction: lepton.deployTransaction,
    }
  }

  await log('\n  Deploying Lepton2 NFT...')(alchemyTimeout);
  const Lepton2 = await ethers.getContractFactory('Lepton2');
  const Lepton2Instance = await Lepton2.deploy();
  const lepton2 = await Lepton2Instance.deployed();
  deployData['Lepton2'] = {
    abi: getContractAbi('Lepton2'),
    address: lepton2.address,
    deployTransaction: lepton2.deployTransaction,
  }

  await log('\n  Deploying Ionx FT...')(alchemyTimeout);
  const Ionx = await ethers.getContractFactory('Ionx');
  const IonxInstance = await Ionx.deploy();
  const ionx = await IonxInstance.deployed();
  deployData['Ionx'] = {
    abi: getContractAbi('Ionx'),
    address: ionx.address,
    deployTransaction: ionx.deployTransaction,
  }

  await log('\n  Deploying ExternalNFT...')(alchemyTimeout);
  const ExternalNFT = await ethers.getContractFactory('ExternalNFT');
  const ExternalNFTInstance = await ExternalNFT.deploy();
  const externalNFT = await ExternalNFTInstance.deployed();
  deployData['ExternalNFT'] = {
    abi: getContractAbi('ExternalNFT'),
    address: externalNFT.address,
    deployTransaction: externalNFT.deployTransaction,
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - WBoson:      ', wBoson.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: wBoson.deployTransaction }));
  log('  - Proton:      ', proton.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));
  if (isHardhat) {
    log('  - Lepton:      ', lepton.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton.deployTransaction }));
  }
  log('  - Lepton2:      ', lepton2.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton2.deployTransaction }));
  log('  - Ionx:        ', ionx.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ionx.deployTransaction }));
  log('  - ExternalNFT:      ', externalNFT.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: externalNFT.deployTransaction }));

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['tokens']