const {
    saveDeploymentData,
    getDeployData
  } = require('../js-helpers/deploy');

  const {
    log,
    chainNameById,
    chainIdByName,
  } = require('../js-helpers/utils');

  const _ = require('lodash');

  module.exports = async (hre) => {
    const { getNamedAccounts, ethers } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const chainId = chainIdByName(network.name);
    let deployData = {};

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Rewards Program - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log(' ');

    await log('\n  Deploying RewardProgram...');
    const RewardProgram = await ethers.getContractFactory('RewardProgram');
    const RewardProgramInstance = await RewardProgram.deploy();
    const rewardProgram = await RewardProgramInstance.deployed();
    deployData['RewardProgram'] = {
        address: rewardProgram.address,
        deployTransaction: rewardProgram.deployTransaction,
    }
    saveDeploymentData(chainId, deployData, true);

    log('  - RewardProgram:       ', rewardProgram.address);
    log('\n  Contract Reward Program Complete!');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  }

  module.exports.tags = ['RewardProgram']