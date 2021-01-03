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
  let chargedParticlesAddress = null;
  if (networkName === 'kovan') {
    universeAddress = '0x63734522557D976D9D5Ae5F09E4CC9aCbE9F4D4B';
    chargedParticlesAddress = '0x63Cc225eB6d94fdb8C94409299CA494d4d345CB5';
  }

  // Protocol
  await verifyContract('Universe', networkName, universeAddress);
  await verifyContract('ChargedParticles', networkName, chargedParticlesAddress);
  await verifyContract('Ion', networkName);

  // Liquidity Providers
  await verifyContract('AaveWalletManager', networkName);

  // NFTs
  await verifyContract('Proton', networkName);

  success('Done!');
};

run();
