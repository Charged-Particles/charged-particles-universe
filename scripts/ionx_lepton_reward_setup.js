const hre = require("hardhat");
const {
  getDeployData,
  presets,
} = require('../js-helpers/deploy');

async function main() {
  const { ethers, getNamedAccounts } = hre;
  const log = console.log;
  const network = await ethers.provider.getNetwork();
  log(network);

  // Named accounts, defined in buidler.config.js:
  const { deployer, owner } = await getNamedAccounts();

  const ddLepton = getDeployData('Lepton2', network.chainId);
  const ddIonx = getDeployData('Ionx', network.chainId);
  const ddRewardProgram = getDeployData('RewardProgram', network.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Execute Transaction');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', network.chainId);
  log('  Using Accounts:');
  log('  - Deployer:    ', deployer);
  log('  - Owner:       ', owner);
  log(' ');

  // const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [ '0xc5b2d04669b6b701195f90c15c560edaa3509c92', 11]);
  // const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [ '0xc5b2d04669b6b701195f90c15c560edaa3509c92', 101]);
  // console.log(uuid);
  
  // Configure reward program default values
  log('  Loading reward program from: ', ddLepton.address);
  const RewardProgram = await ethers.getContractFactory('RewardProgram');
  const rewardProgram = await RewardProgram.attach(ddRewardProgram.address);

  // Mint and grand lepton to test address
  log('  Loading lepton2 from: ', ddLepton.address);
  const Lepton = await ethers.getContractFactory('Lepton2');
  const lepton = await Lepton.attach(ddLepton.address);

  await lepton.setPausedState(false).then(tx => tx.wait());
  const mintedTokenId = await lepton.callStatic.mintLepton({ value: '300000000000' });
  await lepton.mintLepton({ value: '300000000000' }).then(tx => tx.wait());
  await lepton.transferFrom(deployer, '0x277BFc4a8dc79a9F194AD4a83468484046FAFD3A', mintedTokenId).then(tx => tx.wait());
 
  log('  Loading lepton2 from: ', ddIonx.address);
  // Found program.
  const Ionx = await ethers.getContractFactory('Ionx');
  const ionx = await Ionx.attach(ddIonx.address);
  // await rewardProgram.setRewardToken(ddIonx.address).then(tx => tx.wait());
  
  const fundingAmount = '13333333333333333333333333';
  await ionx.connect(ethers.provider.getSigner(owner)).approve(rewardProgram.address, fundingAmount).then((tx) => tx.wait());
  await rewardProgram.connect(ethers.provider.getSigner(deployer)).fundProgram(fundingAmount).then(tx => tx.wait());

  log('\n  Transaction Execution Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
