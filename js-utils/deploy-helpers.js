const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const toWei = ethers.utils.parseEther;
const toEth = ethers.utils.formatEther;
const toBN = ethers.BigNumber.from;
const toStr = (val) => ethers.utils.toUtf8String(val).replace(/\0/g, '');
const weiPerEth = ethers.constants.WeiPerEther;

const txOverrides = (options = {}) => ({ gasLimit: 15000000, ...options });

const chainName = (chainId) => {
  switch (chainId) {
    case 1: return 'Mainnet'
    case 3: return 'Ropsten'
    case 42: return 'Kovan'
    case 31337: return 'Hardhat'
    default: return 'Unknown'
  }
};

const blockTimeFromDate = (dateStr) => {
  return Date.parse(dateStr) / 1000;
};

const ensureDirectoryExistence = (filePath) => {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};

const saveDeploymentData = (chainId, deployData) => {
  const network = chainName(chainId).toLowerCase();
  const deployPath = path.join(__dirname, '..', 'deployed');

  _.forEach(_.keys(deployData), (contractName) => {
    const filename = `${deployPath}/${contractName}.json`;

    let existingData = {};
    if (fs.existsSync(filename)) {
      existingData = JSON.parse(fs.readFileSync(filename));
    }

    const newData = _.merge(existingData, {
      [chainId]: deployData[contractName]
    });
    ensureDirectoryExistence(filename);
    fs.writeFileSync(filename, JSON.stringify(newData, null, "\t"));
  });
};

const getContractAbi = (contractName) => {
  const buildPath = path.join(__dirname, '..', 'build');
  const filename = `${buildPath}/${contractName}.json`;
  const contractJson = require(filename);
  return contractJson.abi;
};

const getDeployData = (contractName, chainId) => {
  const deployPath = path.join(__dirname, '..', 'deployed');
  const filename = `${deployPath}/${contractName}.json`;
  const contractJson = require(filename);
  return contractJson[chainId];
}

const getTxGasCost = ({ deployTransaction }) => {
  const gasCost = toEth(deployTransaction.gasLimit.mul(deployTransaction.gasPrice));
  return `${gasCost} ETH`;
};


const presets = {
  ChargedParticles: {
    fees: {
      deposit: 50, // 0.5%
    }
  },
  Ion: {
    rewardsForAssetTokens: [
      { assetTokenId: 'Aave.dai', multiplier: '5000' }, // DAI
    ],
    timelocks: [
      {
        receiver: '0xb14d1a16f30dB670097DA86D4008640c6CcC2B76',  // Testing - Account 3
        portions: [
          { amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('20 Nov 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('21 Nov 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('1000'), releaseDate: blockTimeFromDate('22 Nov 2020 00:00:00 GMT') },
        ]
      },
      {
        receiver: '0xF55D5df4fa26c454a5635B4697C2Acf92f55cfD8',  // Testing - Account 4
        portions: [
          { amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('20 Nov 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('21 Nov 2020 00:00:00 GMT') },
          { amount: weiPerEth.mul('5000'), releaseDate: blockTimeFromDate('22 Nov 2020 00:00:00 GMT') },
        ]
      },
    ],
  },
  Aave: {
    referralCode: '123456789',
    dai: {
      1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // mainnet
      3: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108', // ropsten
      42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
    },
    aDai: {
      1: '0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d', // mainnet
      3: '0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201', // ropsten
      42: '0x58AD4cB396411B691A9AAb6F74545b2C5217FE6a', // kovan
    },
    lendingPoolProvider: {
      1: '0x24a42fD28C976A61Df5D00D0599C34c4f90748c8', // mainnet
      3: '0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728', // ropsten
      42: '0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5', // kovan
    }
  }
};

const deploy = function (hre) {
  return {
    aave: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);
      const deployData = {};

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles LP: Aave - Contract Initialization');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      log('  Loading ChargedParticles from: ', ddChargedParticles.address);
      const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
      const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

      log('\n  Deploying AaveWalletManager...');
      const AaveWalletManager = await hre.ethers.getContractFactory('AaveWalletManager');
      const AaveWalletManagerInstance = await AaveWalletManager.deploy();
      const aaveWalletManager = await AaveWalletManagerInstance.deployed();

      const lendingPoolProvider = presets.Aave.lendingPoolProvider[network.chainId];
      deployData['AaveWalletManager'] = {
        abi: getContractAbi('AaveWalletManager'),
        address: aaveWalletManager.address,
        lendingPoolProvider,
        deployTransaction: aaveWalletManager.deployTransaction,
      }

      log('  - Setting Charged Particles as Controller...');
      await aaveWalletManager.setController(ddChargedParticles.address);

      log('  - Setting Lending Pool Provider...');
      lendingPoolProvider && await aaveWalletManager.setLendingPoolProvider(lendingPoolProvider);

      if (presets.Aave.referralCode.length > 0) {
        log('  - Setting Referral Code...');
        await aaveWalletManager.setReferralCode(presets.Aave.referralCode);
      }

      log('  - Registering LP with ChargedParticles...');
      await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);

      // log(`  Transferring Contract Ownership to '${owner}'...`);
      // await aaveWalletManager.transferOwnership(owner);


      // Display Contract Addresses
      log('\n  Contract Deployments Complete!\n\n  Contracts:');
      log('  - AaveWalletManager:  ', aaveWalletManager.address);
      log('     - Gas Cost:        ', getTxGasCost({ deployTransaction: aaveWalletManager.deployTransaction }));

      saveDeploymentData(network.chainId, deployData);
      log('\n  Contract Deployment Data saved to "deployed" directory.');

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      return aaveWalletManager;
    },
    ion: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const ddUniverse = getDeployData('Universe', network.chainId);
      const deployData = {};

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles FT: Ion - Contract Initialization');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      log('  Loading Universe from: ', ddUniverse.address);
      const Universe = await hre.ethers.getContractFactory('Universe');
      const universe = await Universe.attach(ddUniverse.address);

      log('\n  Deploying Ion FT...');
      const Ion = await hre.ethers.getContractFactory('Ion');
      const IonInstance = await Ion.deploy();
      const ion = await IonInstance.deployed();
      deployData['Ion'] = {
        abi: getContractAbi('Ion'),
        address: ion.address,
        deployTransaction: ion.deployTransaction,
      }

      log('  - Registering Universe with Ion...');
      await ion.setUniverse(ddUniverse.address);

      log('  - Registering Ion with Universe...');
      await universe.setIonToken(ion.address);

      let assetTokenId;
      let assetTokenAddress;
      let assetTokenMultiplier;
      for (let i = 0; i < presets.Ion.rewardsForAssetTokens.length; i++) {
        assetTokenId = presets.Ion.rewardsForAssetTokens[i].assetTokenId;
        assetTokenAddress = assetTokenId && _.get(presets, assetTokenId, {})[network.chainId];
        assetTokenMultiplier = presets.Ion.rewardsForAssetTokens[i].multiplier;

        log('  - Setting Rewards Multiplier for Asset Token: ', assetTokenAddress, ' to: ', assetTokenMultiplier);
        assetTokenAddress && await universe.setIonRewardsMultiplier(assetTokenAddress, assetTokenMultiplier);
      }

      // Display Contract Addresses
      log('\n  Contract Deployments Complete!\n\n  Contracts:');
      log('  - Ion:         ', ion.address);
      log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ion.deployTransaction }));

      saveDeploymentData(network.chainId, deployData);
      log('\n  Contract Deployment Data saved to "deployed" directory.');

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      return ion;
    },
    protocol: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner, trustedForwarder } = await hre.getNamedAccounts();

      const deployData = {};

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles Protocol - Contract Initialization');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:          ', deployer);
      log('  - Owner:             ', owner);
      log('  - Trusted Forwarder: ', trustedForwarder);
      log(' ');


      log('  Deploying Universe...');
      const Universe = await hre.ethers.getContractFactory('Universe');
      const UniverseInstance = await hre.upgrades.deployProxy(Universe, []);
      const universe = await UniverseInstance.deployed();
      deployData['Universe'] = {
        abi: getContractAbi('Universe'),
        address: universe.address,
        deployTransaction: universe.deployTransaction,
      }

      log('  Deploying ChargedParticles...');
      const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
      const ChargedParticlesInstance = await hre.upgrades.deployProxy(ChargedParticles, [trustedForwarder]);
      const chargedParticles = await ChargedParticlesInstance.deployed();
      deployData['ChargedParticles'] = {
        abi: getContractAbi('ChargedParticles'),
        address: chargedParticles.address,
        deployTransaction: chargedParticles.deployTransaction,
      }

      log('  - Registering ChargedParticles with Universe...');
      await universe.setChargedParticles(chargedParticles.address);

      log('  - Registering Universe with ChargedParticles...');
      await chargedParticles.setUniverse(universe.address);

      log('  - Setting Deposit Fee...');
      await chargedParticles.setDepositFee(presets.ChargedParticles.fees.deposit);

      // log(`  Transferring Contract Ownership to '${owner}'...`);
      // await universe.transferOwnership(owner);
      // await chargedParticles.transferOwnership(owner);

      // Display Contract Addresses
      log('\n  Contract Deployments Complete!\n\n  Contracts:');
      log('  - Universe:         ', universe.address);
      log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: universe.deployTransaction }));
      log('  - ChargedParticles: ', chargedParticles.address);
      log('     - Gas Cost:      ', getTxGasCost({ deployTransaction: chargedParticles.deployTransaction }));

      saveDeploymentData(network.chainId, deployData);
      log('\n  Contract Deployment Data saved to "deployed" directory.');

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      return {
        universe: universe,
        chargedParticles: chargedParticles
      }
    },
    proton: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);
      const deployData = {};

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles NFT: Proton - Contract Initialization');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      log('  Loading ChargedParticles from: ', ddChargedParticles.address);
      const ChargedParticles = await hre.ethers.getContractFactory('ChargedParticles');
      const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

      log('\n  Deploying Proton NFT...');
      const Proton = await hre.ethers.getContractFactory('Proton');
      const ProtonInstance = await Proton.deploy();
      const proton = await ProtonInstance.deployed();
      deployData['Proton'] = {
        abi: getContractAbi('Proton'),
        address: proton.address,
        deployTransaction: proton.deployTransaction,
      }

      log('  - Registering ChargedParticles with Proton...');
      await proton.setChargedParticles(ddChargedParticles.address);

      log('  - Registering Proton with ChargedParticles...');
      await chargedParticles.updateWhitelist(proton.address, true);

      // Display Contract Addresses
      log('\n  Contract Deployments Complete!\n\n  Contracts:');
      log('  - Proton:      ', proton.address);
      log('     - Gas Cost: ', getTxGasCost({ deployTransaction: proton.deployTransaction }));

      saveDeploymentData(network.chainId, deployData);
      log('\n  Contract Deployment Data saved to "deployed" directory.');

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      return proton;
    },
    timelocks: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const ddIon = getDeployData('Ion', network.chainId);
      const deployData = {
        IonTimelock: []
      };

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles: Ion Token Timelocks ');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      log('  Loading Ion from: ', ddIon.address);
      const Ion = await hre.ethers.getContractFactory('Ion');
      const ion = await Ion.attach(ddIon.address);

      const IonTimelock = await hre.ethers.getContractFactory('IonTimelock');
      const ionTimelockAbi = getContractAbi('IonTimelock');
      const ionAddress = ddIon.address;

      const _getDeployedTimelock = async (receiver) => {
        const ionTimelockDeployData = _.find(deployData['IonTimelock'], ['receiver', receiver]);
        if (!ionTimelockDeployData) { return; }

        const ionTimelockDeployed = await IonTimelock.attach(ionTimelockDeployData.address);
        return ionTimelockDeployed;
      };

      const _deployTimelock = async (timelockData) => {
        log('\n  Deploying Ion Timelock for Receiver: ', timelockData.receiver);

        const ionTimelockInstance = await IonTimelock.deploy(timelockData.receiver, ionAddress);
        const ionTimelockDeployed = await ionTimelockInstance.deployed();

        log('  - IonTimelock: ', ionTimelockDeployed.address);
        log('     - Gas Cost: ', getTxGasCost({ deployTransaction: ionTimelockDeployed.deployTransaction }));
        return ionTimelockDeployed;
      };

      const _mintToTimelock = async (timelockData, ionTimelock) => {
        log('\n  Minting Ions to Timelock for Receiver: ', timelockData.receiver);

        const amounts = _.map(timelockData.portions, 'amount');
        const timestamps = _.map(timelockData.portions, 'releaseDate');

        await ion.mintToTimelock(ionTimelock.address, amounts, timestamps);

        const totalMinted = _.reduce(amounts, (sum, amt) => sum.add(amt), toBN('0'));
        log('  - Total Minted: ', toEth(totalMinted));
        return totalMinted;
      };

      let ionTimelock;
      let ionTimelocks = [];
      let ionTimelockData;
      let totalIonAmount;
      let deployTxData;

      for (let i = 0; i < presets.Ion.timelocks.length; i++) {
        ionTimelockData = presets.Ion.timelocks[i];
        deployTxData = { receiver: ionTimelockData.receiver };

        // Deploy if not exists
        ionTimelock = await _getDeployedTimelock(ionTimelockData.receiver);
        if (!ionTimelock) {
          ionTimelock = await _deployTimelock(ionTimelockData);
          deployTxData['abi'] = ionTimelockAbi;
          deployTxData['deployTransaction'] = ionTimelock.deployTransaction;
        }
        deployTxData['address'] = ionTimelock.address;
        ionTimelocks.push(ionTimelock);

        // Mint
        totalIonAmount = await _mintToTimelock(ionTimelockData, ionTimelock);
        deployTxData['mintedIons'] = totalIonAmount;

        // Save deployment data
        deployData['IonTimelock'].push(deployTxData);
      }

      log('\n  Contract Deployments & Ion Minting Complete!');

      saveDeploymentData(network.chainId, deployData);
      log('\n  Contract Deployment Data saved to "deployed" directory.');

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      return ionTimelocks;
    },
    mintUniverseIons: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const deployData = getDeployData({ chainId: network.chainId });

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles: Mint Ion Tokens ');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      const IonTimelock = await hre.ethers.getContractFactory('IonTimelock');
      const ionAddress = deployData['Ion'].address;

      deployData['IonTimelock'] = deployData['IonTimelock'] || [];

      // let receiver;
      // let IonTimelockInstance;
      // let ionTimelock;
      // for (let i = 0; i < presets.Ion.timelocks.length; i++) {
      //   receiver = presets.Ion.timelocks[i].receiver;

      //   log('\n  Deploying Ion Timelock for Receiver: ', receiver);
      //   IonTimelockInstance = await IonTimelock.deploy(receiver, ionAddress);
      //   ionTimelock = await IonTimelockInstance.deployed();

      //   deployData['IonTimelock'].push({
      //     abi: getContractAbi('IonTimelock'),
      //     address: ionTimelock.address,
      //     receiver,
      //     deployTransaction: ionTimelock.deployTransaction,
      //   });

      //   log('  - IonTimelock: ', ionTimelock.address);
      //   log('     - Gas Cost: ', getTxGasCost({deployTransaction: ionTimelock.deployTransaction}));
      // }

      // Display Contract Addresses
      log('\n  Contract Deployments Complete!');

      const filename = saveDeploymentData({ chainId: network.chainId, deployData });
      log('\n  Contract Deployment Data saved to file: ');
      log('   ', filename);

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
    },
    runTx: async () => {
      // const { log } = deployments;
      const log = console.log;
      const network = await hre.ethers.provider.getNetwork();

      // Named accounts, defined in buidler.config.js:
      const { deployer, owner } = await hre.getNamedAccounts();

      const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);
      const ddAaveWalletManager = getDeployData('AaveWalletManager', network.chainId);

      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log('Charged Particles: Execute Transaction');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

      log('  Using Network: ', chainName(network.chainId));
      log('  Using Accounts:');
      log('  - Deployer:    ', deployer);
      log('  - Owner:       ', owner);
      log(' ');

      log('  Loading AaveWalletManager from: ', ddChargedParticles.address);
      const AaveWalletManager = await hre.ethers.getContractFactory('AaveWalletManager');
      const aaveWalletManager = await AaveWalletManager.attach(ddAaveWalletManager.address);

      log('  - Setting Charged Particles as Controller...');
      await aaveWalletManager.setController(ddChargedParticles.address);

      log('\n  Transaction Execution Complete!');
      log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
    }
  }
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DEPLOYMENT PROCEDURES:
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 1  -  scripts/deploy-protocol.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Protocol:
//  - Universe            (Upgradeable)
//  - ChargedParticles    (Upgradeable)
// Config:
// - Universe
//     - setChargedParticles
//  - ChargedParticles
//     - setUniverse
//     - setDepositFee

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 2  -  scripts/deploy-aave.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Liquidity Provider:
//  - AaveWalletManager   (Non-Upgradeable)
// Config:
//  - AaveWalletManager
//     - setLendingPoolProvider
//     - setReferralCode
//  - ChargedParticles
//     - registerLiquidityProvider

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 3  -  scripts/deploy-proton.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Proton (ERC721):
//  - Proton Token        (Non-Upgradeable, ERC721)
// Config:
//  - ChargedParticles
//     - updateWhitelist
//  - Proton Token
//     - setChargedParticles

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 4  -  scripts/deploy-ion.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Ion (ERC20):
//  - Ion Token           (Non-Upgradeable, ERC20)
// Config:
//  - Ion Token
//     - setUniverse
// - Universe
//     - setIonToken
//     - setIonRewardsMultiplier

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 5  -  scripts/deploy-timelock.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Deploy Ion Timelocks:
//  - IonTimelock         (Non-Upgradeable)
//     - Foundation (x1)
//     - Team       (x1)
//     - Advisors   (x3 ??)
// Config:
//  -

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Step 6 -  scripts/mint-ions.js
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Mint Ions:
//  - Ion Token
//     - mintToUniverse
//     - mintToTimelock

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

module.exports = {
  txOverrides,
  chainName,
  saveDeploymentData,
  getContractAbi,
  getDeployData,
  getTxGasCost,
  // contractDeployer,
  // contractManager,
  presets,
  deploy,
  toWei,
  toEth,
  toBN,
  toStr,
};
