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
    log('     - Block:              ', genericWalletManager.deployTransaction.blockNumber);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericWalletManager.deployTransaction }));

    await log('\n  Deploying GenericWalletManagerB...')(alchemyTimeout);
    const GenericWalletManagerB = await hre.ethers.getContractFactory('GenericWalletManagerB');
    const GenericWalletManagerBInstance = await GenericWalletManagerB.deploy();
    const genericWalletManagerB = await GenericWalletManagerBInstance.deployed();
    deployData['GenericWalletManagerB'] = {
      abi: getContractAbi('GenericWalletManagerB'),
      address: genericWalletManagerB.address,
      deployTransaction: genericWalletManagerB.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - GenericWalletManagerB:  ', genericWalletManagerB.address);
    log('     - Block:              ', genericWalletManagerB.deployTransaction.blockNumber);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericWalletManagerB.deployTransaction }));

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
    log('     - Block:              ', genericBasketManager.deployTransaction.blockNumber);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericBasketManager.deployTransaction }));

    await log('  Deploying GenericBasketManagerB...')(alchemyTimeout);
    const GenericBasketManagerB = await hre.ethers.getContractFactory('GenericBasketManagerB');
    const GenericBasketManagerBInstance = await GenericBasketManagerB.deploy();
    const genericBasketManagerB = await GenericBasketManagerBInstance.deployed();
    deployData['GenericBasketManagerB'] = {
      abi: getContractAbi('GenericBasketManagerB'),
      address: genericBasketManagerB.address,
      deployTransaction: genericBasketManagerB.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - GenericBasketManagerB:  ', genericBasketManagerB.address);
    log('     - Block:              ', genericBasketManagerB.deployTransaction.blockNumber);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericBasketManagerB.deployTransaction }));


    log('\n  Contract Deployment Data saved to "deployments" directory.');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['generic']
