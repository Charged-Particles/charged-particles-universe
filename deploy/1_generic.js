const {
  getDeployData,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

module.exports = async (hre) => {
    const { getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 1);
    const deployData = {};

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Generic - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    await log('\n  Deploying GenericWalletManager...')(alchemyTimeout);
    const GenericWalletManager = await hre.ethers.getContractFactory('GenericWalletManager');
    const GenericWalletManagerInstance = await GenericWalletManager.deploy();
    const genericWalletManager = await GenericWalletManagerInstance.deployed();
    deployData['GenericWalletManager'] = {
      abi: getContractAbi('GenericWalletManager'),
      address: genericWalletManager.address,
      deployTransaction: genericWalletManager.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - GenericWalletManager:  ', genericWalletManager.address);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericWalletManager.deployTransaction }));

    await log('  Deploying GenericBasketManager...')(alchemyTimeout);
    const GenericBasketManager = await hre.ethers.getContractFactory('GenericBasketManager');
    const GenericBasketManagerInstance = await GenericBasketManager.deploy();
    const genericBasketManager = await GenericBasketManagerInstance.deployed();
    deployData['GenericBasketManager'] = {
      abi: getContractAbi('GenericBasketManager'),
      address: genericBasketManager.address,
      deployTransaction: genericBasketManager.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - GenericBasketManager:  ', genericBasketManager.address);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericBasketManager.deployTransaction }));


    log('\n  Contract Deployment Data saved to "deployments" directory.');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['generic']
