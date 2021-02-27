const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  log
} = require("../js-helpers/deploy");

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, upgrades, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {};

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 3 : 1);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Deploying Treasury...');
    const Treasury = await ethers.getContractFactory('Treasury');
    const TreasuryInstance = await Treasury.deploy();
    const treasury = await TreasuryInstance.deployed();
    deployData['Treasury'] = {
      abi: getContractAbi('Treasury'),
      address: treasury.address,
      deployTransaction: treasury.deployTransaction,
    }

    log('  Deploying Universe...');
    const Universe = await ethers.getContractFactory('Universe');
    const UniverseInstance = await upgrades.deployProxy(Universe, []);
    const universe = await UniverseInstance.deployed();
    deployData['Universe'] = {
      abi: getContractAbi('Universe'),
      address: universe.address,
      deployTransaction: universe.deployTransaction,
    }

    await log('  Deploying ChargedState...')(alchemyTimeout);
    const ChargedState = await hre.ethers.getContractFactory('ChargedState');
    const ChargedStateInstance = await ChargedState.deploy();
    const chargedState = await ChargedStateInstance.deployed();
    deployData['ChargedState'] = {
      abi: getContractAbi('ChargedState'),
      address: chargedState.address,
      deployTransaction: chargedState.deployTransaction,
    }

    await log('  Deploying ChargedSettings...')(alchemyTimeout);
    const ChargedSettings = await hre.ethers.getContractFactory('ChargedSettings');
    const ChargedSettingsInstance = await ChargedSettings.deploy();
    const chargedSettings = await ChargedSettingsInstance.deployed();
    deployData['ChargedSettings'] = {
      abi: getContractAbi('ChargedSettings'),
      address: chargedSettings.address,
      deployTransaction: chargedSettings.deployTransaction,
    }

    await log('  Deploying ChargedParticles...')(alchemyTimeout);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [trustedForwarder], { unsafeAllowCustomTypes: true });
    const chargedParticles = await ChargedParticlesInstance.deployed();
    deployData['ChargedParticles'] = {
      abi: getContractAbi('ChargedParticles'),
      address: chargedParticles.address,
      deployTransaction: chargedParticles.deployTransaction,
    }

    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - Treasury:         ', treasury.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: treasury.deployTransaction }));
    log('  - Universe:         ', universe.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
    log('  - ChargedState:     ', chargedState.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedState.deployTransaction }));
    log('  - ChargedSettings:  ', chargedSettings.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedSettings.deployTransaction }));
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployments" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['protocol']
