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
  toWei,
  toEth,
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

  const ionxMaxSupply = presets.Ionx.maxSupply;
  const leptonMaxMint = presets.Lepton.maxMintPerTx;

  const usdcAddress = presets.Aave.v2.usdc[chainId];
  const daiAddress = presets.Aave.v2.dai[chainId];

  const rewardStakingToken = chainOverride == 80001 ? daiAddress : usdcAddress;

  const ddChargedParticles = getDeployData('ChargedParticles', chainOverride);
  const ddChargedManagers = getDeployData('ChargedManagers', chainOverride);

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

  log('\n  Deploying Fake Lepton2 NFT...');
  const Lepton2 = await ethers.getContractFactory('Lepton2');
  const Lepton2Instance = await Lepton2.deploy();
  const lepton2 = await Lepton2Instance.deployed();
  deployData['FakeLepton2'] = {
    abi: getContractAbi('Lepton2'),
    address: lepton2.address,
    deployTransaction: lepton2.deployTransaction,
  }
  saveDeploymentData(chainId, deployData);
  log('  - FakeLepton2:      ', lepton2.address);
  log('     - Block:         ', lepton2.deployTransaction.blockNumber);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: lepton2.deployTransaction }));

  log('\n  Deploying Fake Ionx FT...');
  const Ionx = await ethers.getContractFactory('Ionx');
  const IonxInstance = await Ionx.deploy();
  const ionx = await IonxInstance.deployed();
  deployData['FakeIonx'] = {
    abi: getContractAbi('Ionx'),
    address: ionx.address,
    deployTransaction: ionx.deployTransaction,
  }
  saveDeploymentData(chainId, deployData);
  log('  - FakeIonx:         ', ionx.address);
  log('     - Block:         ', ionx.deployTransaction.blockNumber);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: ionx.deployTransaction }));

  log('\n  Deploying Fake UniverseRP...');
  const UniverseRP = await ethers.getContractFactory('UniverseRP');
  const UniverseRPInstance = await upgrades.deployProxy(UniverseRP, []);
  const universeRP = await UniverseRPInstance.deployed();
  deployData['FakeUniverseRP'] = {
    abi: getContractAbi('UniverseRP'),
    address: universeRP.address,
    deployTransaction: universeRP.deployTransaction,
  }
  saveDeploymentData(chainId, deployData);
  log('  - FakeUniverseRP:   ', universeRP.address);
  log('     - Block:         ', universeRP.deployTransaction.blockNumber);
  log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universeRP.deployTransaction }));

  log('\n  Deploying Fake RewardProgram...');
  const RewardProgram = await ethers.getContractFactory('RewardProgram');
  const RewardProgramInstance = await RewardProgram.deploy();
  const rewardProgram = await RewardProgramInstance.deployed();
  deployData['FakeRewardProgram'] = {
      address: rewardProgram.address,
      deployTransaction: rewardProgram.deployTransaction,
  }
  saveDeploymentData(chainId, deployData, true);
  log('  - FakeRewardProgram: ', rewardProgram.address);
  log('     - Block:          ', rewardProgram.deployTransaction.blockNumber);
  log('     - Gas Cost:       ', getTxGasCost({ deployTransaction: rewardProgram.deployTransaction }));

  //
  // Load Previously Deployed Contracts
  //

  // const ddLepton2 = getDeployData('FakeLepton2', chainId);
  // log('  Loading FakeLepton2 from:           ', ddLepton2.address, ` (${_.get(ddLepton2, 'deployTransaction.blockNumber', '0')})`);
  // const Lepton2 = await ethers.getContractFactory('Lepton2');
  // const lepton2 = await Lepton2.attach(ddLepton2.address);

  // const ddIonx = getDeployData('FakeIonx', chainId);
  // log('  Loading FakeIonx from:              ', ddIonx.address, ` (${_.get(ddIonx, 'deployTransaction.blockNumber', '0')})`);
  // const Ionx = await ethers.getContractFactory('Ionx');
  // const ionx = await Ionx.attach(ddIonx.address);

  // const ddUniverseRP = getDeployData('FakeUniverseRP', chainOverride);
  // log('  Loading FakeUniverseRP from:        ', ddUniverseRP.address, ` (${_.get(ddUniverseRP, 'deployTransaction.blockNumber', '0')})`);
  // const UniverseRP = await ethers.getContractFactory('UniverseRP');
  // const universeRP = await UniverseRP.attach(ddUniverseRP.address);

  // const ddRewardProgram = getDeployData('FakeRewardProgram', chainOverride);
  // log('  Loading FakeRewardProgram from:     ', ddRewardProgram.address, ` (${_.get(ddRewardProgram, 'deployTransaction.blockNumber', '0')})`);
  // const RewardProgram = await ethers.getContractFactory('RewardProgram');
  // const rewardProgram = await RewardProgram.attach(ddRewardProgram.address);

  //
  // Load Existing Contracts
  //

  log('\n  Loading ChargedParticles from:      ', ddChargedParticles.address, ` (${_.get(ddChargedParticles, 'deployTransaction.blockNumber', '0')})`);
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup Lepton2
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await executeTx('1-a', 'Lepton2: Setting Max Mint per Transaction', async () =>
    await lepton2.setMaxMintPerTx(leptonMaxMint)
  );

  await executeTx('1-b', 'ChargedParticles: Registering Lepton2', async () =>
    await chargedParticles.setController(lepton2.address, 'leptons')
  );

  let useChainId = parseInt(chainId, 10);
  if (useChainId === 5) { useChainId = 42; }
  if (useChainId === 80001) { useChainId = 42; }
  if (useChainId === 137) { useChainId = 1; }

  // let lepton2Type;
  for (let i = 0; i < presets.Lepton.types.length; i++) {
    lepton2Type = presets.Lepton.types[i];

    await executeTx(`1-d-${i}`, `Lepton2: Adding Lepton Type: ${lepton2Type.name}`, async () =>
      await lepton2.addLeptonType(
        lepton2Type.tokenUri,
        lepton2Type.price[useChainId],
        lepton2Type.supply[useChainId],
        lepton2Type.multiplier,
        lepton2Type.bonus,
      )
    );
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup Ionx
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await executeTx('2-a', 'Ionx: Setting Minter', async () =>
    await ionx.setMinter(deployer)
  );

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Setup RewardProgram
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  await executeTx('3-b', 'RewardProgram: Set Reward Token', async () =>
    await rewardProgram.setRewardToken(ionx.address)
  );

  await executeTx('3-d', 'RewardProgram: Set ChargedManagers', async () =>
    await rewardProgram.setChargedManagers(ddChargedManagers.address)
  );

  await executeTx('3-e', 'RewardProgram: Set Reward NFT (Lepton2)', async () =>
    await rewardProgram.setRewardNft(lepton2.address)
  );

  // Update Universe Connections

  await executeTx('3-f', 'Universe: Registering Reward Program', async () =>
    await universeRP.setRewardProgram(rewardProgram.address, rewardStakingToken, lepton2.address)
  );

  await executeTx('3-g', 'Universe: Registering ChargedParticles', async () =>
    await universeRP.setChargedParticles(ddChargedParticles.address)
  );

  await executeTx('3-h', 'ChargedParticles: Registering Universe', async () =>
    await chargedParticles.setController(universeRP.address, 'universe')
  );

  await executeTx('3-i', 'RewardProgram: Set Universe', async () =>
    await rewardProgram.setUniverse(universeRP.address)
  );

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Fund RewardProgram
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  await executeTx('3-k', 'IONX: Minting to Deployer', async () =>
    await ionx.mint(deployer, ionxMaxSupply)
  );

  await executeTx('3-l', 'IONX: Approve RewardProgram', async () =>
    await ionx.increaseAllowance(rewardProgram.address, toWei('1000000'))
  );

  await executeTx('3-m', 'RewardProgram: Fund with IONX', async () =>
    await rewardProgram.fundProgram(toWei('1000000'))
  );

  log(`\n  Deployer Balance: ${toEth(await ionx.balanceOf(deployer))}`);
  log(`  RewardProgram Balance: ${toEth(await ionx.balanceOf(rewardProgram.address))}`);

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

module.exports.tags = ['fake-reward-deploy']
