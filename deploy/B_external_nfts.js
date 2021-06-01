const {
  getDeployData,
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
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 7);

    if (chainId !== 42) { return; } // Kovan only

    const executeTx = async (txId, txDesc, callback, increaseDelay = 0) => {
      try {
        if (txId === '1-a') {
          log(`\n`);
        }
        await log(`  - [TX-${txId}] ${txDesc}`)(alchemyTimeout + increaseDelay);
        await callback();
      }
      catch (err) {
        log(`  - Transaction ${txId} Failed: ${err}`);
        log(`  - Retrying;`);
        await executeTx(txId, txDesc, callback, 3);
      }
    }

    const ddChargedSettings = getDeployData('ChargedSettings', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - External NFTs');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log(' ');

    log('  Loading ChargedSettings from: ', ddChargedSettings.address);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Setup Proton
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // await executeTx('1-a', `ChargedSettings: Enabling External NFT for "blobwatanabe"`, async () =>
    //   await chargedSettings.enableNftContracts(['0x36DF5DFe089765c59A8a80527A1Ff1Aae0Af3f99'])
    // );

    // await executeTx('1-a', `ChargedSettings: Enabling External NFT for "crypto-j-42"`, async () =>
    //   await chargedSettings.enableNftContracts(['0x9C97e093A01061C7FDc7ED6c1eeCA0C20C3d294F'])
    // );




    log(`\n  Contract Initialization Complete!`);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['external-nfts'];
