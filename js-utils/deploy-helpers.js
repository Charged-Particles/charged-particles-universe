const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { sleep } = require("sleep");

const toWei = ethers.utils.parseEther;
const toEth = ethers.utils.formatEther;
const toBN = ethers.BigNumber.from;
const toStr = (val) => ethers.utils.toUtf8String(val).replace(/\0/g, '');
const weiPerEth = ethers.constants.WeiPerEther;

const txOverrides = (options = {}) => ({ gasLimit: 15000000, ...options });

const chainName = (chainId) => {
  switch (chainId) {
    case 1: return 'Mainnet'
    case 3: return 'Ropsten'
    case 42: return 'Kovan'
    case 31337: return 'Hardhat'
    default: return 'Unknown'
  }
};

const blockTimeFromDate = (dateStr) => {
  return Date.parse(dateStr) / 1000;
};

const ensureDirectoryExistence = (filePath) => {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};

const saveDeploymentData = (chainId, deployData) => {
  const network = chainName(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'deployments', network);

  _.forEach(_.keys(deployData), (contractName) => {
    const filename = `${deployPath}/${contractName}.json`;

    let existingData = {};
    if (fs.existsSync(filename)) {
      existingData = JSON.parse(fs.readFileSync(filename));
    }

    const newData = _.merge(existingData, deployData[contractName]);
    ensureDirectoryExistence(filename);
    fs.writeFileSync(filename, JSON.stringify(newData, null, "\t"));
  });
};

const getContractAbi = (contractName) => {
  const buildPath = path.join(__dirname, '..', 'abis');
  const filename = `${buildPath}/${contractName}.json`;
  const contractJson = require(filename);
  return contractJson;
};

const getDeployData = (contractName, chainId) => {
  const network = chainName(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'deployments', network);
  const filename = `${deployPath}/${contractName}.json`;
  const contractJson = require(filename);
  return contractJson;
}

const getTxGasCost = ({ deployTransaction }) => {
  const gasCost = toEth(deployTransaction.gasLimit.mul(deployTransaction.gasPrice));
  return `${gasCost} ETH`;
};


const presets = {
  ChargedParticles: {
    fees: {
      deposit: 50, // 0.5%
    }
  },
  Ion: {
    rewardsForAssetTokens: [
      { assetTokenId: 'Aave.dai', multiplier: '5000' }, // DAI
    ],
    timelocks: [
      {
        receiver: '0xb14d1a16f30dB670097DA86D4008640c6CcC2B76',  // Testing - Account 3
        portions: [
          { amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('20 Dec 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('21 Dec 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('22 Dec 2020 00:00:00 GMT') },
        ]
      },
      {
        receiver: '0xF55D5df4fa26c454a5635B4697C2Acf92f55cfD8',  // Testing - Account 4
        portions: [
          { amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('20 Dec 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('21 Dec 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('22 Dec 2020 00:00:00 GMT') },
        ]
      },
    ],
  },
  Aave: {
    referralCode: '123456789',
    dai: {
      1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // mainnet
      3: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108', // ropsten
      42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
      31337: '0x6B175474E89094C44Da98b954EedeAC495271d0F' // hardhat <= mainnet fork
    },
    aDai: {
      1: '0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d', // mainnet
      3: '0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201', // ropsten
      42: '0x58AD4cB396411B691A9AAb6F74545b2C5217FE6a', // kovan
      31337: '0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d' // hardhat <= mainnet fork
    },
    lendingPoolProvider: {
      1: '0x24a42fD28C976A61Df5D00D0599C34c4f90748c8', // mainnet
      3: '0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728', // ropsten
      42: '0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5', // kovan
      31337: '0x24a42fD28C976A61Df5D00D0599C34c4f90748c8' // hardhat <= mainnet fork
    }
  }
};

const deploy = function (hre, alchemyTimeout=0) {
  return {
    mintUniverseIons: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in hardhat.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const deployData = getDeployData({ chainId: network.chainId });

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles: Mint Ion Tokens ');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      const IonTimelock = await hre.ethers.getContractFactory('IonTimelock');
      const ionAddress = deployData['Ion'].address;

      deployData['IonTimelock'] = deployData['IonTimelock'] || [];

      // let receiver;
      // let IonTimelockInstance;
      // let ionTimelock;
      // for (let i = 0; i < presets.Ion.timelocks.length; i++) {
      //   receiver = presets.Ion.timelocks[i].receiver;

      //   log('\n  Deploying Ion Timelock for Receiver: ', receiver);
      //   IonTimelockInstance = await IonTimelock.deploy(receiver, ionAddress);
      //   ionTimelock = await IonTimelockInstance.deployed();

      //   deployData['IonTimelock'].push({
      //     abi: getContractAbi('IonTimelock'),
      //     address: ionTimelock.address,
      //     receiver,
      //     deployTransaction: ionTimelock.deployTransaction,
      //   });

      //   log('  - IonTimelock: ', ionTimelock.address);
      //   log('     - Gas Cost: ', getTxGasCost({deployTransaction: ionTimelock.deployTransaction}));
      // }

      // Display Contract Addresses
      log('\n  Contract Deployments Complete!');

      const filename = saveDeploymentData({ chainId: network.chainId, deployData });
      log('\n  Contract Deployment Data saved to file: ');
      log('   ', filename);

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
    },
    runTx: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in hardhat.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);
      const ddAaveWalletManager = getDeployData('AaveWalletManager', network.chainId);

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles: Execute Transaction');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      log('  Loading AaveWalletManager from: ', ddChargedParticles.address);
      const AaveWalletManager = await hre.ethers.getContractFactory('AaveWalletManager');
      const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

      log('  - Setting Charged Particles as Controller...');
      await aaveWalletManager.setController(ddChargedParticles.address);

      log('\n  Transaction Execution Complete!');
      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
    }
  }
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DEPLOYMENT PROCEDURES:
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 1  -  scripts/deploy-protocol.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Protocol:
//  - Universe            (Upgradeable)
//  - ChargedParticles    (Upgradeable)
// Config:
// - Universe
//     - setChargedParticles
//  - ChargedParticles
//     - setUniverse
//     - setDepositFee

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 2  -  scripts/deploy-aave.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Liquidity Provider:
//  - AaveWalletManager   (Non-Upgradeable)
// Config:
//  - AaveWalletManager
//     - setLendingPoolProvider
//     - setReferralCode
//  - ChargedParticles
//     - registerLiquidityProvider

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 3  -  scripts/deploy-proton.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Proton (ERC721):
//  - Proton Token        (Non-Upgradeable, ERC721)
// Config:
//  - ChargedParticles
//     - updateWhitelist
//  - Proton Token
//     - setChargedParticles

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 4  -  scripts/deploy-ion.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Ion (ERC20):
//  - Ion Token           (Non-Upgradeable, ERC20)
// Config:
//  - Ion Token
//     - setUniverse
// - Universe
//     - setIonToken
//     - setIonRewardsMultiplier

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 5  -  scripts/deploy-timelock.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Ion Timelocks:
//  - IonTimelock         (Non-Upgradeable)
//     - Foundation (x1)
//     - Team       (x1)
//     - Advisors   (x3 ??)
// Config:
//  -

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 6 -  scripts/mint-ions.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Mint Ions:
//  - Ion Token
//     - mintToUniverse
//     - mintToTimelock

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

module.exports = {
  txOverrides,
  chainName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  // contractDeployer,
  // contractManager,
  presets,
  deploy,
  toWei,
  toEth,
  toBN,
  toStr,
};
