
const { ethers, upgrades, getNamedAccounts, deployments } = require('@nomiclabs/buidler');
const _ = require('lodash');

const {
  chainName,
  getDeployData,
  getContractAbi,
  getTxGasCost,
  saveDeploymentData,
  presets,
  toEth,toWei,toBN
} = require('../js-utils/deploy-helpers');


async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  const ddIon = getDeployData('Ion', network.chainId);
  const deployData = {
    IonTimelock: []
  };

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Ion Token Timelocks ');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading Ion from: ', ddIon.address);
  const Ion = await ethers.getContractFactory('Ion');
  const ion = await Ion.attach(ddIon.address);

  const IonTimelock = await ethers.getContractFactory('IonTimelock');
  const ionTimelockAbi = getContractAbi('IonTimelock');
  const ionAddress = ddIon.address;

  const _getDeployedTimelock = async (receiver) => {
    const ionTimelockDeployData = _.find(deployData['IonTimelock'], ['receiver', receiver]);
    if (!ionTimelockDeployData) { return; }

    const ionTimelockDeployed = await IonTimelock.attach(ionTimelockDeployData.address);
    return ionTimelockDeployed;
  };

  const _deployTimelock = async (timelockData) => {
    log('\n  Deploying Ion Timelock for Receiver: ', timelockData.receiver);

    const ionTimelockInstance = await IonTimelock.deploy(timelockData.receiver, ionAddress);
    const ionTimelockDeployed = await ionTimelockInstance.deployed();

    log('  - IonTimelock: ', ionTimelockDeployed.address);
    log('     - Gas Cost: ', getTxGasCost({deployTransaction: ionTimelockDeployed.deployTransaction}));
    return ionTimelockDeployed;
  };

  const _mintToTimelock = async (timelockData, ionTimelock) => {
    log('\n  Minting Ions to Timelock for Receiver: ', timelockData.receiver);

    const amounts = _.map(timelockData.portions, 'amount');
    const timestamps = _.map(timelockData.portions, 'releaseDate');

    await ion.mintToTimelock(ionTimelock.address, amounts, timestamps);

    const totalMinted = _.reduce(amounts, (sum, amt) => sum.add(amt), toBN('0'));
    log('  - Total Minted: ', toEth(totalMinted));
    return totalMinted;
  };

  let ionTimelock;
  let ionTimelockData;
  let totalIonAmount;
  let deployTxData;
  for (let i = 0; i < presets.Ion.timelocks.length; i++) {
    ionTimelockData = presets.Ion.timelocks[i];
    deployTxData = {receiver: ionTimelockData.receiver};

    // Deploy if not exists
    ionTimelock = await _getDeployedTimelock(ionTimelockData.receiver);
    if (!ionTimelock) {
      ionTimelock = await _deployTimelock(ionTimelockData);
      deployTxData['abi'] = ionTimelockAbi;
      deployTxData['deployTransaction'] = ionTimelock.deployTransaction;
    }
    deployTxData['address'] = ionTimelock.address;

    // Mint
    totalIonAmount = await _mintToTimelock(ionTimelockData, ionTimelock);
    deployTxData['mintedIons'] = totalIonAmount;

    // Save deployment data
    deployData['IonTimelock'].push(deployTxData);
  }

  log('\n  Contract Deployments & Ion Minting Complete!');

  saveDeploymentData(network.chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployed" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
