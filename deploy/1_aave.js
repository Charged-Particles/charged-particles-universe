const { chainName, getContractAbi, getDeployData, getTxGasCost, presets, saveDeploymentData } = require("../js-utils/deploy-helpers");
const { sleep } = require("sleep");

module.exports = async (hre) => {

    let alchemyTimeout = 1;

    const { deployer, protocolOwner, trustedForwarder } = await hre.getNamedAccounts();
    const network = await hre.network;

    const log = console.log;

    const ddChargedParticles = getDeployData('ChargedParticles', network.config.chainId);
    const deployData = {};

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Aave - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainName(network.config.chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    sleep(alchemyTimeout);

    log('\n  Deploying AaveWalletManager...');
    const AaveWalletManager = await hre.ethers.getContractFactory('AaveWalletManager');
    const AaveWalletManagerInstance = await AaveWalletManager.deploy();
    const aaveWalletManager = await AaveWalletManagerInstance.deployed();

    sleep(alchemyTimeout);

    const lendingPoolProvider = presets.Aave.lendingPoolProvider[network.config.chainId];

    log('  - Setting Charged Particles as Controller...');
    await aaveWalletManager.setController(ddChargedParticles.address);

    sleep(alchemyTimeout);

    log('  - Setting Lending Pool Provider...');
    await aaveWalletManager.setLendingPoolProvider(lendingPoolProvider);

    sleep(alchemyTimeout);

    if (presets.Aave.referralCode.length > 0) {
      log('  - Setting Referral Code...');
      await aaveWalletManager.setReferralCode(presets.Aave.referralCode);
    }

    sleep(alchemyTimeout);

    log('  - Registering LP with ChargedParticles...');
    await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);

    sleep(alchemyTimeout);

    // log(`  Transferring Contract Ownership to '${owner}'...`);
    // await aaveWalletManager.transferOwnership(owner);


    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:');
    log('  - AaveWalletManager:  ', aaveWalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManager.deployTransaction }));

    saveDeploymentData(network.config.chainId, {'AaveWalletManager': {
      abi: getContractAbi('AaveWalletManager'),
      address: aaveWalletManager.address,
      lendingPoolProvider,
      deployTransaction: aaveWalletManager.deployTransaction,
    }});

    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['aave']