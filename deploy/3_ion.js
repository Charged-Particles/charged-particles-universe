const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  log,
} = require("../js-utils/deploy-helpers");
const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 2;
    const deployData = {};

    const chainId = chainIdByName(network.name);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles FT: Ion - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('\n  Deploying Ion FT...')(alchemyTimeout);
    const Ion = await ethers.getContractFactory('Ion');
    const IonInstance = await Ion.deploy();
    const ion = await IonInstance.deployed();
    deployData['Ion'] = {
      abi: getContractAbi('Ion'),
      address: ion.address,
      deployTransaction: ion.deployTransaction,
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