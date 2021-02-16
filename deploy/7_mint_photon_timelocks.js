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
        PhotonTimelocks: []
    };

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);

    const ddPhoton = getDeployData('Photon', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Photon Token Timelocks ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Photon from: ', ddPhoton.address);
    const Photon = await ethers.getContractFactory('Photon');
    const photon = await Photon.attach(ddPhoton.address);

    const PhotonTimelock = await ethers.getContractFactory('PhotonTimelock');
    const photonTimelockAbi = getContractAbi('PhotonTimelock');
    const photonAddress = ddPhoton.address;

    const _getDeployedTimelock = async (receiver) => {
        const photonTimelockDeployData = _.find(deployData['PhotonTimelocks'], ['receiver', receiver]);
        if (!photonTimelockDeployData) { return; }

        const photonTimelockDeployed = await PhotonTimelock.attach(photonTimelockDeployData.address);
        return photonTimelockDeployed;
    };

    const _deployTimelock = async (timelockData) => {
      await log('\n  Deploying Photon Timelock for Receiver: ', timelockData.receiver)(alchemyTimeout);

      const photonTimelockInstance = await PhotonTimelock.deploy(photonAddress, timelockData.receiver, photonAddress);
      const photonTimelockDeployed = await photonTimelockInstance.deployed();

      log('  - PhotonTimelock: ', photonTimelockDeployed.address);
      log('     - Gas Cost: ', getTxGasCost({ deployTransaction: photonTimelockDeployed.deployTransaction }));
      return photonTimelockDeployed;
    };

    const _mintToTimelock = async (timelockData, photonTimelock) => {
      await log('\n  Minting Photons to Timelock for Receiver: ', timelockData.receiver)(alchemyTimeout);

      const amounts = _.map(timelockData.portions, 'amount');
      const timestamps = _.map(timelockData.portions, 'releaseDate');

      await photon.mintToTimelock(photonTimelock.address, amounts, timestamps);

      const totalMinted = _.reduce(amounts, (sum, amt) => sum.add(amt), toBN('0'));
      log('  - Total Minted: ', toEth(totalMinted));
      return totalMinted;
    };

    let photonTimelock;
    let photonTimelocks = [];
    let photonTimelockData;
    let totalPhotonAmount;
    let deployTxData;

    for (let i = 0; i < presets.Photon.timelocks.length; i++) {
        photonTimelockData = presets.Photon.timelocks[i];
        deployTxData = { receiver: photonTimelockData.receiver };

        // Deploy if not exists
        photonTimelock = await _getDeployedTimelock(photonTimelockData.receiver);
        if (!photonTimelock) {
            photonTimelock = await _deployTimelock(photonTimelockData);
            deployTxData['abi'] = photonTimelockAbi;
            deployTxData['deployTransaction'] = photonTimelock.deployTransaction;
        }
        deployTxData['address'] = photonTimelock.address;
        photonTimelocks.push(photonTimelock);

        // Mint
        totalPhotonAmount = await _mintToTimelock(photonTimelockData, photonTimelock);
        deployTxData['mintedPhotons'] = totalPhotonAmount;

        // Save deployment data
        deployData['PhotonTimelocks'].push(deployTxData);
    }

    log('\n  Contract Deployments & Photon Minting Complete!');

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    return photonTimelocks;
}

module.exports.tags = ['photon-timelocks']