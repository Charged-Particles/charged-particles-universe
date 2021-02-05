#!/usr/bin/env node
const hardhat = require('hardhat');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const chalk = require('chalk');

const info = (msg) => console.log(chalk.dim(msg));
const success = (msg) => console.log(chalk.green(msg));

const verifyContract = async (name, network, addressOverride = null) => {
  try {
    const address = addressOverride || (await deployments.get(name)).address;
    info(`Verifying ${name} at address "${address}"...`);

    await exec(`hardhat verify --network ${network} ${address}`);
    success(`${name} verified!`);
  }
  catch (err) {
    if (/Contract source code already verified/.test(err.message || err)) {
      info(`${name} already verified`);
    } else {
      console.error(err);
    }
  }
}

async function run() {
  const network = await hardhat.ethers.provider.getNetwork()
  const networkName = network.name === 'homestead' ? 'mainnet' : network.name;
  info(`Verifying contracts on network "${networkName}"...`);

  // Upgradeable Contracts; need to get implementation adderss from `.openzeppelin/__network__.json`
  let universeAddress = null;
  let chargedSettingsAddress = null;
  let chargedParticlesAddress = null;
  if (networkName === 'kovan') {
    universeAddress = '0xeC08CB0f69E2095CF27eCB6E9D4BB60b430334Ad';
    chargedSettingsAddress = '';
    chargedParticlesAddress = '0x0cFAAD8cD948A0BAe647615ecc8DfeFD0294a5f2';
  }

  // Protocol
  await verifyContract('Universe', networkName, universeAddress);
  await verifyContract('ChargedSettings', networkName, chargedSettingsAddress);
  await verifyContract('ChargedParticles', networkName, chargedParticlesAddress);
  await verifyContract('Photon', networkName);
  await verifyContract('Ion', networkName);
  await verifyContract('IonTimelock', networkName);

  // Wallet Managers
  await verifyContract('GenericWalletManager', networkName);
  await verifyContract('GenericBasketManager', networkName);
  await verifyContract('AaveWalletManager', networkName);

  // NFTs
  await verifyContract('Proton', networkName);

  success('Done!');
};

run();
