#!/usr/bin/env node
const hardhat = require('hardhat');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const chalk = require('chalk');

const info = (msg) => console.log(chalk.dim(msg));
const success = (msg) => console.log(chalk.green(msg));

const verifyContract = async (name, network, addressOverride = null) => {
  try {
    const deployment = (await deployments.get(name)) || {};
    const address = addressOverride || deployment.address;
    const constructorArgs = deployment.constructorArgs || [];
    info(`Verifying ${name} at address "${address}" ${constructorArgs ? 'with args' : ''}...`);

    await exec(`hardhat verify --network ${network} ${address} ${constructorArgs.map(String).join(' ')}`);
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
  const network = await hardhat.ethers.provider.getNetwork();
  const networkName = network.name === 'homestead' ? 'mainnet' : network.name;
  info(`Verifying contracts on network "${networkName}"...`);

  // Upgradeable Contracts; need to get implementation adderss from `.openzeppelin/__network__.json`
  let universeAddress = null;
  let chargedParticlesAddress = null;
  if (networkName === 'mainnet') {
    universeAddress = '0xd6ed8455903CBd94d8F432eC4059197984baA65e';
    chargedParticlesAddress = '0x660De54CEA09838d11Df0812E2754eD8D08CD2f7';
  }
  if (networkName === 'kovan') {
    universeAddress = '0xeC08CB0f69E2095CF27eCB6E9D4BB60b430334Ad';
    chargedParticlesAddress = '0x0cFAAD8cD948A0BAe647615ecc8DfeFD0294a5f2';
  }

  // Protocol
  await verifyContract('Universe', networkName, universeAddress);
  await verifyContract('ChargedParticles', networkName, chargedParticlesAddress);
  await verifyContract('ChargedState', networkName);
  await verifyContract('ChargedSettings', networkName);
  await verifyContract('WBoson', networkName);
  await verifyContract('Ion', networkName);
  await verifyContract('IonTimelock', networkName);

  // // Wallet Managers
  await verifyContract('GenericWalletManager', networkName);
  await verifyContract('GenericBasketManager', networkName);
  await verifyContract('AaveWalletManager', networkName);

  // // NFTs
  await verifyContract('Proton', networkName);
  await verifyContract('Lepton', networkName);
  await verifyContract('Lepton2', networkName);

  // Incentives
  await verifyContract('CommunityVault', networkName);
  await verifyContract('Staking', networkName);
  await verifyContract('YieldFarmIONX', networkName);
  await verifyContract('YieldFarmLP', networkName);

  success('Done!');
};

run();
