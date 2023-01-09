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
  const { ethers, deployments } = hre;
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

  // Attach new proton contract into charged particles protocol.
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticlesData = await deployments.get('ChargedParticles');
  const chargedParticlesContract =  ChargedParticles.attach(chargedParticlesData.address);

  const protonCContract = ProtonC.attach(protonCdata.address);
  
  const Universe = await ethers.getContractFactory('Universe');
  const universeData = await deployments.get('Universe');

  const universeContract = await Universe.attach(universeData.address);
  const setProtonCIntoUniverse = universeContract['setProtonToken'](protonC.address);
  await setProtonCIntoUniverse.wait();

  // Set charged particles addresses into proton
  const chargedStateAddress = await chargedParticlesContract['getStateAddress']();
  const chargedSettingsAddress = await chargedParticlesContract['getSettingsAddress']();

  const setChargedSettingsTx = await protonCContract['setChargedSettings'](chargedSettingsAddress);
  await setChargedSettingsTx.wait();
  const setChargedStateTx = await protonCContract['setChargedState'](chargedStateAddress);
  await setChargedStateTx.wait();
}

module.exports.tags = ['protonC']