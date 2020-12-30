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
    const alchemyTimeout = 1;
    const deployData = {};

    const chainId = chainIdByName(network.name);

    const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[chainId];
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];


    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Aave - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('\n  Deploying AaveWalletManager...')(alchemyTimeout);
    const AaveWalletManager = await hre.ethers.getContractFactory('AaveWalletManager');
    const AaveWalletManagerInstance = await AaveWalletManager.deploy();
    const aaveWalletManager = await AaveWalletManagerInstance.deployed();
    deployData['AaveWalletManager'] = {
      abi: getContractAbi('AaveWalletManager'),
      address: aaveWalletManager.address,
      deployTransaction: aaveWalletManager.deployTransaction,
    }

    let AaveBridgeV1;
    let AaveBridgeV1Instance;
    let aaveBridgeV1;
    if (lendingPoolProviderV1.length > 0) {
      log('\n  Deploying AaveBridgeV1...')(alchemyTimeout);
      AaveBridgeV1 = await ethers.getContractFactory('AaveBridgeV1');
      AaveBridgeV1Instance = await AaveBridgeV1.deploy(lendingPoolProviderV1);
      aaveBridgeV1 = await AaveBridgeV1Instance.deployed();
      deployData['AaveBridgeV1'] = {
        abi: getContractAbi('AaveBridgeV1'),
        address: aaveBridgeV1.address,
        lendingPoolProvider: lendingPoolProviderV1,
        deployTransaction: aaveBridgeV1.deployTransaction,
      }
    } else {
      deployData['AaveBridgeV1'] = {
        abi: [],
        address: 0x0,
        lendingPoolProvider: 0x0,
        deployTransaction: {},
      }
    }

    let AaveBridgeV2;
    let AaveBridgeV2Instance;
    let aaveBridgeV2;
    if (lendingPoolProviderV2.length > 0) {
      log('\n  Deploying AaveBridgeV2...')(alchemyTimeout);
      AaveBridgeV2 = await ethers.getContractFactory('AaveBridgeV2');
      AaveBridgeV2Instance = await AaveBridgeV2.deploy(lendingPoolProviderV2);
      aaveBridgeV2 = await AaveBridgeV2Instance.deployed();
      deployData['AaveBridgeV2'] = {
        abi: getContractAbi('AaveBridgeV2'),
        address: aaveBridgeV2.address,
        lendingPoolProvider: lendingPoolProviderV2,
        deployTransaction: aaveBridgeV2.deployTransaction,
      }
    } else {
      deployData['AaveBridgeV2'] = {
        abi: [],
        address: 0x0,
        lendingPoolProvider: 0x0,
        deployTransaction: {},
      }
    }

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - AaveWalletManager:  ', aaveWalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManager.deployTransaction }));
    if (lendingPoolProviderV1.length > 0) {
      log('  - AaveBridgeV1:       ', aaveBridgeV1.address);
      log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveBridgeV1.deployTransaction}));
    }
    if (lendingPoolProviderV2.length > 0) {
      log('  - AaveBridgeV2:       ', aaveBridgeV2.address);
      log('     - Gas Cost:        ', getTxGasCost({deployTransaction: aaveBridgeV2.deployTransaction}));
    }

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['aave']