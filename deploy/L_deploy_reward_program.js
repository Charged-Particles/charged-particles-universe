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


module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};

  const chainId = chainIdByName(network.name);
  const chainOverride = 31337;
  // if (chainId === 31337) { return; } // Don't upgrade for Unit-Tests

  const usdcAddress = presets.Aave.v2.usdc[chainId];
  const ddUniverse = getDeployData('Universe', chainOverride);
  const ddChargedManagers = getDeployData('ChargedManagers', chainOverride);
  // const ddRewardProgram = getDeployData('RewardProgram', chainOverride);
  const ddLepton2 = getDeployData('Lepton2', chainOverride);
  const ddIonx = getDeployData('Ionx', chainOverride);

  const ddChargedParticles = getDeployData('ChargedParticles', chainOverride);
  const ddProtonB = getDeployData('ProtonB', chainOverride);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Rewards Program - Contract Deployment');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${network.name}:${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log(' ');

  //
  // Upgrade Contracts
  //
  // await log('  Upgrading Universe...');
  // const Universe = await ethers.getContractFactory('Universe');
  // const UniverseInstance = await upgrades.upgradeProxy(ddUniverse.address, Universe, [deployer], {initialize: 'initialize'});
  // const universe = await UniverseInstance.deployed();
  // deployData['Universe'] = {
  //   abi: getntractAbi('Universe'),
  //   address: universe.address,
  //   upgradeTransaction: universe.deployTransaction,
  // }
  // saveDeploymentData(chainId, deployData, true);
  // log('  - Universe: ', universe.address);
  // log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
  // accumulatedGasCost(universe.deployTransaction);

  log('  Deploying Universe...');
  const Universe = await ethers.getContractFactory('Universe');
  const UniverseInstance = await upgrades.deployProxy(Universe, []);
  const universe = await UniverseInstance.deployed();
  deployData['Universe'] = {
    abi: getContractAbi('Universe'),
    address: universe.address,
    deployTransaction: universe.deployTransaction,
  }
  saveDeploymentData(chainId, deployData);
  log('  - Universe:         ', universe.address);
  log('     - Block:         ', universe.deployTransaction.blockNumber);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));

  log('\n  Deploying RewardProgram...');
  const RewardProgram = await ethers.getContractFactory('RewardProgram');
  // console.log(RewardProgram);
  const RewardProgramInstance = await RewardProgram.deploy();
  const rewardProgram = await RewardProgramInstance.deployed();
  deployData['RewardProgram'] = {
      address: rewardProgram.address,
      deployTransaction: rewardProgram.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - RewardProgram: ', rewardProgram.address);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: rewardProgram.deployTransaction }));
  accumulatedGasCost(rewardProgram.deployTransaction);

  log('  Loading ProtonB from:               ', ddProtonB.address, ` (${_.get(ddProtonB, 'deployTransaction.blockNumber', '0')})`);
  const ProtonB = await ethers.getContractFactory('ProtonB');
  const protonB = await ProtonB.attach(ddProtonB.address);

  log('  Loading ChargedParticles from:      ', ddChargedParticles.address, ` (${_.get(ddChargedParticles, 'deployTransaction.blockNumber', '0')})`);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup RewardProgram
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await executeTx('1-a', 'RewardProgram: Set Staking Token', async () =>
    await rewardProgram.setStakingToken(usdcAddress)
  );

  await executeTx('1-b', 'RewardProgram: Set Reward Token', async () =>
    await rewardProgram.setRewardToken(ddIonx.address)
  );

  await executeTx('1-c', 'RewardProgram: Set Base Multiplier (10000 = 100%)', async () =>
    await rewardProgram.setBaseMultiplier(10000) // 100%
  );

  await executeTx('1-d', 'RewardProgram: Set ChargedManagers', async () =>
    await rewardProgram.setChargedManagers(ddChargedManagers.address)
  );

  await executeTx('1-e', 'RewardProgram: Set Universe', async () =>
    await rewardProgram.setUniverse(ddProtonB.address)
  );

  await executeTx('1-f', 'RewardProgram: Set Reward NFT (Lepton2)', async () =>
    await rewardProgram.setRewardNft(ddLepton2.address)
  );

  await executeTx('1-g', 'Universe: Registering Reward Program', async () =>
    await universe.setRewardProgram(rewardProgram.address, usdcAddress)
  );

  //
  await executeTx('1-a', 'Universe: Registering ChargedParticles', async () =>
    await universe.setChargedParticles(ddChargedParticles.address)
  );

  await executeTx('1-b', 'ChargedParticles: Registering Universe', async () =>
    await chargedParticles.setController(universe.address, 'universe')
  );

  await executeTx('4-f', 'Universe: Registering Proton', async () =>
    await universe.setProtonToken(ddProtonB.address)
  );

  // Check empty address is correct.
  await executeTx('4-f', 'ProtonA: Unregistering Universe', async () =>
    await protonB.setUniverse(ethers.constants.AddressZero)
  );

  await executeTx('4-g', 'Universe: Registering ProtonB', async () =>
    await universe.setProtonToken(ddProtonB.address)
  );

  await executeTx('6-a', 'Universe: Registering Ionx', async () =>
    await universe.setPhoton(ddIonx.address, presets.Ionx.maxSupply.div(2))
  );

  await executeTx('10-a', 'RewardProgram: Set Staking Token', async () =>
   await rewardProgram.setStakingToken(usdcAddress)
  );

  log('\n  Contract Deployment Complete - data saved to "deployments" directory.');
  const gasCosts = getAccumulatedGasCost();
  log('     - Total Gas Cost');
  log('       @ 10 gwei:  ', gasCosts[1]);
  log('       @ 100 gwei: ', gasCosts[2]);
  log('       @ 150 gwei: ', gasCosts[3]);

  log('\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('\n  Contract Reward Program Complete!');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['reward-deploy']
