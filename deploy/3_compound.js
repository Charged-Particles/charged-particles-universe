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
      const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);
      const comptroller = presets.Compound.comptroller[chainId];
      const lens = presets.Compound.lens[chainId];
  
  
      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles LP: Compound - Contract Deployment');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  
      log('  Using Network: ', chainNameById(chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', protocolOwner);
      log(' ');
  
      await log('\n  Deploying CompoundWalletManager...')(alchemyTimeout);
      const CompoundWalletManager = await hre.ethers.getContractFactory('CompoundWalletManager');
      const CompoundWalletManagerInstance = await CompoundWalletManager.deploy();
      const compoundWalletManager = await CompoundWalletManagerInstance.deployed();
      deployData['CompoundWalletManager'] = {
        abi: getContractAbi('CompoundWalletManager'),
        address: compoundWalletManager.address,
        deployTransaction: compoundWalletManager.deployTransaction,
      }
  
      await log('\n  Deploying CompoundBridge with Comptroller: ', comptroller, ' and Lens: ', lens)(alchemyTimeout);
      const CompoundBridge = await ethers.getContractFactory('CompoundBridge');
      const CompoundBridgeInstance = await CompoundBridge.deploy(comptroller, lens);
      const compoundBridge = await CompoundBridgeInstance.deployed();
      deployData['CompoundBridge'] = {
        abi: getContractAbi('CompoundBridge'),
        address: compoundBridge.address,
        comptroller: comptroller,
        lens: lens,
        deployTransaction: compoundBridge.deployTransaction,
      }
  
      // Display Contract Addresses
      await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
      log('  - CompoundWalletManager:  ', compoundWalletManager.address);
      log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: compoundWalletManager.deployTransaction }));
      log('  - CompoundBridgeV2:       ', compoundBridge.address);
      log('     - Gas Cost:        ', getTxGasCost({deployTransaction: compoundBridge.deployTransaction}));
  
      saveDeploymentData(chainId, deployData);
      log('\n  Contract Deployment Data saved to "deployments" directory.');
  
      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  };
  
  module.exports.tags = ['compound']