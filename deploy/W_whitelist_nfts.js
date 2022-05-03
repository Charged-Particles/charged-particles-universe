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
    "0x3cd2410eaa9c2dce50af6ccab72dc93879a09c1f",
    "0x63174fa9680c674a5580f7d747832b2a2133ad8f",
    "0x929167191ca41a4753eda357bb6e5ad6f15fb89b",
    "0xc0cb81c1f89ab0873653f67eea42652f13cd8416",
    "0xccc441ac31f02cd96c153db6fd5fe0a2f4e6a68d",
    "0xcd2ba94e435e536dc48648eab2f4f1db257bc64c",
    "0xd07dc4262bcdbf85190c01c996b4c06a461d2430",
    "0xd86898728aa9921101515a38b7d15d16c682e8ce",
    "0xdfe3ac769b2d8e382cb86143e0b0b497e1ed5447",
  ],
  '137': [
    "0x4ed360c8725d3a63f564f8484a582d0a7cecea7a",
    "0xe2a9b15e283456894246499fb912cce717f83319",
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
