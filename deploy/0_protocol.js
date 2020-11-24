const { chainName, getContractAbi, getTxGasCost, presets, saveDeploymentData } = require("../js-utils/deploy-helpers");
const { sleep } = require("sleep");

module.exports = async (hre) => {

    let alchemyTimeout = 1;

    const { deployer, protocolOwner, trustedForwarder } = await hre.getNamedAccounts();
    const network = await hre.network;
    const log = console.log;

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
    const Universe = await hre.ethers.getContractFactory('Universe');
    universe = await hre.upgrades.deployProxy(Universe, [], { initializer: 'initialize' });
    await universe.deployed();
    // let universe = await hre.deployments.deploy('Universe', {
    //     from: protocolOwner,
    //     proxy: {
    //       methodName: 'initialize',
    //     },
    //     args: []
    //   });

    sleep(alchemyTimeout);

    log('  Deploying ChargedParticles...');
    const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
    chargedParticles = await hre.upgrades.deployProxy(ChargedParticles, [trustedForwarder], { initializer: 'initialize' });
    await chargedParticles.deployed();
    // let chargedParticles = await hre.deployments.deploy('ChargedParticles', {
    //     from: protocolOwner,
    //     proxy: {
    //       methodName: 'initialize',
    //     },
    //     args: [trustedForwarder]
    //   });

    sleep(alchemyTimeout);

    log('  - Registering ChargedParticles with Universe...');
    await universe.setChargedParticles(chargedParticles.address);

    sleep(alchemyTimeout);

    log('  - Registering Universe with ChargedParticles...');
    await chargedParticles.setUniverse(universe.address);

    sleep(alchemyTimeout);

    log('  - Setting Deposit Fee...');
    await chargedParticles.setDepositFee(presets.ChargedParticles.fees.deposit);

    sleep(alchemyTimeout);

    // log(`  Transferring Contract Ownership to '${owner}'...`);
    // await universe.transferOwnership(owner);
    // await chargedParticles.transferOwnership(owner);

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:');
    log('  - Universe:         ', universe.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
    log('  - ChargedParticles: ', chargedParticles.address);
    log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));

    saveDeploymentData(network.config.chainId, { 'Universe': { abi: getContractAbi('Universe'), address: universe.address, deployTransaction: universe.deployTransaction }});
    saveDeploymentData(network.config.chainId, { 'ChargedParticles': { abi: getContractAbi('ChargedParticles'), address: chargedParticles.address, deployTransaction: chargedParticles.deployTransaction }});

    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['protocol']
