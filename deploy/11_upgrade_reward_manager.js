const {
    saveDeploymentData,
    getTxGasCost,
  } = require('../js-helpers/deploy');
  
  const {
    accumulatedGasCost,
  } = require('../js-helpers/executeTx');
  
  const {
    log,
    chainTypeById,
    chainIdByName,
  } = require('../js-helpers/utils');
  
  
  module.exports = async (hre) => {
    const { ethers, upgrades, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {};
  
    const chainId = chainIdByName(network.name);
    const { isProd, isHardhat } = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 5);
  
    await log('  Deploying RewardWalletManager...')(alchemyTimeout);
    const RewardWalletManager = await hre.ethers.getContractFactory('RewardWalletManager');

    const RewardWalletManagerInstance = await RewardWalletManager.deploy();

    const rewardWalletManager = await RewardWalletManagerInstance.deployed();
    deployData['RewardWalletManager'] = {
        contract: "contracts/yield/ionx/RewardWalletManager.sol:RewardWalletManager",
        address: rewardWalletManager.address,
        deployTransaction: rewardWalletManager.deployTransaction,
    }
    saveDeploymentData(chainId, deployData, true);

    log('  - RewardWalletManager: ', rewardWalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: rewardWalletManager.deployTransaction }));
    accumulatedGasCost(rewardWalletManager.deployTransaction);
  };

  module.exports.tags = ['RewardWalletManager']
  