const {
  getDeployData,
  presets,
} = require('./deploy');

const {
  executeTx,
  skipToTxId,
  getAccumulatedGasCost,
} = require('./executeTx');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('./utils');

const _ = require('lodash');

module.exports = async (hre, afterUpgradesV2 = false) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;
    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);

    const referralCode = presets.Aave.referralCode[chainId];
    const ionxMaxSupply = presets.Ionx.maxSupply;
    const leptonMaxMint = presets.Lepton.maxMintPerTx;
    const depositCaps = presets.ChargedParticles.maxDeposits;
    const rewardsForAssetTokens = presets.Ionx.rewardsForAssetTokens;
    const tempLockExpiryBlocks = presets.ChargedParticles.tempLockExpiryBlocks;

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedState = getDeployData('ChargedState', chainId);
    const ddChargedSettings = getDeployData('ChargedSettings', chainId);
    const ddChargedManagers = getDeployData('ChargedManagers', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddParticleSplitter = getDeployData('ParticleSplitter', chainId);
    const ddTokenInfoProxy = getDeployData('TokenInfoProxy', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveWalletManagerB = getDeployData('AaveWalletManagerB', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericWalletManagerB = getDeployData('GenericWalletManagerB', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
    const ddGenericBasketManagerB = getDeployData('GenericBasketManagerB', chainId);
    const ddProton = getDeployData('Proton', chainId);
    const ddProtonB = getDeployData('ProtonB', chainId);
    const ddLepton2 = getDeployData('Lepton2', chainId);
    const ddIonx = getDeployData('Ionx', chainId);

    log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Loading Universe from:              ', ddUniverse.address, ` (${_.get(ddUniverse, 'deployTransaction.blockNumber', '0')})`);
    const Universe = await ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    log('  Loading ChargedParticles from:      ', ddChargedParticles.address, ` (${_.get(ddChargedParticles, 'deployTransaction.blockNumber', '0')})`);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    log('  Loading ChargedState from:          ', ddChargedState.address, ` (${_.get(ddChargedState, 'deployTransaction.blockNumber', '0')})`);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const chargedState = await ChargedState.attach(ddChargedState.address);

    log('  Loading ChargedSettings from:       ', ddChargedSettings.address, ` (${_.get(ddChargedSettings, 'deployTransaction.blockNumber', '0')})`);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

    log('  Loading ChargedManagers from:       ', ddChargedManagers.address, ` (${_.get(ddChargedManagers, 'deployTransaction.blockNumber', '0')})`);
    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    const chargedManagers = await ChargedManagers.attach(ddChargedManagers.address);

    log('  Loading ParticleSplitter from:      ', ddParticleSplitter.address, ` (${_.get(ddParticleSplitter, 'deployTransaction.blockNumber', '0')})`);
    const ParticleSplitter = await ethers.getContractFactory('ParticleSplitter');
    const particleSplitter = await ParticleSplitter.attach(ddParticleSplitter.address);

    log('  Loading GenericWalletManager from:  ', ddGenericWalletManager.address, ` (${_.get(ddGenericWalletManager, 'deployTransaction.blockNumber', '0')})`);
    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const genericWalletManager = await GenericWalletManager.attach(ddGenericWalletManager.address);

    log('  Loading GenericWalletManagerB from: ', ddGenericWalletManagerB.address, ` (${_.get(ddGenericWalletManagerB, 'deployTransaction.blockNumber', '0')})`);
    const GenericWalletManagerB = await ethers.getContractFactory('GenericWalletManagerB');
    const genericWalletManagerB = await GenericWalletManagerB.attach(ddGenericWalletManagerB.address);

    log('  Loading GenericBasketManager from:  ', ddGenericBasketManager.address, ` (${_.get(ddGenericBasketManager, 'deployTransaction.blockNumber', '0')})`);
    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const genericBasketManager = await GenericBasketManager.attach(ddGenericBasketManager.address);

    log('  Loading GenericBasketManagerB from: ', ddGenericBasketManagerB.address, ` (${_.get(ddGenericBasketManagerB, 'deployTransaction.blockNumber', '0')})`);
    const GenericBasketManagerB = await ethers.getContractFactory('GenericBasketManagerB');
    const genericBasketManagerB = await GenericBasketManagerB.attach(ddGenericBasketManagerB.address);

    log('  Loading AaveWalletManager from:     ', ddAaveWalletManager.address, ` (${_.get(ddAaveWalletManager, 'deployTransaction.blockNumber', '0')})`);
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

    log('  Loading AaveWalletManagerB from:    ', ddAaveWalletManagerB.address, ` (${_.get(ddAaveWalletManagerB, 'deployTransaction.blockNumber', '0')})`);
    const AaveWalletManagerB = await ethers.getContractFactory('AaveWalletManagerB');
    const aaveWalletManagerB = await AaveWalletManagerB.attach(ddAaveWalletManagerB.address);

    log('  Loading TokenInfoProxy from:        ', ddTokenInfoProxy.address, ` (${_.get(ddTokenInfoProxy, 'deployTransaction.blockNumber', '0')})`);
    const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
    const tokenInfoProxy = await TokenInfoProxy.attach(ddTokenInfoProxy.address);

    log('  Loading Proton from:                ', ddProton.address, ` (${_.get(ddProton, 'deployTransaction.blockNumber', '0')})`);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading ProtonB from:               ', ddProtonB.address, ` (${_.get(ddProtonB, 'deployTransaction.blockNumber', '0')})`);
    const ProtonB = await ethers.getContractFactory('ProtonB');
    const protonB = await ProtonB.attach(ddProtonB.address);

    let ddLepton, Lepton, lepton;
    if (isHardhat) {
      ddLepton = getDeployData('Lepton', chainId);
      log('  Loading Lepton from:                ', ddLepton.address, ` (${_.get(ddLepton, 'deployTransaction.blockNumber', '0')})`);
      Lepton = await ethers.getContractFactory('Lepton');
      lepton = await Lepton.attach(ddLepton.address);
    }

    log('  Loading Lepton2 from:               ', ddLepton2.address, ` (${_.get(ddLepton2, 'deployTransaction.blockNumber', '0')})`);
    const Lepton2 = await ethers.getContractFactory('Lepton2');
    const lepton2 = await Lepton2.attach(ddLepton2.address);

    log('  Loading Ionx from:                  ', ddIonx.address, ` (${_.get(ddIonx, 'deployTransaction.blockNumber', '0')})`);
    const Ionx = await ethers.getContractFactory('Ionx');
    const ionx = await Ionx.attach(ddIonx.address);


    // skipToTxId('4-d');

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Charged Particles & Universe
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('1-a', 'Universe: Registering ChargedParticles', async () =>
      await universe.setChargedParticles(ddChargedParticles.address)
    );

    await executeTx('1-b', 'ChargedParticles: Registering Universe', async () =>
      await chargedParticles.setController(ddUniverse.address, 'universe')
    );

    await executeTx('1-c', 'ChargedParticles: Registering ChargedState', async () =>
      await chargedParticles.setController(ddChargedState.address, 'state')
    );

    await executeTx('1-d', 'ChargedParticles: Registering ChargedSettings', async () =>
      await chargedParticles.setController(ddChargedSettings.address, 'settings')
    );

    await executeTx('1-e', 'ChargedParticles: Registering ChargedManagers', async () =>
      await chargedParticles.setController(ddChargedManagers.address, 'managers')
    );

    await executeTx('1-f', 'ChargedParticles: Registering TokenInfoProxy', async () =>
      await chargedParticles.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );

    if (isHardhat && !afterUpgradesV2) {
      await executeTx('1-g', 'ChargedParticles: Registering Lepton', async () =>
        await chargedParticles.setController(ddLepton.address, 'leptons')
      );
    }

    await executeTx('1-h', 'ChargedSettings: Registering TokenInfoProxy', async () =>
      await chargedSettings.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );

    await executeTx('1-i', 'ChargedState: Registering ChargedSettings', async () =>
      await chargedState.setController(ddChargedSettings.address, 'settings')
    );

    await executeTx('1-j', 'ChargedState: Registering TokenInfoProxy', async () =>
      await chargedState.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );

    await executeTx('1-k', 'ChargedManagers: Registering ChargedSettings', async () =>
      await chargedManagers.setController(ddChargedSettings.address, 'settings')
    );

    await executeTx('1-l', 'ChargedManagers: Registering ChargedState', async () =>
      await chargedManagers.setController(ddChargedState.address, 'state')
    );

    await executeTx('1-m', 'ChargedManagers: Registering TokenInfoProxy', async () =>
      await chargedManagers.setController(ddTokenInfoProxy.address, 'tokeninfo')
    );

    await executeTx('1-n', 'ParticleSplitter: Registering ChargedManagers', async () =>
      await particleSplitter.setChargedManagers(ddChargedManagers.address)
    );

    await executeTx('1-o', 'ParticleSplitter: Registering TokenInfoProxy', async () =>
      await particleSplitter.setTokenInfoProxy(ddTokenInfoProxy.address)
    );

    await executeTx('1-p', 'ChargedParticles: Setting Temp-Lock Expiry Blocks', async () =>
      await chargedSettings.setTempLockExpiryBlocks(tempLockExpiryBlocks)
    );


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Generic Wallet Managers
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    !afterUpgradesV2 && await executeTx('2-a', 'GenericWalletManager: Setting Charged Particles as Controller', async () =>
      await genericWalletManager.setController(ddChargedParticles.address)
    );

    await executeTx('2-b', 'GenericWalletManager: Registering Generic Wallet Manager with ChargedParticles', async () =>
      await chargedManagers.registerWalletManager('generic', ddGenericWalletManager.address)
    );

    await executeTx('2-c', 'GenericWalletManagerB: Setting Charged Particles as Controller', async () =>
      await genericWalletManagerB.setController(ddChargedParticles.address)
    );

    await executeTx('2-d', 'GenericWalletManagerB: Registering Generic Wallet Manager "B" with ChargedParticles', async () =>
      await chargedManagers.registerWalletManager('generic.B', ddGenericWalletManagerB.address)
    );

    !afterUpgradesV2 && await executeTx('2-e', 'GenericBasketManager: Setting Charged Particles as Controller', async () =>
      await genericBasketManager.setController(ddChargedParticles.address)
    );

    await executeTx('2-f', 'GenericBasketManager: Registering Generic Basket Manager with ChargedParticles', async () =>
      await chargedManagers.registerBasketManager('generic', ddGenericBasketManager.address)
    );

    await executeTx('2-g', 'GenericBasketManagerB: Setting Charged Particles as Controller', async () =>
      await genericBasketManagerB.setController(ddChargedParticles.address)
    );

    await executeTx('2-h', 'GenericBasketManagerB: Registering Generic Basket Manager "B" with ChargedParticles', async () =>
      await chargedManagers.registerBasketManager('generic.B', ddGenericBasketManagerB.address)
    );

    await executeTx('2-i', 'GenericBasketManagerB: Registering TokenInfoProxy', async () =>
      await genericBasketManagerB.setTokenInfoProxy(ddTokenInfoProxy.address)
    );


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Aave Wallet Manager
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    !afterUpgradesV2 && await executeTx('3-a', 'AaveWalletManager: Setting Charged Particles as Controller', async () =>
      await aaveWalletManager.setController(ddChargedParticles.address)
    );

    !afterUpgradesV2 && await executeTx('3-b', 'AaveWalletManager: Setting Aave Bridge to V2', async () =>
      await aaveWalletManager.setAaveBridge(ddAaveBridgeV2.address)
    );

    await executeTx('3-c', 'AaveWalletManager: Registering Aave as LP with ChargedParticles', async () =>
      await chargedManagers.registerWalletManager('aave', ddAaveWalletManager.address)
    );

    // if (referralCode.length > 0) {
    //   await executeTx('3-d', 'AaveWalletManager: Setting Referral Code', async () =>
    //     await aaveWalletManager.setReferralCode(referralCode)
    //   );
    // }

    await executeTx('3-e', 'AaveWalletManagerB: Setting Charged Particles as Controller', async () =>
      await aaveWalletManagerB.setController(ddChargedParticles.address)
    );

    await executeTx('3-f', 'AaveWalletManagerB: Setting Aave Bridge to V2', async () =>
      await aaveWalletManagerB.setAaveBridge(ddAaveBridgeV2.address)
    );

    await executeTx('3-g', 'AaveWalletManagerB: Registering Aave as LP with ChargedParticles', async () =>
      await chargedManagers.registerWalletManager('aave.B', ddAaveWalletManagerB.address)
    );

    await executeTx('3-h', 'AaveWalletManagerB: Registering ChargedSettings', async () =>
      await aaveWalletManagerB.setChargedSettings(ddChargedSettings.address)
    );

    // if (referralCode.length > 0) {
    //   await executeTx('3-i', 'AaveWalletManagerB: Setting Referral Code', async () =>
    //     await aaveWalletManagerB.setReferralCode(referralCode)
    //   );
    // }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Proton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (!afterUpgradesV2) {
      await executeTx('4-a', 'Proton: Registering Universe', async () =>
        await proton.setUniverse(ddUniverse.address)
      );

      await executeTx('4-b', 'Proton: Registering ChargedState', async () =>
        await proton.setChargedState(ddChargedState.address)
      );

      await executeTx('4-c', 'Proton: Registering ChargedSettings', async () =>
        await proton.setChargedSettings(ddChargedSettings.address)
      );

      await executeTx('4-d', 'Proton: Registering ChargedParticles', async () =>
        await proton.setChargedParticles(ddChargedParticles.address)
      );

      await executeTx('4-e', 'ChargedSettings: Enabling Proton for Charge', async () =>
        await chargedSettings.enableNftContracts([ddProton.address])
      );

      await executeTx('4-f', 'Universe: Registering Proton', async () =>
        await universe.setProtonToken(ddProton.address)
      );
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup ProtonB
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('4-a', 'ProtonB: Registering Universe', async () =>
      await protonB.setUniverse(ddUniverse.address)
    );

    await executeTx('4-b', 'ProtonB: Registering ChargedState', async () =>
      await protonB.setChargedState(ddChargedState.address)
    );

    await executeTx('4-c', 'ProtonB: Registering ChargedSettings', async () =>
      await protonB.setChargedSettings(ddChargedSettings.address)
    );

    await executeTx('4-d', 'ProtonB: Registering ChargedParticles', async () =>
      await protonB.setChargedParticles(ddChargedParticles.address)
    );

    await executeTx('4-e', 'ChargedSettings: Enabling Proton & ProtonB for Charge', async () =>
      await chargedSettings.enableNftContracts([ddProton.address, ddProtonB.address])
    );

    await executeTx('4-f', 'ProtonA: Unregistering Universe', async () =>
      await proton.setUniverse(ethers.constants.AddressZero)
    );

    await executeTx('4-g', 'Universe: Registering ProtonB', async () =>
      await universe.setProtonToken(ddProtonB.address)
    );

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Lepton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


    // !afterUpgradesV2 && await executeTx('5-a', 'Lepton: Setting Max Mint per Transaction', async () =>
    //   await lepton.setMaxMintPerTx(leptonMaxMint)
    // );

    // !afterUpgradesV2 && await executeTx('5-c', 'ChargedParticles: Registering Lepton', async () =>
    //   await chargedSettings.enableNftContracts([ddLepton.address])
    // );

    // !afterUpgradesV2 && await executeTx('5-d', 'Lepton: Unpausing', async () =>
    //   await lepton.setPausedState(false)
    // );

    // if (isHardhat) {
    //   let leptonType;
    //   for (let i = 0; i < presets.Lepton.types.length; i++) {
    //     leptonType = presets.Lepton.types[i];

    //     await executeTx(`5-e-${i}`, `Lepton: Adding Lepton Type: ${leptonType.name}`, async () =>
    //       await lepton.addLeptonType(
    //         leptonType.tokenUri,
    //         leptonType.price[chainId],
    //         leptonType.supply[chainId],
    //         leptonType.multiplier,
    //         leptonType.bonus,
    //       )
    //     );
    //   }
    // }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Ionx
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    !afterUpgradesV2 && await executeTx('6-a', 'Universe: Registering Ionx', async () =>
      await universe.setPhoton(ddIonx.address, ionxMaxSupply.div(2))
    );

    !afterUpgradesV2 && await executeTx('6-b', 'Ionx: Setting Minter', async () =>
      await ionx.setMinter(protocolOwner)
    );

    // let assetTokenId;
    // let assetTokenAddress;
    // let assetTokenMultiplier;
    // for (let i = 0; i < rewardsForAssetTokens.length; i++) {
    //   assetTokenId = rewardsForAssetTokens[i].assetTokenId;
    //   assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
    //   assetTokenMultiplier = rewardsForAssetTokens[i].multiplier;

    //   await executeTx(`6-c-${i}`, `Universe: Setting ESA Multiplier for Asset Token (${assetTokenAddress} = ${assetTokenMultiplier})`, async () =>
    //     await universe.setEsaMultiplier(assetTokenAddress, assetTokenMultiplier)
    //   );
    // }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Max Deposits
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // let assetTokenCap;
    // for (let i = 0; i < depositCaps.length; i++) {
    //   assetTokenId = depositCaps[i].assetTokenId;
    //   assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
    //   assetTokenCap = depositCaps[i].amount;

    //   await executeTx(`7-a-${i}`, `ChargedParticles: Setting Deposit Cap for Asset "${assetTokenId}" (${assetTokenAddress} = ${assetTokenCap})`, async () =>
    //     await chargedSettings.setDepositCap(assetTokenAddress, assetTokenCap)
    //   );
    // }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup GSN Trusted Forwarder
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // if (chainId !== 1) { // Delayed on Mainnet
    //   await executeTx('8-a', 'ChargedState: Set TrustedForwarder', async () =>
    //     await chargedState.setTrustedForwarder(trustedForwarder)
    //   );

    //   await executeTx('8-b', 'ChargedSettings: Set TrustedForwarder', async () =>
    //     await chargedSettings.setTrustedForwarder(trustedForwarder)
    //   );

    //   await executeTx('8-c', 'Proton: Set TrustedForwarder', async () =>
    //     await proton.setTrustedForwarder(trustedForwarder)
    //   );

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Lepton2
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    !afterUpgradesV2 && await executeTx('9-a', 'Lepton2: Setting Max Mint per Transaction', async () =>
      await lepton2.setMaxMintPerTx(leptonMaxMint)
    );

    await executeTx('9-b', 'ChargedParticles: Registering Lepton2', async () =>
      await chargedParticles.setController(ddLepton2.address, 'leptons')
    );

    await executeTx('9-c', 'ChargedParticles: Enabling Lepton2', async () =>
      await chargedSettings.enableNftContracts([ddLepton2.address])
    );

    if (!afterUpgradesV2) {
      let useChainId = parseInt(chainId, 10);
      if (useChainId === 80001) { useChainId = 42; }
      if (useChainId === 137) { useChainId = 1; }

      // let lepton2Type;
      for (let i = 0; i < presets.Lepton.types.length; i++) {
        lepton2Type = presets.Lepton.types[i];

        await executeTx(`9-d-${i}`, `Lepton2: Adding Lepton Type: ${lepton2Type.name}`, async () =>
          await lepton2.addLeptonType(
            lepton2Type.tokenUri,
            lepton2Type.price[useChainId],
            lepton2Type.supply[useChainId],
            lepton2Type.multiplier,
            lepton2Type.bonus,
          )
        );
      }
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup External Executors
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('10-a', 'Generic Wallet Manager "B": Registering Executor', async () =>
      await genericWalletManagerB.setExecutor(ddParticleSplitter.address)
    );

    await executeTx('10-b', 'Generic Basket Manager "B": Registering Executor', async () =>
      await genericBasketManagerB.setExecutor(ddParticleSplitter.address)
    );

    await executeTx('10-c', 'Aave Wallet Manager "B": Registering Executor', async () =>
      await aaveWalletManagerB.setExecutor(ddParticleSplitter.address)
    );



    log(`\n  Contract Initialization Complete!`);
    const gasCosts = getAccumulatedGasCost();
    log('     - Total Gas Cost');
    log('       @ 10 gwei:  ', gasCosts[1]);
    log('       @ 100 gwei: ', gasCosts[2]);
    log('       @ 150 gwei: ', gasCosts[3]);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};
