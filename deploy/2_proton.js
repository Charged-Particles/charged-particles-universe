const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  log,
  presets,
} = require("../js-utils/deploy-helpers");

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 1;
    const deployData = {};

    const chainId = chainIdByName(network.name);
    const mintFee = presets.Proton.mintFee;

    const ddChargedParticles = getDeployData('ChargedParticles', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles NFT: Proton - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    log('\n  Deploying Proton NFT...')(alchemyTimeout);
    const Proton = await ethers.getContractFactory('Proton');
    const ProtonInstance = await Proton.deploy();
    const proton = await ProtonInstance.deployed();
    deployData['Proton'] = {
      abi: getContractAbi('Proton'),
      address: proton.address,
      deployTransaction: proton.deployTransaction,
    }

    log('  - Registering ChargedParticles with Proton...')(alchemyTimeout);
    await proton.setChargedParticles(ddChargedParticles.address);

    log('  - Setting Proton Mint Fee:', mintFee.toString())(alchemyTimeout);
    await proton.setMintFee(mintFee);

    log('  - Registering Proton with ChargedParticles...')(alchemyTimeout);
    await chargedParticles.updateWhitelist(proton.address, true);

    // Display Contract Addresses
    log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - Proton:      ', proton.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['proton']