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

  const chalk = require('chalk');


  const {
    log,
    chainTypeById,
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
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);
    const __STAKING_INDEX = isHardhat ? '' : 3;
    const incentives = presets.Incentives[chainId];

    const daoSigner = ethers.provider.getSigner(protocolOwner);

    const YieldFarm = await ethers.getContractFactory(`YieldFarm${__STAKING_INDEX}`);
    const Staking = await ethers.getContractFactory(`Staking${__STAKING_INDEX}`);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles CommunityVault - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');

    const ddIonx = getDeployData('Ionx', chainId);
    log('  Loading Ionx from: ', ddIonx.address);
    const Ionx = await ethers.getContractFactory('Ionx');
    const ionx = await Ionx.attach(ddIonx.address);

    let CommunityVault;
    let communityVault;

    if (isHardhat) {
      await log(`\n  Deploying CommunityVault...`)(alchemyTimeout);
      CommunityVault = await ethers.getContractFactory('CommunityVault');
      CommunityVaultInstance = await CommunityVault.deploy(ddIonx.address);
      communityVault = await CommunityVaultInstance.deployed();
      deployData['CommunityVault'] = {
          abi: getContractAbi('CommunityVault'),
          address: communityVault.address,
          constructorArgs: [ddIonx.address],
          deployTransaction: communityVault.deployTransaction,
      };
    } else {
      const ddCommunityVault = getDeployData('CommunityVault', chainId);
      log('  Loading CommunityVault from: ', ddCommunityVault.address);
      CommunityVault = await ethers.getContractFactory('CommunityVault');
      communityVault = await CommunityVault.attach(ddCommunityVault.address);
    }

    await log(`\n  Deploying Staking Contract ${__STAKING_INDEX}...`)(alchemyTimeout);
    const stakingArgs = [incentives.staking.epoch1Start, incentives.staking.epochDuration];
    const StakingInstance = await Staking.deploy(...stakingArgs);
    const staking = await StakingInstance.deployed();
    deployData[`Staking${__STAKING_INDEX}`] = {
        abi: getContractAbi(`Staking${__STAKING_INDEX}`),
        address: staking.address,
        constructorArgs: stakingArgs,
        deployTransaction: staking.deployTransaction,
    };

    await log(`\n  Deploying IONX Yield Farm ${__STAKING_INDEX}...`)(alchemyTimeout);
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
    deployData[`IonxYieldFarm${__STAKING_INDEX}`] = {
      abi: getContractAbi(`YieldFarm${__STAKING_INDEX}`),
      address: ionxYieldFarm.address,
      constructorArgs: ionxYieldFarmDeployArgs,
      deployTransaction: ionxYieldFarm.deployTransaction,
    };

    log(`\n  Setting allowance for IONX YieldFarm ${__STAKING_INDEX} to transfer $IONX from CommunityVault`);
    const txAllowance = await communityVault.setAllowance(ionxYieldFarm.address, getIonxDistributionAmount(chainId));
    log('   Transaction hash:', txAllowance.hash);
    log('   Transaction etherscan:', `https://${hre.network.name}.etherscan.io/tx/${txAllowance.hash}`);

    // Transfer ownership?

    // Deploying LP Yield Farm Contract
    await log(`\n  Deploying LP Yield Farm ${__STAKING_INDEX}...`)(alchemyTimeout);
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
    deployData[`LPYieldFarm${__STAKING_INDEX}`] = {
        abi: getContractAbi(`YieldFarm${__STAKING_INDEX}`),
        address: lpYieldFarm.address,
        constructorArgs: lpYieldFarmDeployArgs,
        deployTransaction: lpYieldFarm.deployTransaction,
    };

    log(`\n  Setting allowance for LPYieldFarm ${__STAKING_INDEX} to transfer $IONX from CommunityVault`);
    const txAllowanceLP = await communityVault.setAllowance(lpYieldFarm.address, getLiquidityDistributionAmount(chainId));
    log('   Transaction hash:', txAllowanceLP.hash);
    log('   Transaction etherscan:', `https://${hre.network.name}.etherscan.io/tx/${txAllowanceLP.hash}`);


    // Next transfer appropriate funds
    if (chainId != 1) {
      log(`\n   Distributing funds to CommunityVault: ${chalk.green(ethers.utils.formatUnits(getIonxDistributionAmount(chainId)))} IONX + ${chalk.green(ethers.utils.formatUnits(getLiquidityDistributionAmount(chainId)))}  IONX`);
      await distributeInitialFunds(
        ionx.connect(daoSigner),
        communityVault,
        getIonxDistributionAmount(chainId).add(getLiquidityDistributionAmount(chainId)),
        protocolOwner,
      );
    } else {
      log(`\n   TODO: Manually Distribute funds to CommunityVault: ${chalk.green(ethers.utils.formatUnits(getIonxDistributionAmount(chainId)))} IONX + ${chalk.green(ethers.utils.formatUnits(getLiquidityDistributionAmount(chainId)))}  IONX`);
    }

    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    if (isHardhat) {
      log('  - CommunityVault: ', communityVault.address);
      log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: communityVault.deployTransaction }));
    }
    log(`  - Staking${__STAKING_INDEX}:        `, staking.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: staking.deployTransaction }));
    log(`  - YieldFarm${__STAKING_INDEX} (IONX):  `, ionxYieldFarm.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: ionxYieldFarm.deployTransaction }));
    log(`  - YieldFarm${__STAKING_INDEX} (LP):    `, lpYieldFarm.address);
    log('     - Gas Cost:    ', getTxGasCost({ deployTransaction: lpYieldFarm.deployTransaction }));

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployments" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['incentives'];
