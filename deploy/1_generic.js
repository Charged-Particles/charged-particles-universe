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
    const { getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 1;
    const deployData = {};

    const chainId = chainIdByName(network.name);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles LP: Generic - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('\n  Deploying GenericERC20WalletManager...')(alchemyTimeout);
    const GenericERC20WalletManager = await hre.ethers.getContractFactory('GenericERC20WalletManager');
    const GenericERC20WalletManagerInstance = await GenericERC20WalletManager.deploy();
    const genericERC20WalletManager = await GenericERC20WalletManagerInstance.deployed();
    deployData['GenericERC20WalletManager'] = {
      abi: getContractAbi('GenericERC20WalletManager'),
      address: genericERC20WalletManager.address,
      deployTransaction: genericERC20WalletManager.deployTransaction,
    }

    log('\n  Deploying GenericERC721WalletManager...')(alchemyTimeout);
    const GenericERC721WalletManager = await hre.ethers.getContractFactory('GenericERC721WalletManager');
    const GenericERC721WalletManagerInstance = await GenericERC721WalletManager.deploy();
    const genericERC721WalletManager = await GenericERC721WalletManagerInstance.deployed();
    deployData['GenericERC721WalletManager'] = {
      abi: getContractAbi('GenericERC721WalletManager'),
      address: genericERC721WalletManager.address,
      deployTransaction: genericERC721WalletManager.deployTransaction,
    }

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - GenericERC20WalletManager:  ', genericERC20WalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: genericERC20WalletManager.deployTransaction }));
    log('  - GenericERC721WalletManager:  ', genericERC721WalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: genericERC721WalletManager.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['generic']