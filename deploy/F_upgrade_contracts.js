const {
  saveDeploymentData,
  saveMigrationData,
  getContractAbi,
  getTxGasCost,
  getDeployData,
  getMigrationData,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  toEth,
  bn,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const { AddressZero } = require('ethers').constants
const _ = require('lodash');


const _migrationSubgraphDump = {
  chargedSettings: require('../migration_data/subgraph_dump/ChargedSettings'),
  chargedState: require('../migration_data/subgraph_dump/ChargedState'),
};


let __accumulatedGasCost = bn(0);
const accumulatedGasCost = (tx) => {
  let gasCost = 0;
  if (_.get(tx, 'gasUsed', false)) {
    gasCost = tx.gasUsed.mul(tx.effectiveGasPrice);
  } else {
    gasCost = tx.gasLimit.mul(tx.gasPrice);
  }
  __accumulatedGasCost = gasCost.add(__accumulatedGasCost);
};
const getAccumulatedGasCost = () => {
  if (__accumulatedGasCost === 0) {
    return ['0 ETH', '0 ETH', '0 ETH'];
  }
  const gwei10 = `${toEth(__accumulatedGasCost)} ETH`;
  const gwei100 = `${toEth(__accumulatedGasCost.mul(10))} ETH`;
  const gwei150 = `${toEth(__accumulatedGasCost.mul(15))} ETH`;
  __accumulatedGasCost = 0;
  return [gwei10, gwei100, gwei150];
};


const IS_DEPLOYED = false;
const IS_INITED = false;
const IS_CONFIGED = false;


module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre;
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};
  let gasCosts;

  const chainId = chainIdByName(network.name);
  const { isProd, isHardhat } = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 5);

  const executeTx = async (txId, txDesc, callback, increaseDelay = 0) => {
    try {
      if (txId === '1-a') {
        log(`\n`);
      }
      await log(`  - [TX-${txId}] ${txDesc}`)(alchemyTimeout + increaseDelay);
      const tx = await callback();
      const txResult = await tx.wait();
      accumulatedGasCost(txResult);
    }
    catch (err) {
      log(`  - Transaction ${txId} Failed: ${err}`);
      log(`  - Retrying;`);
      await executeTx(txId, txDesc, callback, increaseDelay + 3);
    }
  }

  // if (chainId !== 42) { return; } // Kovan only


  // V1 Contracts
  const ddChargedParticles = getDeployData('ChargedParticles', chainId);

  // V2 Contracts
  let ddChargedStateNew, chargedState;
  let ddChargedSettingsNew, chargedSettings;
  let ddChargedManagers, chargedManagers;
  let ddChargedParticlesNew, chargedParticles;
  let ddTokenInfoProxy, tokenInfoProxy;
  let ddGenericWalletManager;
  let ddAaveWalletManagerB, aaveWalletManagerB;
  let ddAaveBridgeV2;
  let ddGenericBasketManagerB, genericBasketManagerB;
  let ddProton, proton;

  const loadV2Contracts = () => {
    ddChargedStateNew = getDeployData('ChargedStateNew', chainId);
    ddChargedSettingsNew = getDeployData('ChargedSettingsNew', chainId);
    ddChargedManagers = getDeployData('ChargedManagers', chainId);
    ddChargedParticlesNew = getDeployData('ChargedParticles', chainId);
    ddTokenInfoProxy = getDeployData('TokenInfoProxy', chainId);
    ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    ddAaveWalletManagerB = getDeployData('AaveWalletManagerB', chainId);
    ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    ddGenericBasketManagerB = getDeployData('GenericBasketManagerB', chainId);
    ddProton = getDeployData('Proton', chainId);
  };

  const migrationTracking = {
    accounts: getMigrationData('accounts', chainId),
    contracts: getMigrationData('contracts', chainId),
    nfts: getMigrationData('nfts', chainId),
  };
  const isMigrated = (typeId, dataId) => _.has(migrationTracking[typeId], dataId);


  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Protocol - Contract Upgrades & Migrations');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${network.name}:${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log(' ');


  //
  // Deploy New Upgradeable Contracts
  //

  if (!IS_DEPLOYED) {
    await log('  Deploying New ChargedState...')(alchemyTimeout);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const ChargedStateInstance = await upgrades.deployProxy(ChargedState, [deployer], {initialize: 'initialize'});
    chargedState = await ChargedStateInstance.deployed();
    deployData['ChargedStateNew'] = {
      abi: getContractAbi('ChargedState'),
      address: chargedState.address,
      deployTransaction: chargedState.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - ChargedState:     ', chargedState.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedState.deployTransaction }));
    accumulatedGasCost(chargedState.deployTransaction);

    await log('  Deploying New ChargedSettings...')(alchemyTimeout);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const ChargedSettingsInstance = await upgrades.deployProxy(ChargedSettings, [deployer], {initialize: 'initialize'});
    chargedSettings = await ChargedSettingsInstance.deployed();
    deployData['ChargedSettingsNew'] = {
      abi: getContractAbi('ChargedSettings'),
      address: chargedSettings.address,
      deployTransaction: chargedSettings.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
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
    saveDeploymentData(chainId, deployData);
    log('  - ChargedManagers:  ', chargedManagers.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedManagers.deployTransaction }));
    accumulatedGasCost(chargedManagers.deployTransaction);

    //
    // Deploy New Non-upgradeable Contracts
    //

    await log('  Deploying TokenInfoProxy...')(alchemyTimeout);
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
    const TokenInfoProxyInstance = await TokenInfoProxy.deploy();
    tokenInfoProxy = await TokenInfoProxyInstance.deployed();
    deployData['TokenInfoProxy'] = {
      abi: getContractAbi('TokenInfoProxy'),
      address: tokenInfoProxy.address,
      deployTransaction: tokenInfoProxy.deployTransaction
    }
    saveDeploymentData(chainId, deployData);
    log('  - TokenInfoProxy: ', tokenInfoProxy.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: tokenInfoProxy.deployTransaction }));
    accumulatedGasCost(tokenInfoProxy.deployTransaction);

    await log('  Deploying GenericBasketManagerB...')(alchemyTimeout);
    const GenericBasketManagerB = await hre.ethers.getContractFactory('GenericBasketManagerB');
    const GenericBasketManagerBInstance = await GenericBasketManagerB.deploy();
    genericBasketManagerB = await GenericBasketManagerBInstance.deployed();
    deployData['GenericBasketManagerB'] = {
      abi: getContractAbi('GenericBasketManagerB'),
      address: genericBasketManagerB.address,
      deployTransaction: genericBasketManagerB.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
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
    saveDeploymentData(chainId, deployData);
    log('  - AaveWalletManagerB: ', aaveWalletManagerB.address);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManagerB.deployTransaction }));
    accumulatedGasCost(aaveWalletManagerB.deployTransaction);


    //
    // Upgrade Contracts
    //

    await log('  Upgrading ChargedParticles...')(alchemyTimeout);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ChargedParticlesInstance = await upgrades.upgradeProxy(ddChargedParticles.address, ChargedParticles, [deployer], {initialize: 'initialize'});
    chargedParticles = await ChargedParticlesInstance.deployed();
    deployData['ChargedParticles'] = {
      abi: getContractAbi('ChargedParticles'),
      address: chargedParticles.address,
      upgradeTransaction: chargedParticles.deployTransaction,
    }
    saveDeploymentData(chainId, deployData);
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));
    accumulatedGasCost(chargedParticles.deployTransaction);

    log('\n  Contract Deployment Complete - data saved to "deployments" directory.');
    gasCosts = getAccumulatedGasCost();
    log('     - Total Gas Cost');
    log('       @ 10 gwei:  ', gasCosts[0]);
    log('       @ 100 gwei: ', gasCosts[1]);
    log('       @ 150 gwei: ', gasCosts[2]);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    // Load V2 Contracts
    loadV2Contracts();
  } else {
    // Load V2 Contracts
    loadV2Contracts();

    log('  Loading ChargedParticles from: ', ddChargedParticlesNew.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    chargedParticles = await ChargedParticles.attach(ddChargedParticlesNew.address);

    log('  Loading ChargedState from: ', ddChargedStateNew.address);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    chargedState = await ChargedState.attach(ddChargedStateNew.address);

    log('  Loading ChargedSettings from: ', ddChargedSettingsNew.address);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    chargedSettings = await ChargedSettings.attach(ddChargedSettingsNew.address);

    log('  Loading ChargedManagers from: ', ddChargedManagers.address);
    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    chargedManagers = await ChargedManagers.attach(ddChargedManagers.address);

    log('  Loading GenericBasketManagerB from: ', ddGenericBasketManagerB.address);
    const GenericBasketManagerB = await ethers.getContractFactory('GenericBasketManagerB');
    genericBasketManagerB = await GenericBasketManagerB.attach(ddGenericBasketManagerB.address);

    log('  Loading AaveWalletManagerB from: ', ddAaveWalletManagerB.address);
    const AaveWalletManagerB = await ethers.getContractFactory('AaveWalletManagerB');
    aaveWalletManagerB = await AaveWalletManagerB.attach(ddAaveWalletManagerB.address);
  }

  log('  Loading Proton from: ', ddProton.address);
  const Proton = await ethers.getContractFactory('Proton');
  proton = await Proton.attach(ddProton.address);


  //
  // Initialize Contracts
  //

  // if (!IS_INITED) {
  //   await log('  Initializing ChargedState...')(alchemyTimeout);
  //   await chargedState.initialize();

  //   await log('  Initializing ChargedSettings...')(alchemyTimeout);
  //   await chargedSettings.initialize();

  //   await log('  Initializing ChargedManagers...')(alchemyTimeout);
  //   await chargedManagers.initialize();

  //   await log('  Initializing ChargedParticles...')(alchemyTimeout);
  //   await chargedParticles.initialize();
  // }


  //
  // Configure Contracts
  //

  if (!IS_CONFIGED) {

    await executeTx('1-a', 'ChargedParticles: Registering ChargedState', async () =>
      await chargedParticles.setController(ddChargedStateNew.address, 'state')
    );

    await executeTx('1-b', 'ChargedParticles: Registering ChargedSettings', async () =>
      await chargedParticles.setController(ddChargedSettingsNew.address, 'settings')
    );

    await executeTx('1-c', 'ChargedParticles: Registering ChargedManagers', async () =>
      await chargedParticles.setController(ddChargedManagers.address, 'managers')
    );

    await executeTx('1-d', 'ChargedParticles: Registering TokenInfoProxy', async () =>
      await chargedParticles.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );


    await executeTx('2-a', 'ChargedSettings: Registering TokenInfoProxy', async () =>
      await chargedSettings.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );

    await executeTx('2-b', 'ChargedState: Registering ChargedSettings', async () =>
      await chargedState.setController(ddChargedSettingsNew.address, 'settings')
    );

    await executeTx('2-c', 'ChargedState: Registering TokenInfoProxy', async () =>
      await chargedState.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );

    await executeTx('3-a', 'ChargedManagers: Registering ChargedSettings', async () =>
      await chargedManagers.setController(ddChargedSettingsNew.address, 'settings')
    );

    await executeTx('3-b', 'ChargedManagers: Registering ChargedState', async () =>
      await chargedManagers.setController(ddChargedStateNew.address, 'state')
    );

    await executeTx('3-c', 'ChargedManagers: Registering TokenInfoProxy', async () =>
      await chargedManagers.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );


    await executeTx('4-a', 'GenericBasketManagerB: Setting Charged Particles as Controller', async () =>
      await genericBasketManagerB.setController(ddChargedParticlesNew.address)
    );

    await executeTx('4-b', 'GenericBasketManagerB: Registering Generic Basket Manager "B" with ChargedParticles', async () =>
      await chargedManagers.registerBasketManager('generic.B', ddGenericBasketManagerB.address)
    );

    await executeTx('4-c', 'GenericBasketManagerB: Registering TokenInfoProxy', async () =>
      await genericBasketManagerB.setTokenInfoProxy(ddTokenInfoProxy.address)
    );


    await executeTx('5-a', 'AaveWalletManagerB: Setting Charged Particles as Controller', async () =>
      await aaveWalletManagerB.setController(ddChargedParticlesNew.address)
    );

    await executeTx('5-b', 'AaveWalletManagerB: Setting Aave Bridge to V2', async () =>
      await aaveWalletManagerB.setAaveBridge(ddAaveBridgeV2.address)
    );

    await executeTx('5-c', 'AaveWalletManagerB: Registering Aave as LP with ChargedParticles', async () =>
      await chargedManagers.registerWalletManager('aave.B', ddAaveWalletManagerB.address)
    );

    await executeTx('5-d', 'AaveWalletManagerB: Registering ChargedSettings', async () =>
      await aaveWalletManagerB.setChargedSettings(ddChargedSettingsNew.address)
    );


    await executeTx('6-a', 'Proton: Registering ChargedState', async () =>
      await proton.setChargedState(ddChargedStateNew.address)
    );

    await executeTx('6-b', 'Proton: Registering ChargedSettings', async () =>
      await proton.setChargedSettings(ddChargedSettingsNew.address)
    );

    await executeTx('6-c', 'ChargedSettings: Enabling Proton for Charge', async () =>
      await chargedSettings.enableNftContracts([ddProton.address])
    );


    await executeTx('7-a', 'GenericWalletManager: Registering Generic Wallet Manager with ChargedParticles', async () =>
      await chargedManagers.registerWalletManager('generic', ddGenericWalletManager.address)
    );

    await executeTx('7-b', 'ChargedSettings: Setting Temp-Lock Expiry Blocks', async () =>
      await chargedSettings.setTempLockExpiryBlocks(_migrationSubgraphDump.chargedSettings.tempLockExpiryBlocks)
    );

    log('\n  Contract Configuration Complete.');
    gasCosts = getAccumulatedGasCost();
    log('     - Total Gas Cost');
    log('       @ 10 gwei:  ', gasCosts[0]);
    log('       @ 100 gwei: ', gasCosts[1]);
    log('       @ 150 gwei: ', gasCosts[2]);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  }


  //
  // Migrate Contracts
  //

  let nftCreatorData, annuityRedirect;
  const nftCreatorSettings = _.get(_migrationSubgraphDump, 'chargedSettings.nftCreatorSettings', []);
  log(`\n\n  Migrating ChargedSettings for ${nftCreatorSettings.length} Accounts...`);

  for (let i = 0; i < nftCreatorSettings.length; i++) {
    nftCreatorData = nftCreatorSettings[i];
    annuityRedirect = !_.isEmpty(nftCreatorData.annuityRedirect) ? nftCreatorData.annuityRedirect : AddressZero;

    if (isMigrated('accounts', nftCreatorData.id)) {
      log(`  - [TX-8-a-${i}] Skipping: ${nftCreatorData.id} (already migrated)`);
      continue;
    }

    await executeTx(`8-a-${i}`, `Migrating ChargedSettings for: ${nftCreatorData.id}`, async () =>
      await chargedSettings.migrateToken(
        nftCreatorData.contractAddress,
        nftCreatorData.tokenId,
        nftCreatorData.creatorAddress,
        nftCreatorData.annuityPercent,
        annuityRedirect,
      )
    );
    migrationTracking.accounts[nftCreatorData.id] = true;
    saveMigrationData(chainId, migrationTracking);
  }

  let nftEnabledData;
  const nftSettings = _.get(_migrationSubgraphDump, 'chargedSettings.nftSettings', []);
  log(`\n\n  Migrating ChargedSettings for ${nftSettings.length} Contracts...`);

  for (let i = 0; i < nftSettings.length; i++) {
    nftEnabledData = nftSettings[i];

    if (isMigrated('contracts', nftEnabledData.id)) {
      log(`  - [TX-8-b-${i}] Skipping: ${nftEnabledData.id} (already migrated)`);
      continue;
    }

    await executeTx(`8-b-${i}`, `Migrating ChargedSettings for: ${nftEnabledData.contractAddress}`, async () =>
      await chargedSettings.enableNftContracts([nftEnabledData.contractAddress])
    );
    migrationTracking.contracts[nftEnabledData.id] = true;
    saveMigrationData(chainId, migrationTracking);
  }

  let nftStateData, releaseTimelockExpiry, releaseTimelockLockedBy, tempLockExpiry;
  const nftState = _.get(_migrationSubgraphDump, 'chargedState', []);
  log(`\n\n  Migrating ChargedState for ${nftState.length} NFTs...`);

  for (let i = 0; i < nftState.length; i++) {
    nftStateData = nftState[i];
    releaseTimelockExpiry = !_.isEmpty(nftCreatorData.releaseTimelockExpiry) ? nftCreatorData.releaseTimelockExpiry : "0";
    releaseTimelockLockedBy = !_.isEmpty(nftCreatorData.releaseTimelockLockedBy) ? nftCreatorData.releaseTimelockLockedBy : AddressZero;
    tempLockExpiry = !_.isEmpty(nftCreatorData.tempLockExpiry) ? nftCreatorData.tempLockExpiry : "0";

    if (isMigrated('nfts', nftStateData.id)) {
      log(`  - [TX-8-c-${i}] Skipping: ${nftStateData.id} (already migrated)`);
      continue;
    }

    await executeTx(`8-c-${i}`, `Migrating ChargedState for: ${nftStateData.id}`, async () =>
      await chargedState.migrateToken(
        nftCreatorData.contractAddress,
        nftCreatorData.tokenId,
        releaseTimelockExpiry,
        releaseTimelockLockedBy,
        tempLockExpiry,
      )
    );
    migrationTracking.nfts[nftStateData.id] = true;
    saveMigrationData(chainId, migrationTracking);
  }


  log('\n  Contract Migration Complete.');
  gasCosts = getAccumulatedGasCost();
  log('     - Total Gas Cost');
  log('       @ 10 gwei:  ', gasCosts[0]);
  log('       @ 100 gwei: ', gasCosts[1]);
  log('       @ 150 gwei: ', gasCosts[2]);
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['upgrades']
