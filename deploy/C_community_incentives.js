const {
    getDeployData,
    getContractAbi,
    getTxGasCost,
    saveDeploymentData,
    distributeInitialFunds,
    getIonxDistributionAmount,
    getLiquidityDistributionAmount,
    presets,
  } = require('../js-helpers/deploy');

  const {
    log,
    chainNameById,
    chainIdByName,
  } = require('../js-helpers/utils');

  const { weiPerEth } = require('../js-helpers/constants');

  const util = require('util');
  const _ = require('lodash');


  module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;

    const deployData = {};

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 7);
    const incentives = presets.Incentives[chainId];

    const daoSigner = ethers.provider.getSigner(protocolOwner);

    const ddIonx = getDeployData('Ionx', chainId);

    const CommunityVault = await ethers.getContractFactory('CommunityVault');
    const YieldFarm = await ethers.getContractFactory('YieldFarm');
    const Staking = await ethers.getContractFactory('Staking');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles CommunityVault - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    log('  Loading Ionx from: ', ddIonx.address);
    const Ionx = await ethers.getContractFactory('Ionx');
    const ionx = await Ionx.attach(ddIonx.address);

    await log(`\n  Deploying CommunityVault...`)(alchemyTimeout);
    const CommunityVaultInstance = await CommunityVault.deploy(ddIonx.address);
    const communityVault = await CommunityVaultInstance.deployed();
    deployData['CommunityVault'] = {
        abi: getContractAbi('CommunityVault'),
        address: communityVault.address,
        constructorArgs: [ddIonx.address],
        deployTransaction: communityVault.deployTransaction,
    };

    await log('\n  Deploying Staking Contract...')(alchemyTimeout);
    const stakingArgs = [incentives.staking.epoch1Start, incentives.staking.epochDuration];
    const StakingInstance = await Staking.deploy(...stakingArgs);
    const staking = await StakingInstance.deployed();
    deployData['Staking'] = {
        abi: getContractAbi('Staking'),
        address: staking.address,
        constructorArgs: stakingArgs,
        deployTransaction: staking.deployTransaction,
    };

    await log('\n  Deploying IONX Yield Farm...')(alchemyTimeout);
    const ionxYieldFarmDeployArgs = [
      ionx.address,
      ionx.address,
      staking.address,
      communityVault.address,
      incentives.ionxToken.startAmount.mul(weiPerEth).toString(),
      incentives.ionxToken.deprecation.mul(weiPerEth).toString(),
      incentives.ionxToken.nrOfEpochs.toString()
    ];
    const IonxYieldFarmInstance = await YieldFarm.deploy(...ionxYieldFarmDeployArgs);
    const ionxYieldFarm = await IonxYieldFarmInstance.deployed();
    deployData['IonxYieldFarm'] = {
      abi: getContractAbi('YieldFarm'),
      address: ionxYieldFarm.address,
      constructorArgs: ionxYieldFarmDeployArgs,
      deployTransaction: ionxYieldFarm.deployTransaction,
    };

    log('\n  Setting allowance for IonxYieldFarm to transfer $IONX from CommunityVault');
    const txAllowance = await communityVault.setAllowance(ionxYieldFarm.address, getIonxDistributionAmount(chainId));
    log('   Transaction hash:', txAllowance.hash);
    log('   Transaction etherscan:', `https://${hre.network.name}.etherscan.io/tx/${txAllowance.hash}`);

    // Transfer ownership?

    // Deploying LP Yield Farm Contract
    await log('\n  Deploying LP Yield Farm...')(alchemyTimeout);
    const lpYieldFarmDeployArgs = [
      ionx.address,
      incentives.uniswapLPTokenAddress,
      staking.address,
      communityVault.address,
      incentives.lpTokens.startAmount.mul(weiPerEth).toString(),
      incentives.lpTokens.deprecation.mul(weiPerEth).toString(),
      incentives.lpTokens.nrOfEpochs.toString()
    ];
    const LPYieldFarmInstance = await YieldFarm.deploy(...lpYieldFarmDeployArgs);
    const lpYieldFarm = await LPYieldFarmInstance.deployed();
    deployData['LPYieldFarm'] = {
        abi: getContractAbi('YieldFarm'),
        address: lpYieldFarm.address,
        constructorArgs: lpYieldFarmDeployArgs,
        deployTransaction: lpYieldFarm.deployTransaction,
    };

    log('\n  Setting allowance for LPYieldFarm to transfer $IONX from CommunityVault');
    const txAllowanceLP = await communityVault.setAllowance(lpYieldFarm.address, getLiquidityDistributionAmount(chainId));
    log('   Transaction hash:', txAllowanceLP.hash);
    log('   Transaction etherscan:', `https://${hre.network.name}.etherscan.io/tx/${txAllowanceLP.hash}`);


    // Next transfer appropriate funds
    log('\n   Distributing funds to CommunityVault...');
    await distributeInitialFunds(
      ionx.connect(daoSigner),
      communityVault,
      getIonxDistributionAmount(chainId).add(getLiquidityDistributionAmount(chainId)),
      protocolOwner,
    );

    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - CommunityVault: ', communityVault.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: communityVault.deployTransaction }));
    log('  - Staking:        ', staking.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: staking.deployTransaction }));
    log('  - YieldFarmIONX:  ', ionxYieldFarm.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: ionxYieldFarm.deployTransaction }));
    log('  - YieldFarmLP:    ', lpYieldFarm.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: lpYieldFarm.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployments" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['community-incentives'];