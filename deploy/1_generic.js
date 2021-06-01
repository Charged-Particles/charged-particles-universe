const {
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

module.exports = async (hre) => {
    const { getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);
    const deployData = {};

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Generic - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
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

    await log('  Deploying GenericBasketManager...')(alchemyTimeout);
    const GenericBasketManager = await hre.ethers.getContractFactory('GenericBasketManager');
    const GenericBasketManagerInstance = await GenericBasketManager.deploy();
    const genericBasketManager = await GenericBasketManagerInstance.deployed();
    deployData['GenericBasketManager'] = {
      abi: getContractAbi('GenericBasketManager'),
      address: genericBasketManager.address,
      deployTransaction: genericBasketManager.deployTransaction,
    }

    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - GenericWalletManager:  ', genericWalletManager.address);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericWalletManager.deployTransaction }));
    log('  - GenericBasketManager:  ', genericBasketManager.address);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericBasketManager.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployments" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['generic']