require('dotenv').config();

const { ethers } = require('hardhat');
const moment = require('moment');

const chalk = require("chalk")

const { tokenInfo } = require('../config/config');

const CONSTANT_1K = 1000;
const CONSTANT_10K = 10 * CONSTANT_1K;
const CONSTANT_100K = 10 * CONSTANT_10K;
const CONSTANT_1M = 10 * CONSTANT_100K;
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const UNISWAP_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const UNISWAP_INIT_CODEHASH = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f';

const bn = function(number, defaultValue = null) { if (number == null) { if (defaultValue == null) { return null } number = defaultValue } return ethers.BigNumber.from(number) }

const tokens = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))).toString() }
const tokensBN = function (amount) { return (bn(amount).mul(bn(10).pow(tokenInfo.decimals))) }
const  bnToInt = function (bnAmount) { return bnAmount.div(bn(10).pow(tokenInfo.decimals)) }

const  dateToEpoch = function (dated) { return moment.utc(dated, "DD/MM/YYYY HH:mm").valueOf() / 1000 }
const  timeInSecs = function (days, hours, mins, secs) { return days * hours * mins * secs }
const  timeInDays = function (secs) { return (secs / (60 * 60 * 24)).toFixed(2) }
const  timeInDate = function (secs) { return moment.utc(secs * 1000).format("DD MMM YYYY hh:mm a") }

const vestedAmount = function (total, now, start, cliffDuration, duration) { return now < start + cliffDuration ? ethers.BigNumber.from(0) : total.mul(now - start).div(duration) }
const returnWeight = function (sourceWeight, destBal, destWeight, amount, block, op) {
  // console.log({sourceWeight, destBal, destWeight, amount})
  if (bn(destBal).eq(bn("0"))) return bn(0);
  const dstWeight = bn(destWeight).mul(bn(destBal));
  const srcWeight = bn(sourceWeight).mul(bn(amount));

  const totalWeight = dstWeight.add(srcWeight);
  const totalAmount = bn(destBal).add(amount);

  const totalAmountBy2 = totalAmount.div(bn(2));
  const roundUpWeight = totalWeight.add(totalAmountBy2);
  let holderWeight = roundUpWeight.div(totalAmount);
  if (op == "transfer") {
    return { holderWeight, totalAmount };
  } else {
    holderWeight = block;
    return { holderWeight, totalAmount };
  }
}

const calculateSumArithmeticSeriesAtN = (a1, d, n) => {
  const aN = a1.sub(n.sub(1).mul(d));
  const sumAtEpochN = n.mul((a1.add(aN)).div(2));
  return sumAtEpochN;
};

// For Distributing funds
const distributeInitialFunds = async function distributeInitialFunds(tokenContract, contract, amount, signer) {
  let balance;
  console.log(chalk.bgBlue.white(`Distributing Initial Funds`))
  console.log(chalk.bgBlack.white(`Sending Funds to ${contract.filename}`), chalk.green(`${ethers.utils.formatUnits(amount)} IONX`))

  balance = await tokenContract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`IONX Token Balance Before Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} IONX`))
  const tx = await tokenContract.transfer(contract.address, amount)
  await tx.wait()

  balance = await tokenContract.balanceOf(signer.address)
  console.log(chalk.bgBlack.white(`IONX Token Balance After Transfer:`), chalk.yellow(`${ethers.utils.formatUnits(balance)} IONX`))

  console.log(chalk.bgBlack.white(`Transaction hash:`), chalk.gray(`${tx.hash}`))
  console.log(chalk.bgBlack.white(`Transaction etherscan:`), chalk.gray(`https://${hre.network.name}.etherscan.io/tx/${tx.hash}`))
}

module.exports = {
  CONSTANT_1K,
  CONSTANT_10K,
  CONSTANT_100K,
  CONSTANT_1M,
  WETH,
  UNISWAP_FACTORY,
  UNISWAP_INIT_CODEHASH,
  bn,
  tokens,
  tokensBN,
  bnToInt,
  dateToEpoch,
  timeInSecs,
  timeInDays,
  timeInDate,
  vestedAmount,
  returnWeight,
  calculateSumArithmeticSeriesAtN,
  distributeInitialFunds,
}