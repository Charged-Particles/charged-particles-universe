const {
    chainNameById,
    chainIdByName,
    getDeployData,
    log,
    toBN,
    presets,
  } = require("../js-helpers/deploy");
  
  const _ = require('lodash');

  module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
    const network = await hre.network;

    const deployData = {};

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 7);

    const ddIon = getDeployData('Ion', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles CommunityVault - Contract Initialization');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log('  - Trusted Forwarder: ', trustedForwarder);
    log(' ');
    
    log('  Loading Ion from: ', ddIon.address);
    const Ion = await ethers.getContractFactory('Ion');
    const ion = await Ion.attach(ddIon.address);


    await log('\n  Deploying CommunityVault...')(alchemyTimeout);
    const CommunityVault = await ethers.getContractFactory('CommunityVault');
    const CommunityVaultInstance = await CommunityVault.deploy(ddIon.address);
    const communityVault = await CommunityVaultInstance.deployed();

    deployData['CommunityVault'] = {
        abi: getContractAbi('CommunityVault'),
        address: communityVault.address,
        deployTransaction: communityVault.deployTransaction,
    };  

    await log('\n  Deployed CommunityVault')(alchemyTimeout);

    // Next transfer appropriate funds
    await distributeInitialFunds(
        ion,
        communityVault,
        STAKING_INFO.stakingInfo.helpers.getIonDistributionAmount().add(STAKING_INFO.stakingInfo.helpers.getLiquidityDistributionAmount()),
        deployer
    );

    await log('\n  Deploying Staking Contract...')(alchemyTimeout);

    const yieldFarmIONXInitialArgs = STAKING_INFO.stakingInfo.ionToken;

    // Deploying Staking Contract
    const stakingInitialArgs = STAKING_INFO.stakingInfo.staking
    const stakingArgs = [yieldFarmIONXInitialArgs.epoch1Start, stakingInitialArgs.epochDuration];

    const Staking = await ethers.getContractFactory('Staking');
    const StakingInstance = await Staking.deploy(...stakingArgs);
    const staking = await StakingInstance.deployed();

    deployData['Staking'] = {
        abi: getContractAbi('Staking'),
        address: staking.address,
        deployTransaction: staking.deployTransaction,
    };  

    await log('\n  Deployed Staking')(alchemyTimeout);

    // Deploying IONX Yield Farm Contract
    const yieldFarmIONXDeployArgs = [
        ion.address,
        ion.address,
        staking.address,
        communityVault.address,
        yieldFarmIONXInitialArgs.startAmount.mul(ethers.BigNumber.from(10).pow(18)).toString(),
        yieldFarmIONXInitialArgs.deprecation.mul(ethers.BigNumber.from(10).pow(18)).toString(),
        yieldFarmIONXInitialArgs.nrOfEpochs.toString()
      ]
    const YieldFarm = await ethers.getContractFactory('YieldFarm');
    const YieldFarmInstance = await YieldFarm.deploy(...yieldFarmIONXDeployArgs);
    const yieldFarm = await YieldFarmInstance.deployed();

    deployData['YieldFarmIONX'] = {
        abi: getContractAbi('YieldFarm'),
        address: yieldFarm.address,
        deployTransaction: yieldFarm.deployTransaction,
    };  

    await log('\n  Deployed YieldFarm')(alchemyTimeout);

    log('\n  Setting allowance for YieldFarm to spend $IONX from CommunityVault');
    const txAllowance = await communityVault.setAllowance(yieldFarm.address, STAKING_INFO.stakingInfo.helpers.getIonDistributionAmount());
    log('\n   Transaction hash:', txAllowance.hash);
    log('\n   Transaction etherscan:', `https://${hre.network.name}.etherscan.io/tx/${txAllowance.hash}`);

    // Transfer ownership?

    // Deploying LP Rewards Farm Contract
    await log('\n  Deploying LP Yield Farming Contract...')(alchemyTimeout);
    const yieldFarmLPInitialArgs = STAKING_INFO.stakingInfo.liquidityPoolTokens

    log('\n     UniV2Token:', presets.UniV2LPTokenAddress[chainId]);
    const yieldFarmLPArgs = [
        ion.address,
        presets.UniV2LPTokenAddress[chainId],
        staking.address,
        communityVault.address,
        yieldFarmLPInitialArgs.startAmount.mul(ethers.BigNumber.from(10).pow(18)).toString(),
        yieldFarmLPInitialArgs.deprecation.mul(ethers.BigNumber.from(10).pow(18)).toString(),
        yieldFarmLPInitialArgs.nrOfEpochs.toString()
      ]

    const YieldFarmLP = await ethers.getContractFactory('YieldFarm');
    const YieldFarmLPInstance = await YieldFarmLP.deploy(...yieldFarmLPArgs);
    const yieldFarmLP = await YieldFarmLPInstance.deployed();

    deployData['YieldFarmLP'] = {
        abi: getContractAbi('YieldFarm'),
        address: yieldFarmLP.address,
        deployTransaction: yieldFarmLP.deployTransaction,
    };  

    await log('\n  Deployed YieldFarmLP')(alchemyTimeout);

    log('\n  Setting allowance for YieldFarmLP to spend $IONX from CommunityVault');
    const txAllowanceLP = await communityVault.setAllowance(yieldFarmLP.address, STAKING_INFO.stakingInfo.helpers.getLiquidityDistributionAmount());
    log('\n   Transaction hash:', txAllowanceLP.hash);
    log('\n   Transaction etherscan:', `https://${hre.network.name}.etherscan.io/tx/${txAllowanceLP.hash}`);

      

    // Display Contract Addresses
    await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
    log('  - CommunityVault:      ', communityVault.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: communityVault.deployTransaction }));
    log('  - Staking:      ', staking.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: staking.deployTransaction }));
    log('  - YieldFarmIONX:      ', yieldFarm.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: yieldFarm.deployTransaction }));
    log('  - YieldFarmLP:      ', yieldFarmLP.address);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: yieldFarmLP.deployTransaction }));


    log('\n  Incentives Contracts Deployments & AllowancesComplete!');

    saveDeploymentData(chainId, deployData);
    log('\n  Contract Deployment Data saved to "deployed" directory.');

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');


}

module.exports.tags = ['community-incentives']