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

  if (chainId === 31337) { return; } // Don't upgrade for Unit-Tests

  // V1 Contracts
  const ddUniverse = getDeployData('Universe', chainId);
  const ddChargedParticles = getDeployData('ChargedParticles', chainId);

  // V2 Contracts
  let universe;
  let chargedParticles;
  let chargedState;
  let chargedSettings;
  let chargedManagers;
  let tokenInfoProxy;
  let particleSplitter;
  let aaveWalletManagerB;
  let genericBasketManagerB;
  let protonB;


  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Protocol - Contract Upgrades');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${network.name}:${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log(' ');


  //
  // Upgrade Contracts
  //

  await log('  Upgrading Universe...')(alchemyTimeout);
  const Universe = await ethers.getContractFactory('Universe');
  const UniverseInstance = await upgrades.upgradeProxy(ddUniverse.address, Universe, [deployer], {initialize: 'initialize'});
  universe = await UniverseInstance.deployed();
  deployData['Universe'] = {
    abi: getContractAbi('Universe'),
    address: universe.address,
    upgradeTransaction: universe.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - Universe: ', universe.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
  accumulatedGasCost(universe.deployTransaction);


  await log('  Upgrading ChargedParticles...')(alchemyTimeout);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const ChargedParticlesInstance = await upgrades.upgradeProxy(ddChargedParticles.address, ChargedParticles, [deployer], {initialize: 'initialize'});
  chargedParticles = await ChargedParticlesInstance.deployed();
  deployData['ChargedParticles'] = {
    abi: getContractAbi('ChargedParticles'),
    address: chargedParticles.address,
    upgradeTransaction: chargedParticles.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - ChargedParticles: ', chargedParticles.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));
  accumulatedGasCost(chargedParticles.deployTransaction);


  //
  // Deploy New Upgradeable Contracts
  //

  await log('  Deploying New ChargedState...')(alchemyTimeout);
  const ChargedState = await ethers.getContractFactory('ChargedState');
  const ChargedStateInstance = await upgrades.deployProxy(ChargedState, [deployer], {initialize: 'initialize'});
  chargedState = await ChargedStateInstance.deployed();
  deployData['ChargedState'] = {
    abi: getContractAbi('ChargedState'),
    address: chargedState.address,
    deployTransaction: chargedState.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - ChargedState:     ', chargedState.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedState.deployTransaction }));
  accumulatedGasCost(chargedState.deployTransaction);

  await log('  Deploying New ChargedSettings...')(alchemyTimeout);
  const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
  const ChargedSettingsInstance = await upgrades.deployProxy(ChargedSettings, [deployer], {initialize: 'initialize'});
  chargedSettings = await ChargedSettingsInstance.deployed();
  deployData['ChargedSettings'] = {
    abi: getContractAbi('ChargedSettings'),
    address: chargedSettings.address,
    deployTransaction: chargedSettings.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - ChargedSettings:  ', chargedSettings.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedSettings.deployTransaction }));
  accumulatedGasCost(chargedSettings.deployTransaction);

  await log('  Deploying New ChargedManagers...')(alchemyTimeout);
  const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
  const ChargedManagersInstance = await upgrades.deployProxy(ChargedManagers, [deployer], {initialize: 'initialize'});
  chargedManagers = await ChargedManagersInstance.deployed();
  deployData['ChargedManagers'] = {
    abi: getContractAbi('ChargedManagers'),
    address: chargedManagers.address,
    deployTransaction: chargedManagers.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - ChargedManagers:  ', chargedManagers.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedManagers.deployTransaction }));
  accumulatedGasCost(chargedManagers.deployTransaction);

  //
  // Deploy New Non-upgradeable Contracts
  //

  await log('  Deploying ParticleSplitter...')(alchemyTimeout);
  const ParticleSplitter = await ethers.getContractFactory('ParticleSplitter');
  const ParticleSplitterInstance = await ParticleSplitter.deploy();
  particleSplitter = await ParticleSplitterInstance.deployed();
  deployData['ParticleSplitter'] = {
    abi: getContractAbi('ParticleSplitter'),
    address: particleSplitter.address,
    deployTransaction: particleSplitter.deployTransaction
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - ParticleSplitter: ', particleSplitter.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: particleSplitter.deployTransaction }));

  await log('  Deploying TokenInfoProxy...')(alchemyTimeout);
  const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
  const TokenInfoProxyInstance = await TokenInfoProxy.deploy();
  tokenInfoProxy = await TokenInfoProxyInstance.deployed();
  deployData['TokenInfoProxy'] = {
    abi: getContractAbi('TokenInfoProxy'),
    address: tokenInfoProxy.address,
    deployTransaction: tokenInfoProxy.deployTransaction
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - TokenInfoProxy: ', tokenInfoProxy.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: tokenInfoProxy.deployTransaction }));
  accumulatedGasCost(tokenInfoProxy.deployTransaction);

  await log('  Deploying GenericWalletManagerB...')(alchemyTimeout);
  const GenericWalletManagerB = await hre.ethers.getContractFactory('GenericWalletManagerB');
  const GenericWalletManagerBInstance = await GenericWalletManagerB.deploy();
  genericWalletManagerB = await GenericWalletManagerBInstance.deployed();
  deployData['GenericWalletManagerB'] = {
    abi: getContractAbi('GenericWalletManagerB'),
    address: genericWalletManagerB.address,
    deployTransaction: genericWalletManagerB.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - GenericWalletManagerB:  ', genericWalletManagerB.address);
  log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericWalletManagerB.deployTransaction }));
  accumulatedGasCost(genericWalletManagerB.deployTransaction);

  await log('  Deploying GenericBasketManagerB...')(alchemyTimeout);
  const GenericBasketManagerB = await hre.ethers.getContractFactory('GenericBasketManagerB');
  const GenericBasketManagerBInstance = await GenericBasketManagerB.deploy();
  genericBasketManagerB = await GenericBasketManagerBInstance.deployed();
  deployData['GenericBasketManagerB'] = {
    abi: getContractAbi('GenericBasketManagerB'),
    address: genericBasketManagerB.address,
    deployTransaction: genericBasketManagerB.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - GenericBasketManagerB:  ', genericBasketManagerB.address);
  log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericBasketManagerB.deployTransaction }));
  accumulatedGasCost(genericBasketManagerB.deployTransaction);

  await log('  Deploying AaveWalletManagerB...')(alchemyTimeout);
  const AaveWalletManagerB = await hre.ethers.getContractFactory('AaveWalletManagerB');
  const AaveWalletManagerBInstance = await AaveWalletManagerB.deploy();
  aaveWalletManagerB = await AaveWalletManagerBInstance.deployed();
  deployData['AaveWalletManagerB'] = {
    abi: getContractAbi('AaveWalletManagerB'),
    address: aaveWalletManagerB.address,
    deployTransaction: aaveWalletManagerB.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - AaveWalletManagerB: ', aaveWalletManagerB.address);
  log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManagerB.deployTransaction }));
  accumulatedGasCost(aaveWalletManagerB.deployTransaction);

  // await log('  Deploying ProtonB NFT...')(alchemyTimeout);
  // const ProtonB = await ethers.getContractFactory('ProtonB');
  // const ProtonBInstance = await ProtonB.deploy();
  // protonB = await ProtonBInstance.deployed();
  // deployData['ProtonB'] = {
  //   abi: getContractAbi('ProtonB'),
  //   address: protonB.address,
  //   deployTransaction: protonB.deployTransaction,
  // }
  // saveDeploymentData(chainId, deployData, true);
  // log('  - ProtonB:            ', protonB.address);
  // log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: protonB.deployTransaction }));
  // accumulatedGasCost(protonB.deployTransaction);



  log('\n  Contract Deployment Complete - data saved to "deployments" directory.');
  const gasCosts = getAccumulatedGasCost();
  log('     - Total Gas Cost');
  log('       @ 10 gwei:  ', gasCosts[1]);
  log('       @ 100 gwei: ', gasCosts[2]);
  log('       @ 150 gwei: ', gasCosts[3]);



  log('\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Protocol - Contract Configurations');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  // Original Configs
  await configProtocol(hre, true);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

};

module.exports.tags = ['upgrades']
