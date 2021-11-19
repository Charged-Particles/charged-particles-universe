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

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Upgrades & Migrations');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log(`  Using Network: ${chainNameById(chainId)} (${network.name}:${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log(' ');

    //
    // Deploy New Upgradeable Contracts
    //

    await log('  Deploying New ChargedState...')(alchemyTimeout);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const ChargedStateInstance = await upgrades.deployProxy(ChargedState, []);
    const chargedState = await ChargedStateInstance.deployed();
    deployData['ChargedState'] = {
      abi: getContractAbi('ChargedState'),
      address: chargedState.address,
      deployTransaction: chargedState.deployTransaction,
    }
    log('  - ChargedState:     ', chargedState.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedState.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    await log('  Deploying New ChargedSettings...')(alchemyTimeout);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const ChargedSettingsInstance = await upgrades.deployProxy(ChargedSettings, []);
    const chargedSettings = await ChargedSettingsInstance.deployed();
    deployData['ChargedSettings'] = {
      abi: getContractAbi('ChargedSettings'),
      address: chargedSettings.address,
      deployTransaction: chargedSettings.deployTransaction,
    }
    log('  - ChargedSettings:  ', chargedSettings.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedSettings.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    await log('  Deploying New ChargedManagers...')(alchemyTimeout);
    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    const ChargedManagersInstance = await upgrades.deployProxy(ChargedManagers, []);
    const chargedManagers = await ChargedManagersInstance.deployed();
    deployData['ChargedManagers'] = {
      abi: getContractAbi('ChargedManagers'),
      address: chargedManagers.address,
      deployTransaction: chargedManagers.deployTransaction,
    }
    log('  - ChargedManagers:  ', chargedManagers.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedManagers.deployTransaction }));
    saveDeploymentData(chainId, deployData);

    //
    // Deploy New Non-upgradeable Contracts
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
    log('  - TokenInfoProxy: ', tokenInfoProxy.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: tokenInfoProxy.deployTransaction }));
    saveDeploymentData(chainId, deployData);


    // Deploy New GenericBasketManager

    // Deploy New GenericSmartBasket

    // Deploy New GenericWalletManager

    // Deploy New GenericSmartWallet

    // Deploy New AaveWalletManager

    // Deploy New AaveSmartWallet


    //
    // Upgrade Contracts
    //

    await log('  Upgrading ChargedParticles...')(alchemyTimeout);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [], { unsafeAllowCustomTypes: true });
    const chargedParticles = await ChargedParticlesInstance.deployed();
    deployData['ChargedParticles'] = {
      abi: getContractAbi('ChargedParticles'),
      address: chargedParticles.address,
      deployTransaction: chargedParticles.deployTransaction,
    }
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));
    saveDeploymentData(chainId, deployData);



    //
    // Configure Contracts
    //




    //
    // Migrate Contracts
    //











    log('\n  Contract Deployment Data saved to "deployments" directory.');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['protocol']
