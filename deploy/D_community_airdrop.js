const {
  getDeployData,
  getContractAbi,
  getTxGasCost,
  saveDeploymentData,
  distributeInitialFunds,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

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
  const incentives = presets.Incentives[chainId];
  const vesting = presets.Vesting.month1;

  const daoSigner = ethers.provider.getSigner(protocolOwner);

  const ddIonx = getDeployData('Ionx', chainId);

  // const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor');
  // const MerkleDistributor2 = await ethers.getContractFactory('MerkleDistributor2');
  const VestingClaim = await ethers.getContractFactory('VestingClaim');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Airdrop - Contract Initialization');
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

  // await log(`\n  Deploying MerkleDistributor...`)(alchemyTimeout);
  // const MerkleDistributorInstance = await MerkleDistributor.deploy(ddIonx.address, incentives.airdrop.merkleRoot);
  // const merkleDistributor = await MerkleDistributorInstance.deployed();
  // deployData['MerkleDistributor'] = {
  //   abi: getContractAbi('MerkleDistributor'),
  //   address: merkleDistributor.address,
  //   constructorArgs: [ddIonx.address, incentives.airdrop.merkleRoot],
  //   deployTransaction: merkleDistributor.deployTransaction,
  // };

  // await log(`\n  Deploying MerkleDistributor2 with Expiry: ${new Date(incentives.airdrop.expiryDate * 1000).toLocaleDateString("en-US")}...`)(alchemyTimeout);
  // const MerkleDistributor2Instance = await MerkleDistributor2.deploy(ddIonx.address, incentives.airdrop.merkleRoot, incentives.airdrop.expiryDate);
  // const merkleDistributor2 = await MerkleDistributor2Instance.deployed();
  // deployData['MerkleDistributor2'] = {
  //   abi: getContractAbi('MerkleDistributor2'),
  //   address: merkleDistributor2.address,
  //   constructorArgs: [ddIonx.address, incentives.airdrop.merkleRoot, incentives.airdrop.expiryDate],
  //   deployTransaction: merkleDistributor2.deployTransaction,
  // };

  await log(`\n  Deploying VestingClaim with Expiry: ${new Date(vesting.expiryDate * 1000).toLocaleDateString("en-US")}...`)(alchemyTimeout);
  const VestingClaimInstance = await VestingClaim.deploy(ddIonx.address, vesting.merkleRoot, vesting.expiryDate);
  const vestingClaim = await VestingClaimInstance.deployed();
  deployData['VestingClaim'] = {
    abi: getContractAbi('VestingClaim'),
    address: vestingClaim.address,
    constructorArgs: [ddIonx.address, vesting.merkleRoot, vesting.expiryDate],
    deployTransaction: vestingClaim.deployTransaction,
  };

  // Next transfer appropriate funds (Testnet only; Mainnet requires IONX DAO)
  if (chainId != 1) {
    // log('\n   Distributing Airdrop funds to MerkleDistributor...');
    // await distributeInitialFunds(
    //   ionx.connect(daoSigner),
    //   merkleDistributor,
    //   incentives.airdrop.totalIonx,
    //   protocolOwner,
    // );

    // log('\n   Distributing Airdrop funds to MerkleDistributor2...');
    // await distributeInitialFunds(
    //   ionx.connect(daoSigner),
    //   merkleDistributor2,
    //   incentives.airdrop.totalIonx,
    //   protocolOwner,
    // );

    log('\n   Distributing Vested funds to VestingClaim...');
    await distributeInitialFunds(
      ionx.connect(daoSigner),
      vestingClaim,
      vesting.totalIonx,
      protocolOwner,
    );
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  // log('  - MerkleDistributor: ', merkleDistributor.address);
  // log('     - Gas Cost:       ', getTxGasCost({ deployTransaction: merkleDistributor.deployTransaction }));
  // log('  - MerkleDistributor2: ', merkleDistributor2.address);
  // log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: merkleDistributor2.deployTransaction }));
  log('  - VestingClaim: ', vestingClaim.address);
  log('     - Gas Cost:  ', getTxGasCost({ deployTransaction: vestingClaim.deployTransaction }));

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['airdrop'];
