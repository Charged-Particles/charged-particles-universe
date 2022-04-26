const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const dateFormat = require('dateformat');

const {
  bn,
  toWei,
  toEth,
  toBN,
  tokensBN,
  chainNameById,
  dateToTimestamp,
  blockTimeFromDate,
  ensureDirectoryExistence,
  calculateSumArithmeticSeriesAtN,
} = require('./utils');

const { weiPerEth } = require('./constants');

require('./chaiMatchers');


// const STAKING_EPOCH_GENESIS_STR     = '22/05/2021 11:00'; // 22 May 2021 11 AM UTC
// const STAKING_EPOCH_GENESIS         = dateToTimestamp(STAKING_EPOCH_GENESIS_STR);
// const STAKING_EPOCH_DURATION        = 60 * 60;

// const NFT_STAKING_EPOCH_GENESIS_STR = '15/06/2021 14:00';
// const NFT_STAKING_EPOCH_GENESIS     = dateToTimestamp(NFT_STAKING_EPOCH_GENESIS_STR);


const NOW = Date.now();
const TEN_MINS_FROM_NOW = new Date(NOW + (10 * 60 * 1000));
const ONE_DAY_FROM_NOW = new Date(NOW + (24 * 60 * 60 * 1000));
const ONE_MONTH_FROM_NOW = new Date(NOW + (30 * 24 * 60 * 60 * 1000));

const TEST_EXPIRY = dateToTimestamp('01/07/2021 07:00'); // July 1, 2021 @ 11:00 AM
const LIVE_EXPIRY = dateToTimestamp('31/12/2021 23:59'); // Dec 31, 2021 @ EOD


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
        supply      : {1: toBN('721'),  42: toBN('40'),         31337: toBN('40')},
        multiplier  : toBN('110'),  // 1.1%
        bonus       : toBN('0'),
      },
      {
        name        : 'Muon Neutrino',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmccGhGhvi37QScB4u2VmuVwENtEsMpx6hAKUqu3x3nU9V',
        price       : {1: toWei('0.9'), 42: toWei('0.0000009'), 31337: toWei('0.000000009')},
        supply      : {1: toBN('401'),  42: toBN('20'),         31337: toBN('20')},
        multiplier  : toBN('130'),  // 1.3%
        bonus       : toBN('1'),
      },
      {
        name        : 'Tau Neutrino',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/Qma2ZPnCM95AYZ1wPxZdDVvRiS114Svrw2J632ZpLiX7JV',
        price       : {1: toWei('1.7'), 42: toWei('0.0000017'), 31337: toWei('0.000000017')},
        supply      : {1: toBN('301'),  42: toBN('12'),         31337: toBN('12')},
        multiplier  : toBN('150'),  // 1.5%
        bonus       : toBN('2'),
      },
      {
        name        : 'Electron',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmNRKJsUwqEE9zYK6sEND8HDGa4cHFkkC2ntjQA5bFL6jJ',
        price       : {1: toWei('2.9'), 42: toWei('0.000029'), 31337: toWei('0.00000029')},
        supply      : {1: toBN('201'),  42: toBN('8'),          31337: toBN('8')},
        multiplier  : toBN('180'),  // 1.8%
        bonus       : toBN('4'),
      },
      {
        name        : 'Muon',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmWiH5F9yPp7yRzcqocmQKuhrA3KVY9fGJZxD9UKBDu5wr',
        price       : {1: toWei('5.1'), 42: toWei('0.000051'), 31337: toWei('0.00000051')},
        supply      : {1: toBN('88'),   42: toBN('5'),         31337: toBN('5')},
        multiplier  : toBN('230'),  // 2.3%
        bonus       : toBN('8'),
      },
      {
        name        : 'Tau',
        tokenUri    : 'https://gateway.pinata.cloud/ipfs/QmUkCXgyguBSxnGRtfBAvofAkyhFbRCwS7HPaoytAZvemt',
        price       : {1: toWei('21'), 42: toWei('0.00021'), 31337: toWei('0.0000021')},
        supply      : {1: toBN('21'),  42: toBN('2'),        31337: toBN('2')},
        multiplier  : toBN('510'),  // 5.1%
        bonus       : toBN('16'),
      },
    ]
  },
  Aave: {
    referralCode: {
      1: '',
      42: '',
      137: '',
      80001: '',
      31337: '',
    },
    v2: {
      dai: {
        1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // mainnet
        42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
        137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // polygon mainnet
        80001: '0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F', // polygon testnet
        31337: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Hardhat - Forked Mainnet
      },
      ampl: {
        1: '0xD46bA6D942050d489DBd938a2C909A5d5039A161', // mainnet
        42: '0x3E0437898a5667a4769B1Ca5A34aAB1ae7E81377', // kovan
        31337: '0xD46bA6D942050d489DBd938a2C909A5d5039A161', // Hardhat - Forked Mainnet
      },
      lendingPoolProvider: {
        1: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5', // mainnet
        42: '0x652B2937Efd0B5beA1c8d54293FC1289672AFC6b', // kovan
        137: '0xd05e3E715d945B59290df0ae8eF85c1BdB684744', // polygon mainnet
        80001: '0x178113104fEcbcD7fF8669a0150721e231F0FD4B', // polygon testnet
        31337: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5', // Hardhat - Forked Mainnet
      }
    }
  },
  Ionx: {
    // token info to test
    name: 'Charged Particles - IONX',
    symbol: 'IONX',
    decimals: 18,
    maxSupply: toWei('100000000'), // 100 Million

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
  Incentives: {
    1: { // Mainnet
      // airdrop: {  //  AIRDROP # 1
      //   merkleRoot: '0x58756dddb7c90cd6eb82cde8dea667eb364056f52d18d437838a26afd2accce0',
      //   totalIonx: tokensBN(bn(1_000_000)),
      // },
      // airdrop: {  //  AIRDROP # 2
      //   merkleRoot: '0x31340c29d25b57749abae264a051c31a96d6b79a24776ffc91a8d46d4a9258a5',
      //   totalIonx: tokensBN(bn(1_000_000)),
      //   expiryDate: LIVE_EXPIRY,
      // },
      airdrop: {  //  AIRDROP # 3
        merkleRoot: '0x57a3449b2574a7fe391a62fbb1d15456b7c39422bbeee27d64cef4502cdf613a',
        totalIonx: tokensBN(bn(1_000_000)),
        expiryDate: LIVE_EXPIRY,
      },
      staking: {
        epochDuration: 7 * 24 * 60 * 60,  // 1 week
        epoch1Start: 1637012580, // dateToTimestamp(dateFormat('23/08/2021 5:30', 'UTC:dd:mm:yyyy HH:MM')), // format: '24/05/2021 11:00'
      },
      ionxToken: {
        startAmount: bn(48000),
        nrOfEpochs: bn(24),
        deprecation: bn(0),
      },
      lpTokens: {
        startAmount: bn(48000),
        nrOfEpochs: bn(24),
        deprecation: bn(0),
      },

      uniswapV2Addr : '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      uniswapLPTokenAddress: '0x60F6E2200bFEf8b4d120028Faff4D9A4486526f4',
    },
    42: { // Kovan Testnet
      airdrop: {
        merkleRoot: '0x57a3449b2574a7fe391a62fbb1d15456b7c39422bbeee27d64cef4502cdf613a',
        totalIonx: tokensBN(bn(1_000_000)),
        expiryDate: TEST_EXPIRY,
      },
      staking: {
        epochDuration: 2 * 60 * 60,  // 2 Hours
        epoch1Start: dateToTimestamp(dateFormat(TEN_MINS_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')), // format: '24/05/2021 11:00'
      },
      ionxToken: {
        startAmount: bn(48000),
        nrOfEpochs: bn(24),
        deprecation: bn(0),
      },
      lpTokens: {
        startAmount: bn(48000),
        nrOfEpochs: bn(24),
        deprecation: bn(0),
      },

      uniswapV2Addr : '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      uniswapLPTokenAddress: '0xac5A8983d9289922a45f97B352Dc3c94FF55a1A6',
    },
    137: { // Polygon L2 Mainnet

    },
    80001: { // Polygon L2 Testnet - Mumbai
      staking: {
        epochDuration: 30 * 60,  // 1/2 Hour
        epoch1Start: dateToTimestamp(dateFormat(TEN_MINS_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')), // format: '24/05/2021 11:00'
      },
      ionxToken: {
        startAmount: bn(53_000),  // 5_000_000 TOTAL
        nrOfEpochs: bn(104),
        deprecation: bn(100),
      },
      lpTokens: {
        startAmount: bn(100_000),  // 10_000_000 TOTAL
        nrOfEpochs: bn(104),
        deprecation: bn(100),
      },

      uniswapV2Addr : '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap on Polygon Mainnet
      uniswapLPTokenAddress: '',
    },
    31337: { // Hardhat - Forked Mainnet
      airdrop: {
        merkleRoot: '0x42607ac6583b70ed3bb26c8583844da4b5ca1099ecf3f0252de4dd60d17c2fc3',
        totalIonx: tokensBN(bn(1_000_000)),
        expiryDate: LIVE_EXPIRY,
      },
      staking: {
        epochDuration: 60 * 60,  // 1 Hour
        epoch1Start: dateToTimestamp(dateFormat(NOW, 'UTC:dd:mm:yyyy HH:MM')), // format: '24/05/2021 11:00'
      },
      ionxToken: {
        startAmount: bn(48000),
        nrOfEpochs: bn(12),
        deprecation: bn(0),
      },
      lpTokens: {
        startAmount: bn(48000),
        nrOfEpochs: bn(12),
        deprecation: bn(0),
      },

      uniswapV2Addr : '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      uniswapLPTokenAddress: '0xac5A8983d9289922a45f97B352Dc3c94FF55a1A6',
    },
  },
  Vesting: {
    month1: {
      merkleRoot: '0x868018bccd0169750f6d23ca2e851d0249e1802f8aed54ed747f2a910b603f78',
      totalIonx: tokensBN(bn(1_516_631)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
    month2: {
      merkleRoot: '0xf0c21b0f8e577f02024d3a7a33eabca1aa1e224e67f3dec1866c0c1be04f9b1d',
      totalIonx: tokensBN(bn(1_516_633)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
    month3: {
      merkleRoot: '0xf0c21b0f8e577f02024d3a7a33eabca1aa1e224e67f3dec1866c0c1be04f9b1d',
      totalIonx: tokensBN(bn(1_516_633)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
    month4: {
      merkleRoot: '0x857cbf75cef2bfa807523ac7fcda259ddc01a95e02afc262c0cb4207c3c70510',
      totalIonx: tokensBN(bn(1_516_631)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
    month5: {
      merkleRoot: '0x857cbf75cef2bfa807523ac7fcda259ddc01a95e02afc262c0cb4207c3c70510',
      totalIonx: tokensBN(bn(1_516_631)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
    month6: {
      merkleRoot: '0x857cbf75cef2bfa807523ac7fcda259ddc01a95e02afc262c0cb4207c3c70510',
      totalIonx: tokensBN(bn(1_516_631)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
    month7: {
      merkleRoot: '0x857cbf75cef2bfa807523ac7fcda259ddc01a95e02afc262c0cb4207c3c70510',
      totalIonx: tokensBN(bn(1_516_631)),
      expiryDate: dateToTimestamp(dateFormat(ONE_MONTH_FROM_NOW, 'UTC:dd:mm:yyyy HH:MM')),
    },
  },
};


const txOverrides = (options = {}) => ({gasLimit: 15000000, ...options});

const saveDeploymentData = (chainId, deployData, overwrite = false) => {
  const network = chainNameById(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'deployments', network);

  _.forEach(_.keys(deployData), (contractName) => {
    const filename = `${deployPath}/${contractName}.json`;

    let existingData = {};
    if (!overwrite && fs.existsSync(filename)) {
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
  delete require.cache[require.resolve(filename)]; // Prevent requiring cached deps
  const contractJson = require(filename);
  return contractJson;
}


const saveMigrationData = (chainId, migrationData) => {
  const network = chainNameById(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'migration_data', network);

  _.forEach(_.keys(migrationData), (dataTypeId) => {
    const filename = `${deployPath}/${dataTypeId}.json`;

    let existingData = {};
    if (fs.existsSync(filename)) {
      existingData = JSON.parse(fs.readFileSync(filename));
    }

    const newData = _.merge(existingData, migrationData[dataTypeId]);
    ensureDirectoryExistence(filename);
    fs.writeFileSync(filename, JSON.stringify(newData, null, "\t"));
  });
};

const getMigrationData = (dataTypeId, chainId = 31337) => {
  const network = chainNameById(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'migration_data', network);
  const filename = `${deployPath}/${dataTypeId}.json`;
  const migrationJson = (fs.existsSync(filename)) ? require(filename) : {};
  return migrationJson;
}

const getOZProjectData = (chainId = 31337) => {
  let fileRef = '';
  switch (chainId) {
    case 1: fileRef = `mainnet`; break;
    case 42: fileRef = `kovan`; break;
    default: fileRef = `unknown-${chainId}`; break;
  }
  const projectPath = path.join(__dirname, '..', '.openzeppelin');
  const filename = `${projectPath}/${fileRef}.json`;
  const projectJson = (fs.existsSync(filename)) ? require(filename) : {};
  return projectJson;
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

const getIonxDistributionAmount = (chainId = 42) => {
  const incentives = presets.Incentives[chainId];
  const a1 = incentives.ionxToken.startAmount;
  const d = incentives.ionxToken.deprecation;
  const n = incentives.ionxToken.nrOfEpochs;

  const sumAtN = calculateSumArithmeticSeriesAtN(a1, d, n);
  return tokensBN(sumAtN);
};

const getLiquidityDistributionAmount = (chainId = 42) => {
  const incentives = presets.Incentives[chainId];
  const a1 = incentives.lpTokens.startAmount;
  const d = incentives.lpTokens.deprecation;
  const n = incentives.lpTokens.nrOfEpochs;

  const sumAtN = calculateSumArithmeticSeriesAtN(a1, d, n);
  return tokensBN(sumAtN);
};

// For Distributing funds
const distributeInitialFunds = async (tokenContract, contract, amount, signer) => {
  let balance;
  console.log(chalk.bgBlue.white(`Distributing Initial Funds`))
  console.log(chalk.bgBlack.white(`Sending Funds to ${contract.address}`), chalk.green(`${ethers.utils.formatUnits(amount)} IONX`))

  balance = await tokenContract.balanceOf(signer)
  console.log(chalk.bgBlack.white(`IONX Token Balance Before Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} IONX`))
  const tx = await tokenContract.transfer(contract.address, amount)
  await tx.wait()

  balance = await tokenContract.balanceOf(signer)
  console.log(chalk.bgBlack.white(`IONX Token Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} IONX`))

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
};

module.exports = {
  txOverrides,
  saveDeploymentData,
  saveMigrationData,
  getContractAbi,
  getDeployData,
  getMigrationData,
  getOZProjectData,
  getTxGasCost,
  getActualTxGasCost,
  getIonxDistributionAmount,
  getLiquidityDistributionAmount,
  distributeInitialFunds,
  presets,
};
