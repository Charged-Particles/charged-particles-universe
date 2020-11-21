const { chainName, getContractAbi, getDeployData, getTxGasCost, presets, saveDeploymentData } = require("../js-utils/deploy-helpers");
const { sleep } = require("sleep");

module.exports = async (hre) => {

    let alchemyTimeout = 1;

    const { deployer, protocolOwner, trustedForwarder } = await hre.getNamedAccounts();
    const network = await hre.network;
    const log = console.log;

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles NFT: Proton - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainName(network.config.chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    const ddChargedParticles = getDeployData('ChargedParticles', network.config.chainId);

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    sleep(alchemyTimeout);

    log('\n  Deploying Proton NFT...');
    const Proton = await hre.ethers.getContractFactory('Proton');
    const ProtonInstance = await Proton.deploy();
    const proton = await ProtonInstance.deployed();

    sleep(alchemyTimeout);

    log('  - Registering ChargedParticles with Proton...');
    await proton.setChargedParticles(ddChargedParticles.address);

    sleep(alchemyTimeout);

    log('  - Registering Proton with ChargedParticles...');
    await chargedParticles.updateWhitelist(proton.address, true);

    sleep(alchemyTimeout);

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:');
    log('  - Proton:      ', proton.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));

    saveDeploymentData(network.config.chainId, {'Proton': {
        abi: getContractAbi('Proton'),
        address: proton.address,
        deployTransaction: proton.deployTransaction
    }});

    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

}