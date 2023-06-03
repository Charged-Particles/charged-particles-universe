const hre = require("hardhat");
const {
  getDeployData,
} = require('../js-helpers/deploy');


async function main() {
  const { ethers, getNamedAccounts } = hre;
  const log = console.log;
  const network = await ethers.provider.getNetwork();
  log(network);

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  const ddLepton = getDeployData('Lepton2', network.chainId);
//   const ddAaveWalletManager = getDeployData('AaveWalletManager', network.config.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Execute Transaction');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', network.chainId);
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading lepton2 from: ', ddLepton.address);
  const Lepton = await ethers.getContractFactory('Lepton2');
  const lepton = await Lepton.attach(ddLepton.address);

  log('  - Setting Charged Particles as Controller...');
  const leptonName = await lepton.name();
  console.log('>>>>>>> ', leptonName);

  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
