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

  let photon;

  if (chainId !== 1) { // Delayed on Mainnet
    await log('\n  Deploying Photon FT...')(alchemyTimeout);
    const Photon = await ethers.getContractFactory('Photon');
    const PhotonInstance = await Photon.deploy();
    photon = await PhotonInstance.deployed();
    deployData['Photon'] = {
      abi: getContractAbi('Photon'),
      address: photon.address,
      deployTransaction: photon.deployTransaction,
    }
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - WBoson:      ', wBoson.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: wBoson.deployTransaction }));
  log('  - Proton:      ', proton.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));
  log('  - Lepton:      ', lepton.address);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton.deployTransaction }));

  if (chainId !== 1) { // Delayed on Mainnet
    log('  - Photon:         ', photon.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: photon.deployTransaction }));
  }

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['tokens']