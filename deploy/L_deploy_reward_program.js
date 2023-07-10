const {
  saveDeploymentData,
  getTxGasCost,
  getDeployData,
  getContractAbi,
  presets,
} = require('../js-helpers/deploy');

const {
  executeTx,
  accumulatedGasCost,
  getAccumulatedGasCost,
} = require('../js-helpers/executeTx');

const {
  log,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');


// TODO:
// Testnet:
// - Deploy New Universe & RewardProgram
// - Connect Charged Particles to New Universe
// - Fund Reward Program with IONX
// -
// Mainnet:
// - Deploy Fake Lepton2
// - Deploy Fake IONX
// - Deploy Fake Universe & RewardProgram
// - Connect Charged Particles to Fake New Universe
// - Fund Fake Reward Program with Fake IONX
// - Deposit USDC into NFT via Aave Wallet Manager
// - Earn Fake IONX Rewards at Base Multiplier
// - Deposit Fake Lepton into same NFT
// - Earn Fake IONX Rewards at Lepton Multiplier
// - TEST VALUES
// - Deploy Real New Universe & RewardProgram
// - Connect Charged Particles to New Universe
// - Fund Reward Program with IONX


const _BASE_MULTIPLIER_BP = 50000; // 500%


module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};

  const chainId = chainIdByName(network.name);
  const chainOverride = chainId;

  const usdcAddress = presets.Aave.v2.usdc[chainId];
  const daiAddress = presets.Aave.v2.dai[chainId];

  const rewardStakingToken = chainOverride == 80001 ? daiAddress : usdcAddress;

  const ddChargedParticles = getDeployData('ChargedParticles', chainOverride);
  const ddChargedManagers = getDeployData('ChargedManagers', chainOverride);
  const ddChargedSettings = getDeployData('ChargedSettings', chainOverride);

  const ddLepton2 = getDeployData('Lepton2', chainOverride);
  const ddIonx = getDeployData('Ionx', chainOverride);

  const ddProtonA = getDeployData('Proton', chainOverride);
  const ddProtonB = getDeployData('ProtonB', chainOverride);
  const ddProtonC = getDeployData('ProtonC', chainOverride);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Rewards Program - Contract Deployment');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${network.name}:${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log(' ');

  //
  // Deploy Contracts
  //
  log('  Deploying UniverseRP...');
  const UniverseRP = await ethers.getContractFactory('UniverseRP');
  const UniverseRPInstance = await upgrades.deployProxy(UniverseRP, []);
  const universeRP = await UniverseRPInstance.deployed();
  deployData['UniverseRP'] = {
    abi: getContractAbi('UniverseRP'),
    address: universeRP.address,
    deployTransaction: universeRP.deployTransaction,
  }
  saveDeploymentData(chainId, deployData);
  log('  - UniverseRP:       ', universeRP.address);
  log('     - Block:         ', universeRP.deployTransaction.blockNumber);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universeRP.deployTransaction }));

  log('\n  Deploying RewardProgram...');
  const RewardProgram = await ethers.getContractFactory('RewardProgram');
  const RewardProgramInstance = await RewardProgram.deploy();
  const rewardProgram = await RewardProgramInstance.deployed();
  deployData['RewardProgram'] = {
      address: rewardProgram.address,
      deployTransaction: rewardProgram.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - RewardProgram:    ', rewardProgram.address);
  log('     - Block:         ', rewardProgram.deployTransaction.blockNumber);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: rewardProgram.deployTransaction }));

  //
  // Load Previously Deployed Contracts
  //

  const ddUniverseRP = getDeployData('UniverseRP', chainOverride);
  log('  Loading UniverseRP from:               ', ddUniverseRP.address, ` (${_.get(ddUniverseRP, 'deployTransaction.blockNumber', '0')})`);
  // const UniverseRP = await ethers.getContractFactory('UniverseRP');
  // const universeRP = await UniverseRP.attach(ddUniverseRP.address);

  // const ddRewardProgram = getDeployData('RewardProgram', chainOverride);
  // log('  Loading RewardProgram from:               ', ddRewardProgram.address, ` (${_.get(ddRewardProgram, 'deployTransaction.blockNumber', '0')})`);
  // const RewardProgram = await ethers.getContractFactory('RewardProgram');
  // const rewardProgram = await RewardProgram.attach(ddRewardProgram.address);

  //
  // Load Existing Contracts
  //

  log('  Loading ProtonA from:               ', ddProtonA.address, ` (${_.get(ddProtonA, 'deployTransaction.blockNumber', '0')})`);
  const ProtonA = await ethers.getContractFactory('Proton');
  const protonA = await ProtonA.attach(ddProtonA.address);

  log('  Loading ProtonB from:               ', ddProtonB.address, ` (${_.get(ddProtonB, 'deployTransaction.blockNumber', '0')})`);
  const ProtonB = await ethers.getContractFactory('ProtonB');
  const protonB = await ProtonB.attach(ddProtonB.address);

  log('  Loading ProtonC from:               ', ddProtonC.address, ` (${_.get(ddProtonC, 'deployTransaction.blockNumber', '0')})`);
  const ProtonC = await ethers.getContractFactory('ProtonC');
  const protonC = await ProtonC.attach(ddProtonC.address);

  log('  Loading ChargedParticles from:      ', ddChargedParticles.address, ` (${_.get(ddChargedParticles, 'deployTransaction.blockNumber', '0')})`);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

  log('  Loading ChargedSettings from:      ', ddChargedSettings.address, ` (${_.get(ddChargedSettings, 'deployTransaction.blockNumber', '0')})`);
  const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
  const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup RewardProgram
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await executeTx('1-a', 'RewardProgram: Set Staking Token', async () =>
    await rewardProgram.setStakingToken(rewardStakingToken)
  );

  await executeTx('1-b', 'RewardProgram: Set Reward Token', async () =>
    await rewardProgram.setRewardToken(ddIonx.address)
  );

  await executeTx('1-c', `RewardProgram: Set Base Multiplier: ${(_BASE_MULTIPLIER_BP / 100)}%`, async () =>
    await rewardProgram.setBaseMultiplier(_BASE_MULTIPLIER_BP)
  );

  await executeTx('1-d', 'RewardProgram: Set ChargedManagers', async () =>
    await rewardProgram.setChargedManagers(ddChargedManagers.address)
  );

  await executeTx('1-e', 'RewardProgram: Set Reward NFT (Lepton2)', async () =>
    await rewardProgram.setRewardNft(ddLepton2.address)
  );

  // Update Universe Connections

  await executeTx('1-f', 'Universe: Registering Reward Program', async () =>
    await universeRP.setRewardProgram(rewardProgram.address, rewardStakingToken, ddLepton2.address)
  );

  await executeTx('1-g', 'Universe: Registering ChargedParticles', async () =>
    await universeRP.setChargedParticles(ddChargedParticles.address)
  );

  await executeTx('1-h', 'ChargedParticles: Registering Universe', async () =>
    await chargedParticles.setController(universeRP.address, 'universe')
  );

  await executeTx('1-i', 'RewardProgram: Set Universe', async () =>
    await rewardProgram.setUniverse(universeRP.address)
  );

  // Clear Old Protons

  await executeTx('1-j', 'ProtonA: Unregistering Universe', async () =>
    await protonA.setUniverse(ethers.constants.AddressZero)
  );

  await executeTx('1-k', 'ProtonB: Unregistering Universe', async () =>
    await protonB.setUniverse(ethers.constants.AddressZero)
  );

  // Ensure All Protons are Enabled

  await executeTx('1-l', 'ChargedSettings: Enabling ProtonA, ProtonB & ProtonC for Charge', async () =>
    await chargedSettings.enableNftContracts([protonA.address, protonB.address, protonC.address])
  );

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Fund RewardProgram
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // TODO: Manually call from Safe:
  //   1. ionx.increaseAllowance(rewardProgram.address, toWei('1000000'))
  //   2. rewardProgram.fundProgram(toWei('1000000'))


  log('\n  Contract Deployment Complete - data saved to "deployments" directory.');
  const gasCosts = getAccumulatedGasCost();
  log('     - Total Gas Cost');
  log('       @ 10 gwei:  ', gasCosts[1]);
  log('       @ 100 gwei: ', gasCosts[2]);
  log('       @ 150 gwei: ', gasCosts[3]);

  log('\n  MANUAL TODO:');
  log('     1. ionx.increaseAllowance(rewardProgram.address, 1000000) ');
  log('     2. rewardProgram.fundProgram(1000000) ');

  log('\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('\n  Contract Reward Program Complete!');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['reward-deploy']
