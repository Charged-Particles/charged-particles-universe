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

const txOverrides = (options = {}) => ({gasLimit: 15000000, ...options});

const log = (...args) => {
  console.log(...args);
  return (delay = 0) => (delay && sleep(delay))
}

const chainIdByName = (chainName) => {
  switch (_.toLower(chainName)) {
    case 'mainnet': return 1
    case 'ropsten': return 3
    case 'rinkeby': return 4
    case 'kovan': return 42
    case 'hardhat': return 31337
    case 'coverage': return 31337
    default: return 0
  }
};

const chainNameById = (chainId) => {
  switch (parseInt(chainId, 10)) {
    case 1: return 'Mainnet'
    case 3: return 'Ropsten'
    case 4: return 'Rinkeby'
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
  const network = chainNameById(chainId).toLowerCase();
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

const getDeployData = (contractName, chainId = 31337) => {
  const network = chainNameById(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'deployments', network);
  const filename = `${deployPath}/${contractName}.json`;
  const contractJson = require(filename);
  return contractJson;
}

const getTxGasCost = ({deployTransaction}) => {
  const gasCost = toEth(deployTransaction.gasLimit.mul(deployTransaction.gasPrice));
  return `${gasCost} ETH`;
};


const presets = {
  ChargedParticles: {
    fees: [
      {
        fee: 30,
        limit: toWei('10000'),  // Deposits >= $10,000 = 0.3% Fee
      },
      {
        fee: 40,
        limit: toWei('5000'),   // Deposits >= $5,000 = 0.4% Fee
      },
      {
        fee: 50,
        limit: '0',             // Deposits < $5,000 = 0.5% Fee
      },
    ]
  },
  Proton: {
    mintFee: toWei('0.001')
  },
  Ion: {
    rewardsForAssetTokens: [
      {assetTokenId: 'Aave.v1.dai', multiplier: '5000'}, // DAI
    ],
    timelocks: [
      {
        receiver: '0xb14d1a16f30dB670097DA86D4008640c6CcC2B76',  // Testing - Account 3
        portions: [
          {amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('27 Dec 2020 00:00:00 GMT')},
          {amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('28 Dec 2020 00:00:00 GMT')},
          {amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('29 Dec 2020 00:00:00 GMT')},
        ]
      },
      {
        receiver: '0xF55D5df4fa26c454a5635B4697C2Acf92f55cfD8',  // Testing - Account 4
        portions: [
          {amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('27 Dec 2020 00:00:00 GMT')},
          {amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('28 Dec 2020 00:00:00 GMT')},
          {amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('29 Dec 2020 00:00:00 GMT')},
        ]
      },
    ],
  },
  Aave: {
    referralCode: {
      1: '',
      3: '',
      4: '',
      42: '',
      31337: '',
    },
    v1: {
      dai: {
        1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // mainnet
        3: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108', // ropsten
        4: '', // rinkeby
        42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
        31337: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Hardhat - Forked Mainnet
      },
      lendingPoolProvider: {
        1: '', // mainnet
        3: '', // ropsten
        4: '', // rinkeby
        42: '', // kovan
        31337: '', // Hardhat - Forked Mainnet
      }
    },
    v2: {
      dai: {
        1: '', // mainnet
        3: '', // ropsten
        4: '', // rinkeby
        42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
        31337: '', // Hardhat - Forked Mainnet
      },
      lendingPoolProvider: {
        1: '', // mainnet
        3: '', // ropsten
        4: '', // rinkeby
        42: '0x652B2937Efd0B5beA1c8d54293FC1289672AFC6b', // kovan
        31337: '', // Hardhat - Forked Mainnet
      }
    }
  }
};


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
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  log,
  presets,
  toWei,
  toEth,
  toBN,
  toStr,
};
