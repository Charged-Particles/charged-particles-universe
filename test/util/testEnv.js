const hardhat = require('hardhat');
const { deployments } = hardhat;

const { deployContract, deployMockContract } = require('ethereum-waffle');
const { ethers } = require('ethers');
const { expect } = require('chai');
const { deploy } = require('../../js-utils/deploy-helpers');
// hardhat.ethers.errors.setLogLevel('error');

module.exports = {
    hardhat,
    deployments,
    ethers,
    expect,
    deploy,

    deployContract,
    deployMockContract,

    EMPTY_STR: ethers.utils.formatBytes32String(""),
    ZERO_ADDRESS: ethers.constants.AddressZero,
};
