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
    let deployData = {};
    const { getNamedAccounts, deployments } = hre;
    const { deploy } = deployments;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
  
    const chainId = chainIdByName(network.name);

    const ionx = getDeployData('Ionx', chainId);
    const rewardWalletManager = getDeployData('RewardWalletManager', chainId);
  
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Reward program deployment ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
    const result = await deploy("RewardProgram", {
      from: deployer,
      args: [
        '0x277BFc4a8dc79a9F194AD4a83468484046FAFD3A',
        ionx.address,
        rewardWalletManager.address,
        '1',
        1
      ],
      log: true,
      contract: "contracts/incentives/RewardProgram.sol:RewardProgram",
      deterministicDeployment: false,
    });

    deployData['RewardProgram'] = {
      abi: result.abi,
      address: result.address,
    }

    saveDeploymentData(chainId, deployData);
    
    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');
  
    log('\n  Contract reward program Complete!');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  }
  
  module.exports.tags = ['RewardProgram']