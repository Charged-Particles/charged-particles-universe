const {
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
} = require('../js-helpers/deploy');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre;
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts();
  const network = await hre.network;
  const deployData = {};

  const chainId = chainIdByName(network.name);
  const {isProd, isHardhat} = chainTypeById(chainId);
  const alchemyTimeout = isHardhat ? 0 : (isProd ? 3 : 2);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Tokens - Contract Deployment');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log(`  Using Network: ${chainNameById(chainId)} (${chainId})`);
  log('  Using Accounts:');
  log('  - Deployer:          ', deployer);
  log('  - Owner:             ', protocolOwner);
  log('  - Trusted Forwarder: ', trustedForwarder);
  log(' ');

  await log('\n  Deploying Proton NFT...')(alchemyTimeout);
  const Proton = await ethers.getContractFactory('Proton');
  const ProtonInstance = await Proton.deploy();
  const proton = await ProtonInstance.deployed();
  deployData['Proton'] = {
    abi: getContractAbi('Proton'),
    address: proton.address,
    deployTransaction: proton.deployTransaction,
  }

  await log('\n  Deploying ProtonB NFT...')(alchemyTimeout);
  const ProtonB = await ethers.getContractFactory('ProtonB');
  const ProtonBInstance = await ProtonB.deploy();
  const protonB = await ProtonBInstance.deployed();
  deployData['ProtonB'] = {
    abi: getContractAbi('ProtonB'),
    address: protonB.address,
    deployTransaction: protonB.deployTransaction,
  }

  let LeptonInstance, Lepton, lepton;
  if (isHardhat) {
    await log('\n  Deploying Lepton NFT...')(alchemyTimeout);
    Lepton = await ethers.getContractFactory('Lepton');
    LeptonInstance = await Lepton.deploy();
    lepton = await LeptonInstance.deployed();
    deployData['Lepton'] = {
      abi: getContractAbi('Lepton'),
      address: lepton.address,
      deployTransaction: lepton.deployTransaction,
    }
  }

  await log('\n  Deploying Lepton2 NFT...')(alchemyTimeout);
  const Lepton2 = await ethers.getContractFactory('Lepton2');
  const Lepton2Instance = await Lepton2.deploy();
  const lepton2 = await Lepton2Instance.deployed();
  deployData['Lepton2'] = {
    abi: getContractAbi('Lepton2'),
    address: lepton2.address,
    deployTransaction: lepton2.deployTransaction,
  }

  await log('\n  Deploying Ionx FT...')(alchemyTimeout);
  const Ionx = await ethers.getContractFactory('Ionx');
  const IonxInstance = await Ionx.deploy();
  const ionx = await IonxInstance.deployed();
  deployData['Ionx'] = {
    abi: getContractAbi('Ionx'),
    address: ionx.address,
    deployTransaction: ionx.deployTransaction,
  }

  let externalERC721, nonFungibleERC1155, fungibleERC1155
  if (!isProd) {
    await log('\n  Deploying ExternalERC721...')(alchemyTimeout);
    const ExternalERC721 = await ethers.getContractFactory('ExternalERC721');
    const ExternalERC721Instance = await ExternalERC721.deploy();
    externalERC721 = await ExternalERC721Instance.deployed();
    deployData['ExternalERC721'] = {
      abi: getContractAbi('ExternalERC721'),
      address: externalERC721.address,
      deployTransaction: externalERC721.deployTransaction,
    }

    await log('\n  Deploying NonFungibleERC1155...')(alchemyTimeout);
    const NonFungibleERC1155 = await ethers.getContractFactory('NonFungibleERC1155');
    const NonFungibleERC1155Instance = await NonFungibleERC1155.deploy();
    nonFungibleERC1155 = await NonFungibleERC1155Instance.deployed();
    deployData['NonFungibleERC1155'] = {
      abi: getContractAbi('NonFungibleERC1155'),
      address: nonFungibleERC1155.address,
      deployTransaction: nonFungibleERC1155.deployTransaction,
    }

    await log('\n  Deploying FungibleERC1155...')(alchemyTimeout);
    const FungibleERC1155 = await ethers.getContractFactory('FungibleERC1155');
    const FungibleERC1155Instance = await FungibleERC1155.deploy();
    fungibleERC1155 = await FungibleERC1155Instance.deployed();
    deployData['FungibleERC1155'] = {
      abi: getContractAbi('FungibleERC1155'),
      address: fungibleERC1155.address,
      deployTransaction: fungibleERC1155.deployTransaction,
    }
  }

  // Display Contract Addresses
  await log('\n  Contract Deployments Complete!\n\n  Contracts:')(alchemyTimeout);
  log('  - Proton:      ', proton.address);
  log('     - Block:    ', proton.deployTransaction.blockNumber);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));
  log('  - ProtonB:     ', protonB.address);
  log('     - Block:    ', protonB.deployTransaction.blockNumber);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: protonB.deployTransaction }));
  if (isHardhat) {
    log('  - Lepton:      ', lepton.address);
    log('     - Block:    ', lepton.deployTransaction.blockNumber);
    log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton.deployTransaction }));
  }
  log('  - Lepton2:     ', lepton2.address);
  log('     - Block:    ', lepton2.deployTransaction.blockNumber);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: lepton2.deployTransaction }));
  log('  - Ionx:        ', ionx.address);
  log('     - Block:    ', ionx.deployTransaction.blockNumber);
  log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ionx.deployTransaction }));
  if (!isProd) {
    log('  - ExternalERC721:     ', externalERC721.address);
    log('     - Block:           ', externalERC721.deployTransaction.blockNumber);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: externalERC721.deployTransaction }));
    log('  - NonFungibleERC1155: ', nonFungibleERC1155.address);
    log('     - Block:           ', nonFungibleERC1155.deployTransaction.blockNumber);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: nonFungibleERC1155.deployTransaction }));
    log('  - FungibleERC1155:    ', fungibleERC1155.address);
    log('     - Block:           ', fungibleERC1155.deployTransaction.blockNumber);
    log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: fungibleERC1155.deployTransaction }));
  }

  saveDeploymentData(chainId, deployData);
  log('\n  Contract Deployment Data saved to "deployments" directory.');

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['tokens']