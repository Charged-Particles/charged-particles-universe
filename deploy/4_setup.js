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
    const alchemyTimeout = chainId === 31337 ? 0 : 5;

    const lendingPoolProviderV1 = presets.Aave.v1.lendingPoolProvider[chainId];
    const lendingPoolProviderV2 = presets.Aave.v2.lendingPoolProvider[chainId];
    const referralCode = presets.Aave.referralCode[chainId];
    const ionMaxSupply = presets.Ion.universeMaxSupply;
    const leptonMaxMint = presets.Lepton.maxMintPerTx;
    const depositCap = presets.ChargedParticles.maxDeposit;
    const tempLockExpiryBlocks = presets.ChargedParticles.tempLockExpiryBlocks;

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedState = getDeployData('ChargedState', chainId);
    const ddChargedSettings = getDeployData('ChargedSettings', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddAaveWalletManager = getDeployData('AaveWalletManager', chainId);
    const ddAaveBridgeV1 = getDeployData('AaveBridgeV1', chainId);
    const ddAaveBridgeV2 = getDeployData('AaveBridgeV2', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
    const ddPhoton = getDeployData('Photon', chainId);
    const ddProton = getDeployData('Proton', chainId);
    const ddLepton = getDeployData('Lepton', chainId);
    const ddIon = getDeployData('Ion', chainId);

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

    log('  Loading ChargedState from: ', ddChargedState.address);
    const ChargedState = await ethers.getContractFactory('ChargedState');
    const chargedState = await ChargedState.attach(ddChargedState.address);

    log('  Loading ChargedSettings from: ', ddChargedSettings.address);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    log('  Loading AaveWalletManager from: ', ddAaveWalletManager.address);
    const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
    const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

    log('  Loading GenericWalletManager from: ', ddGenericWalletManager.address);
    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const genericWalletManager = await GenericWalletManager.attach(ddGenericWalletManager.address);

    log('  Loading GenericBasketManager from: ', ddGenericBasketManager.address);
    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const genericBasketManager = await GenericBasketManager.attach(ddGenericBasketManager.address);

    log('  Loading Photon from: ', ddPhoton.address);
    const Photon = await ethers.getContractFactory('Photon');
    const photon = await Photon.attach(ddPhoton.address);

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading Lepton from: ', ddLepton.address);
    const Lepton = await ethers.getContractFactory('Lepton');
    const lepton = await Lepton.attach(ddLepton.address);

    log('  Loading Ion from: ', ddIon.address);
    const Ion = await ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address);

    let txCount = 1;

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Charged Particles & Universe
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`\n  - [TX-${txCount++}] Universe: Registering ChargedParticles`)(alchemyTimeout);
    await universe.setChargedParticles(ddChargedParticles.address);

    await log(`  - [TX-${txCount++}] ChargedParticles: Registering Universe`)(alchemyTimeout);
    await chargedParticles.setUniverse(ddUniverse.address);

    await log(`  - [TX-${txCount++}] ChargedState: Registering ChargedSettings`)(alchemyTimeout);
    await chargedState.setChargedSettings(ddChargedSettings.address);

    await log(`  - [TX-${txCount++}] ChargedParticles: Registering ChargedState`)(alchemyTimeout);
    await chargedParticles.setChargedState(ddChargedState.address);

    await log(`  - [TX-${txCount++}] ChargedParticles: Registering ChargedSettings`)(alchemyTimeout);
    await chargedParticles.setChargedSettings(ddChargedSettings.address);

    await log(`  - [TX-${txCount++}] ChargedParticles: Setting Deposit Cap`)(alchemyTimeout);
    await chargedSettings.setDepositCap(depositCap);

    await log(`  - [TX-${txCount++}] ChargedParticles: Setting Temp-Lock Expiry Blocks`)(alchemyTimeout);
    await chargedSettings.setTempLockExpiryBlocks(tempLockExpiryBlocks);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Generic Wallet Managers
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`  - [TX-${txCount++}] GenericWalletManager: Setting Charged Particles as Controller`)(alchemyTimeout);
    await genericWalletManager.setController(ddChargedParticles.address);

    await log(`  - [TX-${txCount++}] GenericWalletManager: Registering Generic Wallet Manager with ChargedParticles`)(alchemyTimeout);
    await chargedSettings.registerWalletManager('generic', ddGenericWalletManager.address);

    await log(`  - [TX-${txCount++}] GenericBasketManager: Setting Charged Particles as Controller`)(alchemyTimeout);
    await genericBasketManager.setController(ddChargedParticles.address);

    await log(`  - [TX-${txCount++}] GenericBasketManager: Registering Generic Basket Manager with ChargedParticles`)(alchemyTimeout);
    await chargedSettings.registerBasketManager('generic', ddGenericBasketManager.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Aave Wallet Manager
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`  - [TX-${txCount++}] AaveWalletManager: Setting Charged Particles as Controller`)(alchemyTimeout);
    await aaveWalletManager.setController(ddChargedParticles.address);

    if (lendingPoolProviderV2.length > 0) {
      await log(`  - [TX-${txCount++}] AaveWalletManager: Setting Aave Bridge to V2`)(alchemyTimeout);
      await aaveWalletManager.setAaveBridge(ddAaveBridgeV2.address);
    } else {
      if (lendingPoolProviderV1.length > 0) {
        await log(`  - [TX-${txCount++}] AaveWalletManager: Setting Aave Bridge to V1`)(alchemyTimeout);
        await aaveWalletManager.setAaveBridge(ddAaveBridgeV1.address);
      } else {
        await log(`  - AaveWalletManager: NO Aave Bridge Available!!!`);
      }
    }

    if (referralCode.length > 0) {
      await log(`  - [TX-${txCount++}] AaveWalletManager: Setting Referral Code`)(alchemyTimeout);
      await aaveWalletManager.setReferralCode(referralCode);
    }

    await log(`  - [TX-${txCount++}] AaveWalletManager: Registering Aave as LP with ChargedParticles`)(alchemyTimeout);
    await chargedSettings.registerWalletManager('aave', ddAaveWalletManager.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Proton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`  - [TX-${txCount++}] Proton: Registering Universe`)(alchemyTimeout);
    await proton.setUniverse(ddUniverse.address);

    await log(`  - [TX-${txCount++}] Proton: Registering ChargedSettings`)(alchemyTimeout);
    await proton.setChargedSettings(ddChargedSettings.address);

    await log(`  - [TX-${txCount++}] Proton: Registering ChargedParticles`)(alchemyTimeout);
    await proton.setChargedParticles(ddChargedParticles.address);

    await log(`  - [TX-${txCount++}] ChargedSettings: Enabling Proton for Charge`)(alchemyTimeout);
    await chargedSettings.enableNftContracts([ddProton.address]);

    await log(`  - [TX-${txCount++}] Universe: Registering Proton`)(alchemyTimeout);
    await universe.setProtonToken(ddProton.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Lepton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`  - [TX-${txCount++}] Lepton: Setting Max Mint per Transaction`)(alchemyTimeout);
    await lepton.setMaxMintPerTx(leptonMaxMint);

    await log(`  - [TX-${txCount++}] Universe: Registering Lepton`)(alchemyTimeout);
    await universe.setLeptonToken(ddLepton.address);

    await log(`  - [TX-${txCount++}] ChargedParticles: Setting Max Leptons per Proton`)(alchemyTimeout);
    await chargedSettings.setMaxNfts(ddProton.address, ddLepton.address, toBN('1'));

    let leptonType;
    for (let i = 0; i < presets.Lepton.types.length; i++) {
      leptonType = presets.Lepton.types[i];

      await log(`  - [TX-${txCount++}] Lepton: Adding Lepton Type: ${leptonType.name}`)(alchemyTimeout);
      await lepton.addLeptonType(
        leptonType.tokenUri,
        leptonType.price,
        leptonType.supply,
        leptonType.multiplier,
        leptonType.bonus,
      );
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Ion
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    await log(`  - [TX-${txCount++}] Ion: Registering Universe`)(alchemyTimeout);
    await ion.setUniverse(ddUniverse.address);

    await log(`  - [TX-${txCount++}] Universe: Registering Ion`)(alchemyTimeout);
    await universe.setCation(ddIon.address, ionMaxSupply);

    let assetTokenId;
    let assetTokenAddress;
    let assetTokenMultiplier;
    for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
        assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = _.get(presets, assetTokenId, {})[chainId];
        assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

        await log(`  - [TX-${txCount++}] Universe: Setting ESA Multiplier for Asset Token: `, assetTokenAddress, ` to: `, assetTokenMultiplier)(alchemyTimeout);
        await universe.setEsaMultiplier(assetTokenAddress, assetTokenMultiplier);
    }


    await log(`\n  Contract Initialization Complete!`)(alchemyTimeout);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['setup']
