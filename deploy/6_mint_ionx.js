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
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;

  const chainId = chainIdByName(network.name);
  const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);

  const ionxMaxSupply = presets.Ionx.maxSupply;

  const daoSigner = ethers.provider.getSigner(protocolOwner);
  const ddIonx = getDeployData('Ionx', chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Minting IONX to DAO ');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', protocolOwner);
  log(' ');

  log('  Loading Ionx from: ', ddIonx.address);
  const Ionx = await ethers.getContractFactory('Ionx');
  const ionx = await Ionx.attach(ddIonx.address).connect(daoSigner);

  await log(`  - Ionx: Minting to DAO`)(alchemyTimeout);
  await ionx.mint(protocolOwner, ionxMaxSupply);


  log('\n  Contract Universe Ionx Minting Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['ionx-mint']