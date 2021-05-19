const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  log,
  presets,
  toEth,
  toBN,
} = require("../js-helpers/deploy");

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {
        IonTimelocks: []
    };

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);

    const daoSigner = ethers.provider.getSigner(protocolOwner);
    const ddIon = getDeployData('Ion', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Ion Token Timelocks ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Ion from: ', ddIon.address);
    const Ion = await ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address).connect(daoSigner);

    const IonTimelock = await ethers.getContractFactory('IonTimelock');
    const ionTimelockAbi = getContractAbi('IonTimelock');
    const ionAddress = ddIon.address;

    const _getDeployedTimelock = async (receiver) => {
        const ionTimelockDeployData = _.find(deployData['IonTimelocks'], ['receiver', receiver]);
        if (!ionTimelockDeployData) { return; }

        const ionTimelockDeployed = await IonTimelock.attach(ionTimelockDeployData.address);
        return ionTimelockDeployed;
    };

    const _deployTimelock = async (timelockData) => {
      await log('\n  Deploying Ion Timelock for Receiver: ', timelockData.receiver)(alchemyTimeout);

      const ionTimelockInstance = await IonTimelock.deploy(protocolOwner, timelockData.receiver, ionAddress);
      const ionTimelockDeployed = await ionTimelockInstance.deployed();

      log('  - IonTimelock: ', ionTimelockDeployed.address);
      log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ionTimelockDeployed.deployTransaction }));
      return ionTimelockDeployed;
    };

    const _mintToTimelock = async (timelockData, ionTimelock) => {
      await log('\n  Minting Ion to Timelock for Receiver: ', timelockData.receiver)(alchemyTimeout);

      const amounts = _.map(timelockData.portions, 'amount');
      const timestamps = _.map(timelockData.portions, 'releaseDate');

      const totalAmount = _.reduce(amounts, (sum, n) => sum.add(n), toBN('0'));

      // await ion.mintToTimelock(ionTimelock.address, amounts, timestamps);
      await ion.transfer(ionTimelock.address, totalAmount);
      await ionTimelock.connect(daoSigner).addPortions(amounts, timestamps);
      await ionTimelock.connect(daoSigner).activateTimelock();

      log('  - Total Minted: ', toEth(totalAmount));
      return totalAmount;
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
            deployTxData['abi'] = ionTimelockAbi;
            deployTxData['deployTransaction'] = ionTimelock.deployTransaction;
        }
        deployTxData['address'] = ionTimelock.address;
        ionTimelocks.push(ionTimelock);

        // Mint
        totalIonAmount = await _mintToTimelock(ionTimelockData, ionTimelock);
        deployTxData['mintedIon'] = totalIonAmount;

        // Save deployment data
        deployData['IonTimelocks'].push(deployTxData);
    }

    log('\n  Contract Deployments & Ion Minting Complete!');

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    return ionTimelocks;
}

module.exports.tags = ['ion-timelocks']
