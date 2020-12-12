const { toBN } = require('../../js-utils/deploy-helpers');

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

module.exports = (network) => {
    return {
        "getNetworkBlockNumber": getNetworkBlockNumber(network),
        "setNetworkAfterBlockNumber": setNetworkAfterBlockNumber(network)
    }
}