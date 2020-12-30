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
const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 2;
    const deployData = {};

    const chainId = chainIdByName(network.name);

    const ddUniverse = getDeployData('Universe', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles FT: Ion - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Universe from: ', ddUniverse.address);
    const Universe = await ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    log('\n  Deploying Ion FT...')(alchemyTimeout);
    const Ion = await ethers.getContractFactory('Ion');
    const IonInstance = await Ion.deploy();
    const ion = await IonInstance.deployed();
    deployData['Ion'] = {
      abi: getContractAbi('Ion'),
      address: ion.address,
      deployTransaction: ion.deployTransaction,
    }

    log('  - Registering Universe with Ion...')(alchemyTimeout);
    await ion.setUniverse(ddUniverse.address);

    log('  - Registering Ion with Universe...')(alchemyTimeout);
    await universe.setIonToken(ion.address);

    let assetTokenId;
    let assetTokenAddress;
    let assetTokenMultiplier;
    for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
        assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
        assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

        log('  - Setting Rewards Multiplier for Asset Token: ', assetTokenAddress, ' to: ', assetTokenMultiplier)(alchemyTimeout);
        await universe.setIonRewardsMultiplier(assetTokenAddress, assetTokenMultiplier);
    }

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - Ion:         ', ion.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ion.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['ion']