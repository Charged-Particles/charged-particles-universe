const {
    getContractAbi,
  } = require('../js-helpers/deploy');
  
  const {
    log,
    chainTypeById,
    chainIdByName,
  } = require('../js-helpers/utils');
  
  const _ = require('lodash');
  
  module.exports = async (hre) => {
    const { ethers } = hre;
    const network = await hre.network;
    const deployData = {};
  
    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 3 : 2);
  
    await log('\n  Deploying ProtonC NFT...')(alchemyTimeout);
    const ProtonC = await ethers.getContractFactory('ProtonC');
    const ProtonCInstance = await ProtonC.deploy();
    const protonC = await ProtonCInstance.deployed();
  
    deployData['ProtonC'] = {
      abi: getContractAbi('ProtonC'),
      address: protonC.address,
      deployTransaction: protonC.deployTransaction,
    }
  }
  
  module.exports.tags = ['protonC']