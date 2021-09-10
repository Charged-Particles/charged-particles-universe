const {
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  toBN,
  toEth,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    const deployData = {
        IonxTimelocks: []
    };

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 1);

    const daoSigner = ethers.provider.getSigner(protocolOwner);
    const ddIonx = getDeployData('Ionx', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Ionx Token Timelocks ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Ionx from: ', ddIonx.address);
    const Ionx = await ethers.getContractFactory('Ionx');
    const ionx = await Ionx.attach(ddIonx.address).connect(daoSigner);

    const IonxTimelock = await ethers.getContractFactory('IonxTimelock');
    const ionxTimelockAbi = getContractAbi('IonxTimelock');
    const ionxAddress = ddIonx.address;

    const _getDeployedTimelock = async (receiver) => {
        const ionxTimelockDeployData = _.find(deployData['IonxTimelocks'], ['receiver', receiver]);
        if (!ionxTimelockDeployData) { return; }

        const ionxTimelockDeployed = await IonxTimelock.attach(ionxTimelockDeployData.address);
        return ionxTimelockDeployed;
    };

    const _deployTimelock = async (timelockData) => {
      await log('\n  Deploying Ionx Timelock for Receiver: ', timelockData.receiver)(alchemyTimeout);

      const ionxTimelockInstance = await IonxTimelock.deploy(protocolOwner, timelockData.receiver, ionxAddress);
      const ionxTimelockDeployed = await ionxTimelockInstance.deployed();

      log('  - IonxTimelock: ', ionxTimelockDeployed.address);
      log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ionxTimelockDeployed.deployTransaction }));
      return ionxTimelockDeployed;
    };

    const _mintToTimelock = async (timelockData, ionxTimelock) => {
      await log('\n  Minting Ionx to Timelock for Receiver: ', timelockData.receiver)(alchemyTimeout);

      const amounts = _.map(timelockData.portions, 'amount');
      const timestamps = _.map(timelockData.portions, 'releaseDate');

      const totalAmount = _.reduce(amounts, (sum, n) => sum.add(n), toBN('0'));

      // await ionx.mintToTimelock(ionxTimelock.address, amounts, timestamps);
      await ionx.transfer(ionxTimelock.address, totalAmount);
      await ionxTimelock.connect(daoSigner).addPortions(amounts, timestamps);
      await ionxTimelock.connect(daoSigner).activateTimelock();

      log('  - Total Minted: ', toEth(totalAmount));
      return totalAmount;
    };

    let ionxTimelock;
    let ionxTimelocks = [];
    let ionxTimelockData;
    let totalIonxAmount;
    let deployTxData;

    for (let i = 0; i < presets.Ionx.timelocks.length; i++) {
        ionxTimelockData = presets.Ionx.timelocks[i];
        deployTxData = { receiver: ionxTimelockData.receiver };

        // Deploy if not exists
        ionxTimelock = await _getDeployedTimelock(ionxTimelockData.receiver);
        if (!ionxTimelock) {
            ionxTimelock = await _deployTimelock(ionxTimelockData);
            deployTxData['abi'] = ionxTimelockAbi;
            deployTxData['deployTransaction'] = ionxTimelock.deployTransaction;
        }
        deployTxData['address'] = ionxTimelock.address;
        ionxTimelocks.push(ionxTimelock);

        // Mint
        totalIonxAmount = await _mintToTimelock(ionxTimelockData, ionxTimelock);
        deployTxData['mintedIonx'] = totalIonxAmount;

        // Save deployment data
        deployData['IonxTimelocks'].push(deployTxData);
    }

    log('\n  Contract Deployments & Ionx Minting Complete!');

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployments" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    return ionxTimelocks;
}

module.exports.tags = ['ionx-timelocks']