const {
    saveDeploymentData,
    getContractAbi,
    getTxGasCost,
    getDeployData,
    presets,
  } = require('../js-helpers/deploy');
  
  const {
    accumulatedGasCost,
    getAccumulatedGasCost,
  } = require('../js-helpers/executeTx');
  
  const {
    log,
    chainTypeById,
    chainNameById,
    chainIdByName,
  } = require('../js-helpers/utils');
  
  const configProtocol = require('../js-helpers/configProtocol');
  const { AddressZero } = require('ethers').constants
  const _ = require('lodash');
  
  
  module.exports = async (hre) => {
    const { ethers, upgrades, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {};
  
    const chainId = chainIdByName(network.name);
    const { isProd, isHardhat } = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 5);
  
    // if (chainId === 31337) { return; } // Don't upgrade for Unit-Tests

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

    log('  - AaveWalletManagerB: ', rewardWalletManager.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: rewardWalletManager.deployTransaction }));
    accumulatedGasCost(rewardWalletManager.deployTransaction);
  };

  module.exports.tags = ['RewardWalletManager']
  