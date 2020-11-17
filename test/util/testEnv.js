const buidler = require('@nomiclabs/buidler');
const { deployments } = buidler;

const { deployContract, deployMockContract } = require('ethereum-waffle');
const { ethers } = require('ethers');
const { expect } = require('chai');

// buidler.ethers.errors.setLogLevel('error');

module.exports = {
    buidler,
    deployments,
    ethers,
    expect,

    deployContract,
    deployMockContract,

    EMPTY_STR: ethers.utils.formatBytes32String(""),
    ZERO_ADDRESS: ethers.constants.AddressZero,
};
