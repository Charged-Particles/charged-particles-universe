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
    "0x04d572734006788B646ce35b133Bdf7160f79995", // Proton B
    // "0x929167191ca41a4753eda357bb6e5ad6f15fb89b", // Trism Originals
    // "0xd86898728aa9921101515a38b7d15d16c682e8ce", // Trism Vaults
    // "0xc0cb81c1f89ab0873653f67eea42652f13cd8416", // Lobby Lobsters
    // "0xcd2ba94e435e536dc48648eab2f4f1db257bc64c", // Particlon
    // "0xd07dc4262bcdbf85190c01c996b4c06a461d2430", // Rarible RARI
    "0xB66a603f4cFe17e3D27B87a8BfCaD319856518B8", // Rarible ERC1155
    "0xd07dc4262bcdbf85190c01c996b4c06a461d2430", // Rarible ERC1155
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
  '42': [
    "0xAEdEDf4A27d4Ea6f658b5F69F70a72d12BDeb937", // Proton
    "0xEDa5dA03bB30f7137F00787edAee84ae4fD54905", // Proton
    "0xfb6075A3f960DBcd28Ae4Bb45092ce33D2909060", // Proton
    "0xd1bCe91a13089b1f3178487aB8d0d2Ae191C1963", // Proton B
    "0x1554b19E1eD9FE78F375AC7c8F63Fe9E85d15a16", // Proton B
    "0x517fEfB53b58Ec8764ca885731Db20Ca2dcac7b7", // Proton B
    "0xF0e4ed501ED7d960886e3f9E8d569e1a1253Eb53", // Proton B
    "0xef815ad5401cee4b8b2e6bc2f8c481d84e5d0871", // External NFT Example Contract
  ],
  '137': [
    "0x4ed360c8725d3a63f564f8484a582d0a7cecea7a", // Lepton 2
    "0xe2a9b15e283456894246499fb912cce717f83319", // Proton
    "0x1CeFb0E1EC36c7971bed1D64291fc16a145F35DC", // Proton B
  ],
  '80001': [
    "0xd02cB38f5D68333219d32Ea2a08c3BCdC92753F2", // Proton
    "0xd04f13d02ea469dfF7eEce1b1aE0Ca234837DB38", // Proton B
    "0xbc7895fa82a2e5c575b8105f62d2e57d53b6e75c", // External NFT Example Contract
    "0x865Bd661EEFE49C4Ebd096e87720528C12959Ab9", // Moda Dropcase NFT (DropCase)
  ]
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
    const ddProton = getDeployData('Proton', chainId);
    const ddProtonB = getDeployData('ProtonB', chainId);
    const ddLepton = getDeployData('Lepton', chainId);
    const ddExternalERC721 = getDeployData('ExternalERC721', chainId);

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

    if (chainId === 31337) {
      _WHITELISTED_CONTRACTS['31337'] = [
        ddProton.address,
        ddProtonB.address,
        ddLepton.address,
        ddExternalERC721.address,
      ];
    }


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
