const {
  chainNameById,
  chainIdByName,
  getDeployData,
  log,
  presets,
} = require("../js-helpers/deploy");

const _ = require('lodash');

module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;

  const chainId = chainIdByName(network.name);
  const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);

  const ionMaxSupply = presets.Ion.universeMaxSupply;

  const daoSigner = ethers.provider.getSigner(protocolOwner);
  const ddIon = getDeployData('Ion', chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Minting ION to DAO ');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainNameById(chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', protocolOwner);
  log(' ');

  log('  Loading Ion from: ', ddIon.address);
  const Ion = await ethers.getContractFactory('Ion');
  const ion = await Ion.attach(ddIon.address).connect(daoSigner);

  await log(`  - Ion: Minting to Universe`)(alchemyTimeout);
  await ion.mint(protocolOwner, ionMaxSupply);


  log('\n  Contract Universe Ion Minting Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-ion']