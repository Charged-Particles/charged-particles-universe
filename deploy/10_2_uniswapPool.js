const {
    chainNameById,
    chainIdByName,
    getDeployData,
    saveDeploymentData,
    getContractAbi,
    getTxGasCost,
    log,
    toBN,
    toWei,
    presets,
  } = require("../js-helpers/deploy");

  module.exports = async (hre) => {

    // if (hre.network.name == "hardhat" || hre.network.name == "localhost") {
    //     console.log(log(`Can't deploy Uniswap dependency script on Hardhat / localhost network... try testnet / mainnet\n`))
    //     process.exit(1)
    // }

    const { ethers, upgrades, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 1);
    const deployData = {};

    const ddIon = getDeployData('Ion', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: UniswapV2Pool - Contract Deployment');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', protocolOwner);
    log(' ');

    log('  Loading Ion from: ', ddIon.address);

    const uniswapV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Same mainnet & kovan

      // Get Uniswap V2 Router instance
    const UniswapV2Router = await hre.ethers.getContractAt("IUniswapV2Router02", uniswapV2Addr)

    //const reqTokens = toBN(DISTRIBUTION_INFO.community.unlocked.launch.uniswap);
    
    // TODO: CODE ME
};

module.exports.tags = ['generic']