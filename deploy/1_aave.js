const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
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

    const ddChargedParticles = getDeployData('ChargedParticles', chainId);

    const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[chainId];
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];
    const referralCode = presets.Aave.referralCode[chainId];


    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Aave - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

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
    }

    log('  - Setting Charged Particles as Controller...')(alchemyTimeout);
    await aaveWalletManager.setController(ddChargedParticles.address);

    if (lendingPoolProviderV2.length > 0) {
      log('  - Setting Aave Bridge to V2...')(alchemyTimeout);
      await aaveWalletManager.setAaveBridge(aaveBridgeV2.address);
    } else {
      if (lendingPoolProviderV1.length > 0) {
        log('  - Setting Aave Bridge to V1...')(alchemyTimeout);
        await aaveWalletManager.setAaveBridge(aaveBridgeV1.address);
      } else {
        log('  - NO Aave Bridge Available!!!');
      }
    }

    if (referralCode.length > 0) {
      log('  - Setting Referral Code...')(alchemyTimeout);
      await aaveWalletManager.setReferralCode(referralCode);
    }

    log('  - Registering LP with ChargedParticles...')(alchemyTimeout);
    await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);

    // log(`  Transferring Contract Ownership to '${owner}'...`)(alchemyTimeout);
    // await aaveWalletManager.transferOwnership(owner);

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