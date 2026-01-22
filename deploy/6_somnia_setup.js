const {
  getDeployData,
} = require('../js-helpers/deploy');

const {
  executeTx,
} = require('../js-helpers/executeTx');

const {
  log,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const network = await hre.network;
    const chainId = chainIdByName(network.name);

    const ddUniverse = getDeployData('Universe', chainId);
    const ddChargedState = getDeployData('ChargedState', chainId);
    const ddChargedSettings = getDeployData('ChargedSettings', chainId);
    const ddChargedManagers = getDeployData('ChargedManagers', chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddTokenInfoProxy = getDeployData('TokenInfoProxy', chainId);
    const ddGenericWalletManager = getDeployData('GenericWalletManager', chainId);
    const ddGenericWalletManagerB = getDeployData('GenericWalletManagerB', chainId);
    const ddGenericBasketManager = getDeployData('GenericBasketManager', chainId);
    const ddGenericBasketManagerB = getDeployData('GenericBasketManagerB', chainId);

    log(`\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
    log(`Charged Particles: Somnia Custom Setup`);
    log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n`);

    log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log(' ');

    // Load Contracts
    const Universe = await ethers.getContractFactory('Universe');
    const universe = await Universe.attach(ddUniverse.address);

    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    const ChargedState = await ethers.getContractFactory('ChargedState');
    const chargedState = await ChargedState.attach(ddChargedState.address);

    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

    const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
    const chargedManagers = await ChargedManagers.attach(ddChargedManagers.address);

    const GenericWalletManager = await ethers.getContractFactory('GenericWalletManager');
    const genericWalletManager = await GenericWalletManager.attach(ddGenericWalletManager.address);

    const GenericWalletManagerB = await ethers.getContractFactory('GenericWalletManagerB');
    const genericWalletManagerB = await GenericWalletManagerB.attach(ddGenericWalletManagerB.address);

    const GenericBasketManager = await ethers.getContractFactory('GenericBasketManager');
    const genericBasketManager = await GenericBasketManager.attach(ddGenericBasketManager.address);

    const GenericBasketManagerB = await ethers.getContractFactory('GenericBasketManagerB');
    const genericBasketManagerB = await GenericBasketManagerB.attach(ddGenericBasketManagerB.address);

    // --- Core Protocol Configuration ---
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

    // --- Generic Managers Configuration ---
    await executeTx('2-a', 'GenericWalletManager: Setting Charged Particles as Controller', async () =>
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
    await executeTx('2-e', 'GenericBasketManager: Setting Charged Particles as Controller', async () =>
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

    log('\\n  Somnia Custom Setup Complete!');
};

module.exports.tags = ['somnia-setup'];