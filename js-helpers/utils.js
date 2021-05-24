const { ethers } = require('hardhat');
const moment = require('moment');
const sleep = require('sleep-promise');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const toWei = ethers.utils.parseEther;
const toEth = ethers.utils.formatEther;
const toBN = ethers.BigNumber.from;
const toStr = (val) => ethers.utils.toUtf8String(val).replace(/\0/g, '');

const bn = function(number, defaultValue = null) { if (number == null) { if (defaultValue == null) { return null } number = defaultValue } return ethers.BigNumber.from(number) }

const tokens = function (amount, decimals = 18) { return (bn(amount).mul(bn(10).pow(decimals))).toString() }
const tokensBN = function (amount, decimals = 18) { return (bn(amount).mul(bn(10).pow(decimals))) }
const bnToInt = function (bnAmount, decimals = 18) { return bnAmount.div(bn(10).pow(decimals)) }

const dateToEpoch = function (dated) { return moment.utc(dated, "DD/MM/YYYY HH:mm").valueOf() / 1000 }
const timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }
const timeInDays = function (secs) { return (secs / (60 * 60 * 24)).toFixed(2) }
const timeInDate = function (secs) { return moment.utc(secs * 1000).format("DD MMM YYYY hh:mm a") }

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

const calculateSumArithmeticSeriesAtN = (a1, d, n) => {
  const aN = a1.sub(n.sub(1).mul(d));
  const sumAtEpochN = n.mul((a1.add(aN)).div(2));
  return sumAtEpochN;
};

module.exports = {
  toWei,
  toEth,
  toBN,
  toStr,
  bn,
  log,
  tokens,
  tokensBN,
  bnToInt,
  chainNameById,
  chainIdByName,
  dateToEpoch,
  timeInSecs,
  timeInDays,
  timeInDate,
  blockTimeFromDate,
  // vestedAmount,
  // returnWeight,
  ensureDirectoryExistence,
  calculateSumArithmeticSeriesAtN,
  // distributeInitialFunds,
}