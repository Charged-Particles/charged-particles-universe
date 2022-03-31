const {
  log,
  toEth,
  bn,
} = require('./utils');

const _ = require('lodash');

let __accumulatedGasCost = bn(0);

const accumulatedGasCost = (tx) => {
  let gasCost = bn(0);
  if (_.get(tx, 'gasUsed', false) && _.get(tx, 'effectiveGasPrice', false)) {
    gasCost = tx.gasUsed.mul(tx.effectiveGasPrice);
  } else if (_.get(tx, 'gasPrice', false) && _.get(tx, 'gasLimit', false)) {
    gasCost = tx.gasLimit.mul(tx.gasPrice);
  }
  __accumulatedGasCost = __accumulatedGasCost.add(gasCost);
};

const getAccumulatedGasCost = () => {
  if (__accumulatedGasCost === 0) {
    return ['0 ETH', '0 ETH', '0 ETH'];
  }
  const gwei1   = `${toEth(__accumulatedGasCost.div(10))} ETH`;
  const gwei10  = `${toEth(__accumulatedGasCost)} ETH`;
  const gwei100 = `${toEth(__accumulatedGasCost.mul(10))} ETH`;
  const gwei150 = `${toEth(__accumulatedGasCost.mul(15))} ETH`;
  __accumulatedGasCost = bn(0);
  return [gwei1, gwei10, gwei100, gwei150];
};

const resetAccumulatedGasCost = () => {
  __accumulatedGasCost = bn(0);
};

let __skipTo = '';
const skipToTxId = (txId) => {
  __skipTo = txId;
}
const executeTx = async (txId, txDesc, callback, delay = 0) => {
  if (!_.isEmpty(__skipTo) && __skipTo !== txId) {
    log(`  - Skipping ${txId}`);
    return;
  }
  if (!_.isEmpty(__skipTo)) {
    __skipTo = '';
    log(`\n`);
  }
  try {
    if (txId === '1-a') {
      log(`\n`);
    }
    await log(`  - [TX-${txId}] ${txDesc}`)(delay);
    const tx = await callback();
    const txResult = await tx.wait();
    accumulatedGasCost(txResult);
  }
  catch (err) {
    log(`  - Transaction ${txId} Failed: ${err}`);
    log(`  - Retrying;`);
    await executeTx(txId, txDesc, callback, delay + 3);
  }
}


module.exports = {
  executeTx,
  skipToTxId,
  accumulatedGasCost,
  getAccumulatedGasCost,
  resetAccumulatedGasCost,
};
