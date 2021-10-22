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

    log('  Deploying Universe...');
    const Universe = await ethers.getContractFactory('Universe');
    const UniverseInstance = await upgrades.deployProxy(Universe, []);
    const universe = await UniverseInstance.deployed();
    deployData['Universe'] = {
      abi: getContractAbi('Universe'),
      address: universe.address,
      deployTransaction: universe.deployTransaction,
    }
    log('  - Universe:         ', universe.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    await log('  Deploying ChargedState...')(alchemyTimeout);
    const ChargedState = await hre.ethers.getContractFactory('ChargedState');
    const ChargedStateInstance = await ChargedState.deploy();
    const chargedState = await ChargedStateInstance.deployed();
    deployData['ChargedState'] = {
      abi: getContractAbi('ChargedState'),
      address: chargedState.address,
      deployTransaction: chargedState.deployTransaction,
    }
    log('  - ChargedState:     ', chargedState.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedState.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    await log('  Deploying ChargedSettings...')(alchemyTimeout);
    const ChargedSettings = await hre.ethers.getContractFactory('ChargedSettings');
    const ChargedSettingsInstance = await ChargedSettings.deploy();
    const chargedSettings = await ChargedSettingsInstance.deployed();
    deployData['ChargedSettings'] = {
      abi: getContractAbi('ChargedSettings'),
      address: chargedSettings.address,
      deployTransaction: chargedSettings.deployTransaction,
    }
    log('  - ChargedSettings:  ', chargedSettings.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedSettings.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    await log('  Deploying TokenInfoProxy...')(alchemyTimeout);
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
    const TokenInfoProxyInstance = await TokenInfoProxy.deploy();
    const tokenInfoProxy = await TokenInfoProxyInstance.deployed();
    deployData['TokenInfoProxy'] = {
      abi: getContractAbi('TokenInfoProxy'),
      address: tokenInfoProxy.address,
      deployTransaction: tokenInfoProxy.deployTransaction
    }
    log('  - TokenInfoProxy: ', tokenInfoProxy.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: tokenInfoProxy.deployTransaction }));
    saveDeploymentData(chainId, deployData);


    await log('  Deploying ChargedParticles...')(alchemyTimeout);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [trustedForwarder, tokenInfoProxy.address], { unsafeAllowCustomTypes: true });
    const chargedParticles = await ChargedParticlesInstance.deployed();
    deployData['ChargedParticles'] = {
      abi: getContractAbi('ChargedParticles'),
      address: chargedParticles.address,
      deployTransaction: chargedParticles.deployTransaction,
    }
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    log('\n  Contract Deployment Data saved to "deployments" directory.');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['protocol']
