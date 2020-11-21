const { chainName, getContractAbi, getDeployData, getTxGasCost, presets, saveDeploymentData } = require("../js-utils/deploy-helpers");
const _ = require('lodash');
const { sleep } = require("sleep");

module.exports = async (hre) => {

    let alchemyTimeout = 1;

    const { deployer, protocolOwner, trustedForwarder } = await hre.getNamedAccounts();
    const network = await hre.network;
    const log = console.log;

    const ddUniverse = getDeployData('Universe', network.config.chainId);
    const deployData = {};

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles FT: Ion - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainName(network.config.chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Universe from: ', ddUniverse.address);
    const Universe = await hre.ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    sleep(alchemyTimeout);

    log('\n  Deploying Ion FT...');
    const Ion = await hre.ethers.getContractFactory('Ion');
    const IonInstance = await Ion.deploy();
    const ion = await IonInstance.deployed();

    sleep(alchemyTimeout);

    log('  - Registering Universe with Ion...');
    await ion.setUniverse(ddUniverse.address);

    log('  - Registering Ion with Universe...');
    await universe.setIonToken(ion.address);

    let assetTokenId;
    let assetTokenAddress;
    let assetTokenMultiplier;
    for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
        assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = _.get(presets, assetTokenId, {})[network.config.chainId];
        assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

        log('  - Setting Rewards Multiplier for Asset Token: ', assetTokenAddress, ' to: ', assetTokenMultiplier);
        await universe.setIonRewardsMultiplier(assetTokenAddress, assetTokenMultiplier);

        sleep(alchemyTimeout);
    }

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:');
    log('  - Ion:         ', ion.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ion.deployTransaction }));

    saveDeploymentData(network.config.chainId, {'Ion': {
        abi: getContractAbi('Ion'),
        address: ion.address,
        deployTransaction: ion.deployTransaction,
    }})

    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}