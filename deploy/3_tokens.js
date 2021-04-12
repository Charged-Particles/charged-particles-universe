const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  log
} = require('../js-helpers/deploy');

const _ = require('lodash');

module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre;
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};

  const chainId = chainIdByName(network.name);
  const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 3 : 2);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Tokens - Contract Deployment');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(chainId));
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

  await log('\n  Deploying Lepton NFT...')(alchemyTimeout);
  const Lepton = await ethers.getContractFactory('Lepton');
  const LeptonInstance = await Lepton.deploy();
  const lepton = await LeptonInstance.deployed();
  deployData['Lepton'] = {
    abi: getContractAbi('Lepton'),
    address: lepton.address,
    deployTransaction: lepton.deployTransaction,
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

  await log('\n  Deploying Ion FT...')(alchemyTimeout);
  const Ion = await ethers.getContractFactory('Ion');
  const IonInstance = await Ion.deploy();
  const ion = await IonInstance.deployed();
  deployData['Ion'] = {
    abi: getContractAbi('Ion'),
    address: ion.address,
    deployTransaction: ion.deployTransaction,
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - WBoson:      ', wBoson.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: wBoson.deployTransaction }));
  log('  - Proton:      ', proton.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));
  log('  - Lepton:      ', lepton.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton.deployTransaction }));
  log('  - Lepton2:      ', lepton2.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton2.deployTransaction }));
  log('  - Ion:         ', ion.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ion.deployTransaction }));

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployed" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['tokens']