const hre = require("hardhat");
const _ = require('lodash');

const {
  chainNameById,
  getDeployData,
} = require('../js-helpers/deploy');


async function main() {
  const { ethers, getNamedAccounts  } = hre;
  const log = console.log;

  const { protocolOwner } = await getNamedAccounts();
  const network = await ethers.provider.getNetwork();

  const SMART_WALLET_ADDRESS = '0xcaf6e5465c410c187bd6Abb25Ae8c0221881086B';
  const AMPL_ADDRESS = '0x1E6bb68Acec8fefBD87D192bE09bb274170a0548';
  const USER_WALLET = '0x03828b7129d49313b2cdc966e50369b75ec79a48';

  const ddParticleSplitter = getDeployData('ParticleSplitter', network.chainId);
  const ddAaveWalletManager = getDeployData('AaveWalletManager', network.chainId);

  log('  Using Accounts:');
  log('  - Owner:       ', protocolOwner);
  log(' ');

  log('  Loading smart wallet from: ', SMART_WALLET_ADDRESS);
  const WalletAave = await ethers.getContractFactory('AaveSmartWallet');
  const walletAave = WalletAave.attach(SMART_WALLET_ADDRESS);

  log('  Loading particle splitter from: ', ddParticleSplitter.address);
  const ParticleSplitter = await ethers.getContractFactory('ParticleSplitter');
  const particleSplitter = ParticleSplitter.attach(ddParticleSplitter.address);

  log('  Loading ddAaveWalletManager from: ', ddAaveWalletManager.address);
  const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
  const aaveWalletManager = AaveWalletManager.attach(ddAaveWalletManager.address)

  log('  Allow list AMPL address in particle splitter - ...');
  const totalAmplAmount = await walletAave.callStatic.getRewards(AMPL_ADDRESS);

  // add ampl contract to splitter allow list
  const addAmplToSplitterTx = await particleSplitter.setExternalContracts([AMPL_ADDRESS], true).then(tx => tx.wait());

  // set splitter as contoller in manager
  const splitterAsControllerTx = await aaveWalletManager.setExecutor(ddParticleSplitter.address).then(tx => tx.wait());

  // execute transaction 
  const withdrawAmmpl = await particleSplitter.executeForWallet(
    '0x63174fa9680c674a5580f7d747832b2a2133ad8f',
    103,
    'aave',
    AMPL_ADDRESS,
    getTransferEncodeMethod(totalAmplAmount) 
  ).then(tx => tx.wait());

  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

const getTransferEncodeMethod = (totalAmplAmount) => {
  const ABI = [ 'function transfer(address recipient, uint256 amount)' ];
  const iface = new ethers.utils.Interface(ABI);
  const cdata = iface.encodeFunctionData('transfer', [ '0x03828b7129d49313B2cdc966e50369B75EC79A48', totalAmplAmount.toNumber() ]);

  return cdata;
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
