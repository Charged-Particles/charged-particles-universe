const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  log,
  presets,
} = require("../js-helpers/deploy");

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {};

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : 1;
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];


    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Aave - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
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

    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - AaveWalletManager:  ', aaveWalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManager.deployTransaction }));
    log('  - AaveBridgeV2:       ', aaveBridgeV2.address);
    log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveBridgeV2.deployTransaction}));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['aave']