const { toBN } = require('./deploy');

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
    await contractInstance.connect(contractCaller)[contractMethod](
        ...contractParams,
        { value: callValue }
    );
    return returnValue;
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
        "callAndReturn": callAndReturn
    }
}