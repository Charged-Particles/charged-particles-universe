const {
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
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {};

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 1);
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];


    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Aave - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    await log('\n  Deploying AaveWalletManager...')(alchemyTimeout);
    const AaveWalletManager = await hre.ethers.getContractFactory('AaveWalletManager');
    const AaveWalletManagerInstance = await AaveWalletManager.deploy();
    const aaveWalletManager = await AaveWalletManagerInstance.deployed();
    deployData['AaveWalletManager'] = {
      abi: getContractAbi('AaveWalletManager'),
      address: aaveWalletManager.address,
      deployTransaction: aaveWalletManager.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - AaveWalletManager:  ', aaveWalletManager.address);
    log('     - Block:           ', aaveWalletManager.deployTransaction.blockNumber);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManager.deployTransaction }));

    await log('\n  Deploying AaveWalletManagerB...')(alchemyTimeout);
    const AaveWalletManagerB = await hre.ethers.getContractFactory('AaveWalletManagerB');
    const AaveWalletManagerBInstance = await AaveWalletManagerB.deploy();
    const aaveWalletManagerB = await AaveWalletManagerBInstance.deployed();
    deployData['AaveWalletManagerB'] = {
      abi: getContractAbi('AaveWalletManagerB'),
      address: aaveWalletManagerB.address,
      deployTransaction: aaveWalletManagerB.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - AaveWalletManagerB: ', aaveWalletManagerB.address);
    log('     - Block:           ', aaveWalletManagerB.deployTransaction.blockNumber);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManagerB.deployTransaction }));

    await log('\n  Deploying AaveBridgeV2 with LP Provider: ', lendingPoolProviderV2)(alchemyTimeout);
    const AaveBridgeV2 = await ethers.getContractFactory('AaveBridgeV2');
    const AaveBridgeV2Instance = await AaveBridgeV2.deploy(lendingPoolProviderV2);
    const aaveBridgeV2 = await AaveBridgeV2Instance.deployed();
    deployData['AaveBridgeV2'] = {
      abi: getContractAbi('AaveBridgeV2'),
      address: aaveBridgeV2.address,
      lendingPoolProvider: lendingPoolProviderV2,
      deployTransaction: aaveBridgeV2.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - AaveBridgeV2:       ', aaveBridgeV2.address);
    log('     - Block:           ', aaveBridgeV2.deployTransaction.blockNumber);
    log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveBridgeV2.deployTransaction}));


    log('\n  Contract Deployment Data saved to "deployments" directory.');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['aave']