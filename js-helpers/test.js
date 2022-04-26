const { toBN } = require('./utils');

const getNetworkBlockNumber = (network) => async () => {
    return toBN(
        await network.provider.request({
            method: "eth_blockNumber",
            params: []
        })
    );
}

const setNetworkAfterBlockNumber = (network) => async (blockNumber) => {
    let currentBlockNumber = await getNetworkBlockNumber(network)();
    while(currentBlockNumber.lt(blockNumber)) {
        await network.provider.request({
            method: "evm_mine",
            params: []
        });
        currentBlockNumber = currentBlockNumber.add(toBN('1'));
    }
}

const callAndReturn = async ({
    contractInstance,
    contractMethod,
    contractCaller,
    contractParams = [],
    callValue = '0',
  }) => {
    const returnValue = await contractInstance.connect(contractCaller).callStatic[contractMethod](
        ...contractParams,
        { value: callValue }
    );
    const tx = await contractInstance.connect(contractCaller)[contractMethod](
        ...contractParams,
        { value: callValue }
    );
    await tx.wait();
    return returnValue;
}

const callAndReturnWithLogs = async ({
    contractInstance,
    contractMethod,
    contractCaller,
    contractParams = [],
    callValue = '0',
  }) => {
    const returnValue = await contractInstance.connect(contractCaller).callStatic[contractMethod](
        ...contractParams,
        { value: callValue }
    );
    const tx = await contractInstance.connect(contractCaller)[contractMethod](
        ...contractParams,
        { value: callValue }
    );
    const txResults = await tx.wait();
    return {tx, txResults, logs: txResults.logs, returnValue};
}

const setNetworkAfterTimestamp = (network) => async (timestamp) => {
    await network.provider.request({
        method: "evm_setNextBlockTimestamp",
        params: [timestamp]
    });
    await network.provider.request({
        method: "evm_mine",
        params: []
    });
}

module.exports = (network) => {
    return {
        "getNetworkBlockNumber": getNetworkBlockNumber(network),
        "setNetworkAfterBlockNumber": setNetworkAfterBlockNumber(network),
        "setNetworkAfterTimestamp": setNetworkAfterTimestamp(network),
        "callAndReturn": callAndReturn,
        "callAndReturnWithLogs": callAndReturnWithLogs
    }
}