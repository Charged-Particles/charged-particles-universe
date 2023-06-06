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

  const ddUniverse = getDeployData('Universe', network.chainId);
  const ddLepton = getDeployData('Lepton2', network.chainId);
  const ddRewardProgram = getDeployData('RewardProgram', network.chainId);
//   const ddAaveWalletManager = getDeployData('AaveWalletManager', network.config.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Execute Transaction');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', network.chainId);
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  log('  Loading reward program from: ', ddLepton.address);
  // const RewardProgram = await ethers.getContractFactory('RewardProgram');
  // const rewardProgram = await RewardProgram.attach(ddRewardProgram.address);

  // log('  Loading universe from: ', ddUniverse.address);
  // const Universe = await ethers.getContractFactory('Universe');
  // const universe = await Universe.attach(ddUniverse.address);

  // await universe.setRewardProgram(ddRewardProgram.address, ddLepton.address);

  // await rewardProgram.setUniverse('0x0114A7aE15f998E7e1387fE64B1b90c233c73243').then(tx => tx.wait());
  // const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [ '0xc5b2d04669b6b701195f90c15c560edaa3509c92', 11]);
  const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [ '0xc5b2d04669b6b701195f90c15c560edaa3509c92', 102]);
  console.log(uuid);

  // const daiMumbai = '0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F';
  // await rewardProgram.setStakingToken(daiMumbai).then(tx => tx.wait());
  // await rewardProgram.setRewardToken(daiMumbai).then(tx => tx.wait());
  // await rewardProgram.setRewardNft(ddLepton.address).then(tx => tx.wait());

  // log('  Loading lepton2 from: ', ddLepton.address);
  // const Lepton = await ethers.getContractFactory('Lepton2');
  // const lepton = await Lepton.attach(ddLepton.address);

  // await lepton.setPausedState(false).then(tx => tx.wait());
  // const mintedTokenId = await lepton.callStatic.mintLepton({ value: '300000000000' });
  // await lepton.mintLepton({ value: '300000000000' }).then(tx => tx.wait());
  // await lepton.transferFrom(deployer, '0x277BFc4a8dc79a9F194AD4a83468484046FAFD3A', mintedTokenId).then(tx => tx.wait());
 
  // log(mintedTokenId.toString());
  

  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
