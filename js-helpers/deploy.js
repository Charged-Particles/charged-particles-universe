const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const sleep = require('sleep-promise');

require('./chaiMatchers');

const toWei = ethers.utils.parseEther;
const toEth = ethers.utils.formatEther;
const toBN = ethers.BigNumber.from;
const toStr = (val) => ethers.utils.toUtf8String(val).replace(/\0/g, '');
const weiPerEth = ethers.constants.WeiPerEther;

const txOverrides = (options = {}) => ({gasLimit: 15000000, ...options});

const log = (...args) => {
  console.log(...args);
  return async (delay = 0) => (delay && await sleep(delay * 1000));
};

const chainIdByName = (chainName) => {
  switch (_.toLower(chainName)) {
    case 'mainnet': return 1;
    case 'ropsten': return 3;
    case 'rinkeby': return 4;
    case 'kovan': return 42;
    case 'hardhat': return 31337;
    case 'coverage': return 31337;
    default: return 0;
  }
};

const chainNameById = (chainId) => {
  switch (parseInt(chainId, 10)) {
    case 1: return 'Mainnet';
    case 3: return 'Ropsten';
    case 4: return 'Rinkeby';
    case 42: return 'Kovan';
    case 31337: return 'Hardhat';
    default: return 'Unknown';
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

const getActualTxGasCost = async (txData) => {
  const txResult = await txData.wait();
  const gasCostEst = toEth(txData.gasLimit.mul(txData.gasPrice));
  const gasCost = toEth(txResult.gasUsed.mul(txData.gasPrice));
  return `${gasCost} ETH Used.  (Estimated: ${gasCostEst} ETH)`;
};

const presets = {
  ChargedParticles: {
    tempLockExpiryBlocks: toBN('5760'), // 1 Day == 86400 / 15
    maxDeposits: [ // Temporary limit; remove after launch proves successful
      {assetTokenId: 'Aave.v2.dai', amount: toWei('10000')}, // DAI
    ]
  },
  Lepton: {
    maxMintPerTx: toBN('25'),

    // V2 Type Definitions
    types: [
      {
        name        : 'Electron Neutrino',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmcWuHx4MgywyEMzsqT9J3boJu1gk7GdtAMQ1pyQYRR3XS',
        price       : {1: toWei('0.3'), 42: toWei('0.0000003'), 31337: toWei('0.000000003')},
        supply      : {1: toBN('721'), 42: toBN('40'), 31337: toBN('40')},
        multiplier  : toBN('110'),  // 1.1%
        bonus       : toBN('0'),
      },
      {
        name        : 'Muon Neutrino',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmccGhGhvi37QScB4u2VmuVwENtEsMpx6hAKUqu3x3nU9V',
        price       : {1: toWei('0.9'), 42: toWei('0.0000009'), 31337: toWei('0.000000009')},
        supply      : {1: toBN('401'), 42: toBN('20'), 31337: toBN('20')},
        multiplier  : toBN('130'),  // 1.3%
        bonus       : toBN('1'),
      },
      {
        name        : 'Tau Neutrino',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/Qma2ZPnCM95AYZ1wPxZdDVvRiS114Svrw2J632ZpLiX7JV',
        price       : {1: toWei('1.7'), 42: toWei('0.0000017'), 31337: toWei('0.000000017')},
        supply      : {1: toBN('301'), 42: toBN('12'), 31337: toBN('12')},
        multiplier  : toBN('150'),  // 1.5%
        bonus       : toBN('2'),
      },
      {
        name        : 'Electron',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmNRKJsUwqEE9zYK6sEND8HDGa4cHFkkC2ntjQA5bFL6jJ',
        price       : {1: toWei('2.9'), 42: toWei('0.000029'), 31337: toWei('0.00000029')},
        supply      : {1: toBN('201'), 42: toBN('8'), 31337: toBN('8')},
        multiplier  : toBN('180'),  // 1.8%
        bonus       : toBN('4'),
      },
      {
        name        : 'Muon',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmWiH5F9yPp7yRzcqocmQKuhrA3KVY9fGJZxD9UKBDu5wr',
        price       : {1: toWei('5.1'), 42: toWei('0.000051'), 31337: toWei('0.00000051')},
        supply      : {1: toBN('88'), 42: toBN('5'), 31337: toBN('5')},
        multiplier  : toBN('230'),  // 2.3%
        bonus       : toBN('8'),
      },
      {
        name        : 'Tau',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmUkCXgyguBSxnGRtfBAvofAkyhFbRCwS7HPaoytAZvemt',
        price       : {1: toWei('21'), 42: toWei('0.00021'), 31337: toWei('0.0000021')},
        supply      : {1: toBN('21'), 42: toBN('2'), 31337: toBN('2')},
        multiplier  : toBN('510'),  // 5.1%
        bonus       : toBN('16'),
      },
    ]
  },
  Ionx: {
    universeMaxSupply: toWei('100000000'), // 100 Million
    rewardsForAssetTokens: [
      {assetTokenId: 'Aave.v2.dai', multiplier: '5000'}, // DAI (50% of Interest in Ionx)
    ],
    timelocks: [
      {
        receiver: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',  // Testing - Account 3
        portions: [
          {amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('27 Dec 2021 00:00:00 GMT')},
          {amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('28 Dec 2021 00:00:00 GMT')},
          {amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('29 Dec 2021 00:00:00 GMT')},
        ]
      },
      {
        receiver: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',  // Testing - Account 4
        portions: [
          {amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('27 Dec 2021 00:00:00 GMT')},
          {amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('28 Dec 2021 00:00:00 GMT')},
          {amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('29 Dec 2021 00:00:00 GMT')},
        ]
      },
    ],
  },
  Aave: {
    referralCode: {
      1: '',
      42: '',
      31337: '',
    },
    v2: {
      dai: {
        1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // mainnet
        42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
        31337: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Hardhat - Forked Mainnet
      },
      lendingPoolProvider: {
        1: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5', // mainnet
        42: '0x652B2937Efd0B5beA1c8d54293FC1289672AFC6b', // kovan
        31337: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5', // Hardhat - Forked Mainnet
      }
    }
  },
  UniV2LPTokenAddress: {
    1: '', // mainnet
    42: '0x5c6e126c32ba4439e40be2f60f7b2453485a4b7a', // kovan
    31337: '', // Hardhat - Forked Mainnet
  }
};


module.exports = {
  txOverrides,
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  getActualTxGasCost,
  log,
  presets,
  toWei,
  toEth,
  toBN,
  toStr,
};
