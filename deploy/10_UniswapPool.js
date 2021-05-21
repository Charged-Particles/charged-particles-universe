const {
    chainNameById,
    chainIdByName,
    getDeployData,
    saveDeploymentData,
    getContractAbi,
    getTxGasCost,
    log,
    presets,
  } = require("../js-helpers/deploy");

  module.exports = async (hre) => {

    // if (hre.network.name == "hardhat" || hre.network.name == "localhost") {
    //     console.log(log(`Can't deploy Uniswap dependency script on Hardhat / localhost network... try testnet / mainnet\n`))
    //     process.exit(1)
    // }

    const { getNamedAccounts } = hre;
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
    const UniswapV2Router = await ethers.getContractAt("IUniswapV2Router02", )


    await log('\n  Deploying GenericWalletManager...')(alchemyTimeout);
    const GenericWalletManager = await hre.ethers.getContractFactory('GenericWalletManager');
    const GenericWalletManagerInstance = await GenericWalletManager.deploy();
    const genericWalletManager = await GenericWalletManagerInstance.deployed();
    deployData['GenericWalletManager'] = {
      abi: getContractAbi('GenericWalletManager'),
      address: genericWalletManager.address,
      deployTransaction: genericWalletManager.deployTransaction,
    }


    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - GenericWalletManager:  ', genericWalletManager.address);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericWalletManager.deployTransaction }));
    log('  - GenericBasketManager:  ', genericBasketManager.address);
    log('     - Gas Cost:           ', getTxGasCost({ deployTransaction: genericBasketManager.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['generic']