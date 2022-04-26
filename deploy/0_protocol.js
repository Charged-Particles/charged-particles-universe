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
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 5 : 3);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log(`  Using Network: ${chainNameById(chainId)} (${network.name}:${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    //
    // Upgradeable Contracts
    //

    log('  Deploying Universe...');
    const Universe = await ethers.getContractFactory('Universe');
    const UniverseInstance = await upgrades.deployProxy(Universe, []);
    const universe = await UniverseInstance.deployed();
    deployData['Universe'] = {
      abi: getContractAbi('Universe'),
      address: universe.address,
      deployTransaction: universe.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - Universe:         ', universe.address);
    log('     - Block:         ', universe.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));

    await log('  Deploying ChargedState...')(alchemyTimeout);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const ChargedStateInstance = await upgrades.deployProxy(ChargedState, [deployer]);
    const chargedState = await ChargedStateInstance.deployed();
    deployData['ChargedState'] = {
      abi: getContractAbi('ChargedState'),
      address: chargedState.address,
      deployTransaction: chargedState.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - ChargedState:     ', chargedState.address);
    log('     - Block:         ', chargedState.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedState.deployTransaction }));

    await log('  Deploying ChargedSettings...')(alchemyTimeout);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const ChargedSettingsInstance = await upgrades.deployProxy(ChargedSettings, [deployer]);
    const chargedSettings = await ChargedSettingsInstance.deployed();
    deployData['ChargedSettings'] = {
      abi: getContractAbi('ChargedSettings'),
      address: chargedSettings.address,
      deployTransaction: chargedSettings.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - ChargedSettings:  ', chargedSettings.address);
    log('     - Block:         ', chargedSettings.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedSettings.deployTransaction }));

    await log('  Deploying ChargedManagers...')(alchemyTimeout);
    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    const ChargedManagersInstance = await upgrades.deployProxy(ChargedManagers, [deployer]);
    const chargedManagers = await ChargedManagersInstance.deployed();
    deployData['ChargedManagers'] = {
      abi: getContractAbi('ChargedManagers'),
      address: chargedManagers.address,
      deployTransaction: chargedManagers.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - ChargedManagers:  ', chargedManagers.address);
    log('     - Block:         ', chargedManagers.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedManagers.deployTransaction }));


    await log('  Deploying ChargedParticles...')(alchemyTimeout);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [deployer], { unsafeAllowCustomTypes: true });
    const chargedParticles = await ChargedParticlesInstance.deployed();
    deployData['ChargedParticles'] = {
      abi: getContractAbi('ChargedParticles'),
      address: chargedParticles.address,
      deployTransaction: chargedParticles.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Block:         ', chargedParticles.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));

    //
    // Non-upgradeable Contracts
    //

    await log('  Deploying TokenInfoProxy...')(alchemyTimeout);
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
    const TokenInfoProxyInstance = await TokenInfoProxy.deploy();
    const tokenInfoProxy = await TokenInfoProxyInstance.deployed();
    deployData['TokenInfoProxy'] = {
      abi: getContractAbi('TokenInfoProxy'),
      address: tokenInfoProxy.address,
      deployTransaction: tokenInfoProxy.deployTransaction
    }
    saveDeploymentData(chainId, deployData);
    log('  - TokenInfoProxy: ', tokenInfoProxy.address);
    log('     - Block:         ', tokenInfoProxy.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: tokenInfoProxy.deployTransaction }));


    await log('  Deploying ParticleSplitter...')(alchemyTimeout);
    const ParticleSplitter = await ethers.getContractFactory('ParticleSplitter');
    const ParticleSplitterInstance = await ParticleSplitter.deploy();
    const particleSplitter = await ParticleSplitterInstance.deployed();
    deployData['ParticleSplitter'] = {
      abi: getContractAbi('ParticleSplitter'),
      address: particleSplitter.address,
      deployTransaction: particleSplitter.deployTransaction
    }
    saveDeploymentData(chainId, deployData);
    log('  - ParticleSplitter: ', particleSplitter.address);
    log('     - Block:         ', particleSplitter.deployTransaction.blockNumber);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: particleSplitter.deployTransaction }));


    log('\n  Contract Deployment Data saved to "deployments" directory.');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['protocol']
