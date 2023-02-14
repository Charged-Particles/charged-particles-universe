const {
    getDeployData,
    presets,
  } = require('../js-helpers/deploy');
  
  const {
    log,
    chainNameById,
    chainIdByName,
  } = require('../js-helpers/utils');
  
  const _ = require('lodash');
  
  module.exports = async (hre) => {
    const { getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
  
    const chainId = chainIdByName(network.name);
  
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Reward program deployment ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    // const result = await deploy("AludelV3", {
    //   from: deployer,
    //   args: [],
    //   log: true,
    //   contract: "src/contracts/aludel/AludelV3.sol:AludelV3",
    //   deterministicDeployment: false,
    // });
  
    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');
  
    log('\n  Contract reward program Complete!');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  }
  
  module.exports.tags = ['RewardProgram']