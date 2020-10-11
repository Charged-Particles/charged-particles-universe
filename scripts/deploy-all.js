
const { ethers, upgrades, getNamedAccounts, deployments } = require('@nomiclabs/buidler');

const {
  chainName,
  presets,
  toWei,
} = require('../js-utils/deploy-helpers');

async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner, trustedForwarder } = await getNamedAccounts();

  const lendingPoolProvider = presets.Aave.lendingPoolProvider[network.chainId];

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  log("Charged Particles - Contract Initialization");
  log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");

  log("  Using Network: ", chainName(network.chainId));
  log("  Using Accounts:");
  log("  - Deployer:           ", deployer);
  log("  - Owner:              ", owner);
  log("  - Trusted Forwarder:  ", trustedForwarder);
  log(" ");


  // TODO: Register a Controller Contract as the Universe


  log("  Deploying ChargedParticles...");
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const ChargedParticlesInstance = await upgrades.deployProxy(ChargedParticles, [trustedForwarder]);
  const chargedParticles = await ChargedParticlesInstance.deployed();

  log("  Preparing ChargedParticles...");
  // await chargedParticles.setUniverse(); // TODO
  await chargedParticles.setDepositFee(presets.ChargedParticles.fees.deposit);


  log("  Deploying AaveWalletManager...");
  const AaveWalletManager = await ethers.getContractFactory('AaveWalletManager');
  const AaveWalletManagerInstance = await upgrades.deployProxy(AaveWalletManager, [lendingPoolProvider]);
  const aaveWalletManager = await AaveWalletManagerInstance.deployed();

  log("  Preparing AaveWalletManager...");
  await aaveWalletManager.setController(chargedParticles.address);
  // await aaveWalletManager.setReferralCode(0); // TODO


  log("  Registering Aave LP with Charged Particles...");
  await chargedParticles.registerLiquidityProvider('aave', aaveWalletManager.address);


  log(`  Transferring Contract Ownership to "${owner}"...`);
  await chargedParticles.transferOwnership(owner);
  await aaveWalletManager.transferOwnership(owner);


  // Display Contract Addresses
  log("\n  Contract Deployments Complete!\n\n  Contracts:");
  log("  - ChargedParticles:   ", chargedParticles.address);
  log("  - AaveWalletManager:  ", aaveWalletManager.address);

  log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n");
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
