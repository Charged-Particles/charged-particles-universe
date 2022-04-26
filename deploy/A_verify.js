const util = require('util');
const exec = util.promisify(require('child_process').exec);
const _ = require('lodash');

const {
  log,
  chainTypeById,
  chainIdByName,
  chainNameById,
} = require('../js-helpers/utils');

const {
  getDeployData,
  getOZProjectData,
} = require('../js-helpers/deploy');


const _findImplementationAddress = (implementations, contractName) => {
  const implKey = _.findKey(implementations, (data) => {
    const contract = _.get(_.last(_.get(data, 'layout.storage', [])), 'contract', false);
    return contract === contractName;
  });
  return _.get(implementations, `${implKey}.address`, '');
};

const _verifyProxyContract = async ({name, networkName}) => {
  const chainId = chainIdByName(networkName);
  const projectData = getOZProjectData(chainId);

  let implementationAddress = '';
  const deployData = getDeployData(name, chainId);
  const deployTx = _.get(deployData, 'upgradeTransaction', _.get(deployData, 'deployTransaction', ''));
  if (!_.isEmpty(deployTx)) {
    implementationAddress = _findImplementationAddress(projectData.impls, name);
  }

  if (_.isEmpty(implementationAddress)) {
    log(`Failed to Verify Proxy: "${name}" - Implementation Address not found!`);
    return;
  }

  // Verify Implementation
  log(`Found implementation address for ${name} Proxy: "${implementationAddress}";`);
  await _verifyContract({name, networkName, addressOverride: implementationAddress});
};

const _verifyContract = async ({name, networkName, contractRef = null, addressOverride = null}) => {
  try {
    const deployment = (await deployments.get(name)) || {};
    const address = addressOverride || deployment.address;
    const constructorArgs = deployment.constructorArgs || [];
    log(`Verifying ${name} at address "${address}" ${constructorArgs ? `with ${constructorArgs.length} arg(s)` : ''}...`);

    const execArgs = constructorArgs.map(String).join(' ');
    const execCmd = [];
    execCmd.push('hardhat', 'verify', '--network', networkName);
    if (_.isString(contractRef) && contractRef.length > 0) {
      execCmd.push('--contract', `contracts/${contractRef}`);
    }
    execCmd.push(address, execArgs);

    log(`CMD: ${execCmd.join(' ')}`);
    await exec(execCmd.join(' '));
    log(`${name} verified!\n`);
  }
  catch (err) {
    if (/Contract source code already verified/.test(err.message || err)) {
      log(`${name} already verified\n`);
    } else {
      console.error(err);
    }
  }
}

module.exports = async (hre) => {
  const { ethers, getNamedAccounts } = hre;
  const { deployer, protocolOwner } = await getNamedAccounts();

  const network = await hre.network;
  const chainId = chainIdByName(network.name);

  const {isHardhat} = chainTypeById(chainId);
  if (isHardhat) { return; }

  const networkName = network.name === 'homestead' ? 'mainnet' : network.name;
  log(`Verifying contracts on network "${networkName} (${chainId})"...`);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Contract Verification');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', protocolOwner);
  log(' ');

  // Protocol
  await _verifyProxyContract({name: 'Universe', networkName});
  await _verifyProxyContract({name: 'ChargedParticles', networkName});
  await _verifyProxyContract({name: 'ChargedState', networkName});
  await _verifyProxyContract({name: 'ChargedSettings', networkName});
  await _verifyProxyContract({name: 'ChargedManagers', networkName});
  await _verifyContract({name: 'Ionx', networkName});
  await _verifyContract({name: 'ParticleSplitter', networkName});
  await _verifyContract({name: 'TokenInfoProxy', networkName});

  // Wallet Managers
  await _verifyContract({name: 'GenericWalletManager', networkName});
  await _verifyContract({name: 'GenericBasketManager', networkName});
  await _verifyContract({name: 'AaveWalletManager', networkName});
  await _verifyContract({name: 'GenericWalletManagerB', networkName});
  await _verifyContract({name: 'GenericBasketManagerB', networkName});
  await _verifyContract({name: 'AaveWalletManagerB', networkName});

  // NFTs
  await _verifyContract({name: 'Proton', networkName});
  await _verifyContract({name: 'ProtonB', networkName});
  await _verifyContract({name: 'Lepton', networkName});
  await _verifyContract({name: 'Lepton2', networkName});
  await _verifyContract({name: 'ExternalERC721', networkName});
  await _verifyContract({name: 'FungibleERC1155', networkName});
  await _verifyContract({name: 'NonFungibleERC1155', networkName});




  // Incentives
  // await _verifyContract({name: 'CommunityVault', networkName});

  // await _verifyContract({name: 'Staking', networkName});
  // await _verifyContract({name: 'IonxYieldFarm', networkName});
  // await _verifyContract({name: 'LPYieldFarm', networkName});

  // await _verifyContract({name: 'Staking2', networkName, contractRef: 'incentives/Staking2.sol:Staking2'});
  // await _verifyContract({name: 'IonxYieldFarm2', networkName, contractRef: 'incentives/YieldFarm2.sol:YieldFarm2'});
  // await _verifyContract({name: 'LPYieldFarm2', networkName, contractRef: 'incentives/YieldFarm2.sol:YieldFarm2'});

  // await _verifyContract({name: 'Staking3', networkName, contractRef: 'incentives/Staking3.sol:Staking3'});
  // await _verifyContract({name: 'IonxYieldFarm3', networkName, contractRef: 'incentives/YieldFarm3.sol:YieldFarm3'});
  // await _verifyContract({name: 'LPYieldFarm3', networkName, contractRef: 'incentives/YieldFarm3.sol:YieldFarm3'});

  // await _verifyContract({name: 'MerkleDistributor', networkName});
  // await _verifyContract({name: 'MerkleDistributor2', networkName});
  // await _verifyContract({name: 'MerkleDistributor3', networkName});

  // await _verifyContract({name: 'VestingClaim2', networkName});
  // await _verifyContract({name: 'VestingClaim3', networkName});
  // await _verifyContract({name: 'VestingClaim4', networkName});


  log('\n  Contract Verification Complete.');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['verify']
