const {
  chainNameById,
  chainIdByName,
  getDeployData,
  log,
  toBN,
  presets,
} = require("../js-helpers/deploy");

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 5);

    const executeTx = async (txId, txDesc, callback = _.noop, increaseDelay = 0) => {
      if (txId === '1-a') {
        log(`\n`);
      }
      await log(`  - [TX-${txId}] ${txDesc}`)(alchemyTimeout + increaseDelay);
      callback().catch(async err => {
        log(`  - Transaction ${txId} Failed: ${err}`);
        log(`  - Retrying;`);
        await executeTx(txId, txDesc, callback, 3);
      });
    }

    const referralCode = presets.Aave.referralCode[chainId];
    const photonMaxSupply = presets.Photon.universeMaxSupply;
    const leptonMaxMint = presets.Lepton.maxMintPerTx;
    const depositCaps = presets.ChargedParticles.maxDeposits;
    const rewardsForAssetTokens = presets.Photon.rewardsForAssetTokens;
    const tempLockExpiryBlocks = presets.ChargedParticles.tempLockExpiryBlocks;

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedState = getDeployData('ChargedState', chainId);
    const ddChargedSettings = getDeployData('ChargedSettings', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
    const ddWBoson = getDeployData('WBoson', chainId);
    const ddProton = getDeployData('Proton', chainId);
    const ddLepton = getDeployData('Lepton', chainId);
    // const ddPhoton = getDeployData('Photon', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Loading Universe from: ', ddUniverse.address);
    const Universe = await ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    log('  Loading ChargedState from: ', ddChargedState.address);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const chargedState = await ChargedState.attach(ddChargedState.address);

    log('  Loading ChargedSettings from: ', ddChargedSettings.address);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

    log('  Loading GenericWalletManager from: ', ddGenericWalletManager.address);
    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const genericWalletManager = await GenericWalletManager.attach(ddGenericWalletManager.address);

    log('  Loading GenericBasketManager from: ', ddGenericBasketManager.address);
    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const genericBasketManager = await GenericBasketManager.attach(ddGenericBasketManager.address);

    log('  Loading AaveWalletManager from: ', ddAaveWalletManager.address);
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

    log('  Loading WBoson from: ', ddWBoson.address);
    const WBoson = await ethers.getContractFactory('WBoson');
    const wBoson = await WBoson.attach(ddWBoson.address);

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading Lepton from: ', ddLepton.address);
    const Lepton = await ethers.getContractFactory('Lepton');
    const lepton = await Lepton.attach(ddLepton.address);

    log('  Loading Photon from: ', ddPhoton.address);
    const Photon = await ethers.getContractFactory('Photon');
    const photon = await Photon.attach(ddPhoton.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Charged Particles & Universe
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('1-a', 'Universe: Registering ChargedParticles at: ' + ddChargedParticles.address, async () =>
      await universe.setChargedParticles(ddChargedParticles.address)
    );

    await executeTx('1-b', 'ChargedParticles: Registering Universe', async () =>
      await chargedParticles.setUniverse(ddUniverse.address)
    );

    await executeTx('1-c', 'ChargedParticles: Registering ChargedState', async () =>
      await chargedParticles.setChargedState(ddChargedState.address)
    );

    await executeTx('1-d', 'ChargedParticles: Registering ChargedSettings', async () =>
      await chargedParticles.setChargedSettings(ddChargedSettings.address)
    );

    await executeTx('1-e', 'ChargedParticles: Registering Lepton', async () =>
      await chargedParticles.setLeptonToken(ddLepton.address)
    );

    await executeTx('1-f', 'ChargedState: Registering ChargedSettings', async () =>
      await chargedState.setChargedSettings(ddChargedSettings.address)
    );

    await executeTx('1-g', 'ChargedParticles: Setting Temp-Lock Expiry Blocks', async () =>
      await chargedSettings.setTempLockExpiryBlocks(tempLockExpiryBlocks)
    );


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Generic Wallet Managers
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('2-a', 'GenericWalletManager: Setting Charged Particles as Controller', async () =>
      await genericWalletManager.setController(ddChargedParticles.address)
    );

    await executeTx('2-b', 'GenericWalletManager: Registering Generic Wallet Manager with ChargedParticles', async () =>
      await chargedSettings.registerWalletManager('generic', ddGenericWalletManager.address)
    );

    await executeTx('2-c', 'GenericBasketManager: Setting Charged Particles as Controller', async () =>
      await genericBasketManager.setController(ddChargedParticles.address)
    );

    await executeTx('2-d', 'GenericBasketManager: Registering Generic Basket Manager with ChargedParticles', async () =>
      await chargedSettings.registerBasketManager('generic', ddGenericBasketManager.address)
    );


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Aave Wallet Manager
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('3-a', 'AaveWalletManager: Setting Charged Particles as Controller', async () =>
      await aaveWalletManager.setController(ddChargedParticles.address)
    );

    await executeTx('3-b', 'AaveWalletManager: Setting Aave Bridge to V2', async () =>
      await aaveWalletManager.setAaveBridge(ddAaveBridgeV2.address)
    );

    await executeTx('3-c', 'AaveWalletManager: Registering Aave as LP with ChargedParticles', async () =>
      await chargedSettings.registerWalletManager('aave', ddAaveWalletManager.address)
    );

    if (referralCode.length > 0) {
      await executeTx('3-d', 'AaveWalletManager: Setting Referral Code', async () =>
        await aaveWalletManager.setReferralCode(referralCode)
      );
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Proton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Lepton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await executeTx('5-a', 'Lepton: Setting Max Mint per Transaction', async () =>
      await lepton.setMaxMintPerTx(leptonMaxMint)
    );

    await executeTx('5-b', 'Universe: Registering Lepton', async () =>
      await universe.setLeptonToken(ddLepton.address)
    );

    await executeTx('5-c', 'ChargedParticles: Registering Lepton', async () =>
      await chargedSettings.enableNftContracts([ddProton.address, ddLepton.address])
    );

    let leptonType;
    for (let i = 0; i < presets.Lepton.types.length; i++) {
      leptonType = presets.Lepton.types[i];

      await executeTx(`5-d-${i}`, `Lepton: Adding Lepton Type: ${leptonType.name}`, async () =>
        await lepton.addLeptonType(
          leptonType.tokenUri,
          leptonType.price,
          leptonType.supply,
          leptonType.multiplier,
          leptonType.bonus,
        )
      );
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Photon
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (chainId !== 1) { // Delayed on Mainnet
      await executeTx('6-a', 'Photon: Registering Universe', async () =>
        await photon.setUniverse(ddUniverse.address)
      );

      await executeTx('6-b', 'Universe: Registering Photon', async () =>
        await universe.setPhoton(ddPhoton.address, photonMaxSupply)
      );

      let assetTokenId;
      let assetTokenAddress;
      let assetTokenMultiplier;
      for (let i = 0; i < rewardsForAssetTokens.length; i++) {
        assetTokenId = rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
        assetTokenMultiplier = rewardsForAssetTokens[i].multiplier;

        await executeTx(`6-c-${i}`, `Universe: Setting ESA Multiplier for Asset Token (${assetTokenAddress} = ${assetTokenMultiplier})`, async () =>
          await universe.setEsaMultiplier(assetTokenAddress, assetTokenMultiplier)
        );
      }
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Max Deposits
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    let assetTokenCap;
    for (let i = 0; i < depositCaps.length; i++) {
      assetTokenId = depositCaps[i].assetTokenId;
      assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
      assetTokenCap = depositCaps[i].amount;

      await executeTx(`7-a-${i}`, `ChargedParticles: Setting Deposit Cap for Asset "${assetTokenId}" (${assetTokenAddress} = ${assetTokenCap})`, async () =>
        await chargedSettings.setDepositCap(assetTokenAddress, assetTokenCap)
      );
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup GSN Trusted Forwarder
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (chainId !== 1) { // Delayed on Mainnet
      await executeTx('8-a', 'ChargedState: Set TrustedForwarder', async () =>
        await chargedState.setTrustedForwarder(trustedForwarder)
      );

      await executeTx('8-b', 'ChargedSettings: Set TrustedForwarder', async () =>
        await chargedSettings.setTrustedForwarder(trustedForwarder)
      );

      await executeTx('8-c', 'Proton: Set TrustedForwarder', async () =>
        await proton.setTrustedForwarder(trustedForwarder)
      );

      await executeTx('8-d', 'WBoson: Set TrustedForwarder', async () =>
        await wBoson.setTrustedForwarder(trustedForwarder)
      );
    }


    log(`\n  Contract Initialization Complete!`);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['setup'];
