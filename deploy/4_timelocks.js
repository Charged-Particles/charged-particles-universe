const { toEth, toBN, chainName, getContractAbi, getDeployData, getTxGasCost, presets, saveDeploymentData } = require("../js-utils/deploy-helpers");
const _ = require('lodash');
const { sleep } = require("sleep");

module.exports = async (hre) => {

    let alchemyTimeout = 1;

    const { deployer, protocolOwner, trustedForwarder } = await hre.getNamedAccounts();
    const network = await hre.network;
    const log = console.log;

    const ddIon = getDeployData('Ion', network.config.chainId);
    const deployData = {
        IonTimelocks: []
    };

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Ion Token Timelocks ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainName(network.config.chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Ion from: ', ddIon.address);
    const Ion = await hre.ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address);

    sleep(alchemyTimeout);

    const IonTimelock = await hre.ethers.getContractFactory('IonTimelock');
    const ionTimelockAbi = getContractAbi('IonTimelock');
    const ionAddress = ddIon.address;

    const _getDeployedTimelock = async (receiver) => {
        const ionTimelockDeployData = _.find(deployData['IonTimelocks'], ['receiver', receiver]);
        if (!ionTimelockDeployData) { return; }

        const ionTimelockDeployed = await IonTimelock.attach(ionTimelockDeployData.address);

        sleep(alchemyTimeout);

        return ionTimelockDeployed;
    };

    const _deployTimelock = async (timelockData) => {
        log('\n  Deploying Ion Timelock for Receiver: ', timelockData.receiver);

        const ionTimelockInstance = await IonTimelock.deploy(timelockData.receiver, ionAddress);
        const ionTimelockDeployed = await ionTimelockInstance.deployed();

        sleep(alchemyTimeout);

        log('  - IonTimelock: ', ionTimelockDeployed.address);
        log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ionTimelockDeployed.deployTransaction }));
        return ionTimelockDeployed;
    };

    const _mintToTimelock = async (timelockData, ionTimelock) => {
        log('\n  Minting Ions to Timelock for Receiver: ', timelockData.receiver);

        const amounts = _.map(timelockData.portions, 'amount');
        const timestamps = _.map(timelockData.portions, 'releaseDate');

        await ion.mintToTimelock(ionTimelock.address, amounts, timestamps);

        sleep(alchemyTimeout);

        const totalMinted = _.reduce(amounts, (sum, amt) => sum.add(amt), toBN('0'));
        log('  - Total Minted: ', toEth(totalMinted));
        return totalMinted;
    };

    let ionTimelock;
    let ionTimelocks = [];
    let ionTimelockData;
    let totalIonAmount;
    let deployTxData;

    for (let i = 0; i < presets.Ion.timelocks.length; i++) {
        ionTimelockData = presets.Ion.timelocks[i];
        deployTxData = { receiver: ionTimelockData.receiver };

        // Deploy if not exists
        ionTimelock = await _getDeployedTimelock(ionTimelockData.receiver);
        if (!ionTimelock) {
            ionTimelock = await _deployTimelock(ionTimelockData);

            sleep(alchemyTimeout);

            deployTxData['abi'] = ionTimelockAbi;
            deployTxData['deployTransaction'] = ionTimelock.deployTransaction;
        }
        deployTxData['address'] = ionTimelock.address;
        ionTimelocks.push(ionTimelock);

        // Mint
        totalIonAmount = await _mintToTimelock(ionTimelockData, ionTimelock);

        sleep(alchemyTimeout);

        deployTxData['mintedIons'] = totalIonAmount;

        // Save deployment data
        deployData['IonTimelocks'].push(deployTxData);
    }

    log('\n  Contract Deployments & Ion Minting Complete!');

    saveDeploymentData(network.config.chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    return ionTimelocks;
}

module.exports.tags = ['timelocks']