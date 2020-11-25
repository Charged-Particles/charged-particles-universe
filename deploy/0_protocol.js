const {
  chainName,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  log,
  presets,
} = require("../js-utils/deploy-helpers");

module.exports = async (hre) => {
    const { ethers, upgrades, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 1;
    const deployData = {};

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainName(network.config.chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Deploying Universe...');
    const Universe = await ethers.getContractFactory('Universe');
    const UniverseInstance = await upgrades.deployProxy(Universe, []);
    const universe = await UniverseInstance.deployed();
    deployData['Universe'] = {
      abi: getContractAbi('Universe'),
      address: universe.address,
      deployTransaction: universe.deployTransaction,
    }

    log('  Deploying ChargedParticles...')(alchemyTimeout);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [trustedForwarder]);
    const chargedParticles = await ChargedParticlesInstance.deployed();
    deployData['ChargedParticles'] = {
      abi: getContractAbi('ChargedParticles'),
      address: chargedParticles.address,
      deployTransaction: chargedParticles.deployTransaction,
    }

    log('  - Registering ChargedParticles with Universe...')(alchemyTimeout);
    await universe.setChargedParticles(chargedParticles.address);

    log('  - Registering Universe with ChargedParticles...')(alchemyTimeout);
    await chargedParticles.setUniverse(universe.address);

    log('  - Setting Deposit Fee...')(alchemyTimeout);
    await chargedParticles.setDepositFee(presets.ChargedParticles.fees.deposit);

    // log(`  Transferring Contract Ownership to '${owner}'...`)(alchemyTimeout);
    // await universe.transferOwnership(owner);
    // await chargedParticles.transferOwnership(owner);

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - Universe:         ', universe.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));

    saveDeploymentData(network.config.chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['protocol']
