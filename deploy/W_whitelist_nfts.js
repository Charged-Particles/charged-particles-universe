const {
  getDeployData,
} = require('../js-helpers/deploy');

const {
  executeTx,
} = require('../js-helpers/executeTx');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');


const _WHITELISTED_CONTRACTS = {
  '1': [
    // "0x3cd2410eaa9c2dce50af6ccab72dc93879a09c1f", // Lepton 2
    // "0x63174fa9680c674a5580f7d747832b2a2133ad8f", // Proton
    // "0x929167191ca41a4753eda357bb6e5ad6f15fb89b", // Trism Originals
    // "0xd86898728aa9921101515a38b7d15d16c682e8ce", // Trism Vaults
    // "0xc0cb81c1f89ab0873653f67eea42652f13cd8416", // Lobby Lobsters
    // "0xcd2ba94e435e536dc48648eab2f4f1db257bc64c", // Particlon
    // "0xd07dc4262bcdbf85190c01c996b4c06a461d2430", // Rarible
    // "0xdfe3ac769b2d8e382cb86143e0b0b497e1ed5447", // Pluto
    // "0x2D92C4f9F75308d0b9b098B142369032E4f901Ff", // Floor Gen 3
    // "0xCcc441ac31f02cD96C153DB6fd5Fe0a2F4e6A68d", // FLUF
    // "0x60E4d786628Fea6478F785A6d7e704777c86a7c6", // Mutant Apes
    // "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", // Doodle
    // "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // Bored Apes
    // "0x23581767a106ae21c074b2276D25e5C3e136a68b", // MoonBirds
    // "0xD2A077Ec359D94E0A0b7E84435eaCB40A67a817c", // Admit One
    // "0x1cBB182322Aee8ce9F4F1f98d7460173ee30Af1F", // Polymorph
    // "0x76236B6f13F687D0bbeDbbCe0e30e9F07d071C1C", // RealVision Pro
    // "0xc36cb218848F173148ff55f4dfC18f1540FB7475", // Mango's Blue Chips
  ],
  '137': [
    // "0x4ed360c8725d3a63f564f8484a582d0a7cecea7a",
    // "0xe2a9b15e283456894246499fb912cce717f83319",
  ],
  '80001': [
    // "0x865Bd661EEFE49C4Ebd096e87720528C12959Ab9",
  ],
};


module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);

    // if (chainId !== 42) { return; } // Kovan only

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
    // Enable Contracts for Charging
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (_WHITELISTED_CONTRACTS[chainId].length) {
      await executeTx('1-a', `ChargedSettings: Enabling ${_WHITELISTED_CONTRACTS[chainId].length} Contracts for Chain ID: ${chainId}`, async () =>
        await chargedSettings.enableNftContracts(_WHITELISTED_CONTRACTS[chainId])
      );
    }

    // await executeTx('1-a', `ChargedSettings: Enabling External NFT for "crypto-j-42"`, async () =>
    //   await chargedSettings.enableNftContracts(['0x9C97e093A01061C7FDc7ED6c1eeCA0C20C3d294F'])
    // );




    log(`\n  Contract Initialization Complete!`);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['whitelist-nfts'];
