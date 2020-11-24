
const { ethers, getNamedAccounts } = require('@nomiclabs/buidler');
const _ = require('lodash');

const {
  chainName,
  getDeployData,
} = require('../js-utils/deploy-helpers');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZUzTfddYk56W39okxjf3UrZZRUs3dK33DCRaLbARdRGb';


async function main() {
  // const { log } = deployments;
  const log = console.log;
  const network = await ethers.provider.getNetwork();

  // Named accounts, defined in buidler.config.js:
  const { user1, user2, user3 } = await getNamedAccounts();

  const protonCreator = await ethers.provider.getSigner(user1);

  const ddProton = getDeployData('Proton', network.chainId);

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Mint Ion Tokens ');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', chainName(network.chainId));
  log('  Using Accounts:');
  log('  - Creator:     ', user1);
  log('  - Receiver 1:  ', user2);
  log('  - Receiver 2:  ', user3);
  log(' ');

  log('  Loading Proton from: ', ddProton.address);
  const Proton = await ethers.getContractFactory('Proton');
  const proton = await Proton.attach(ddProton.address);

  let creator;
  let receiver;
  let annuityPct;
  let burnToRelease;

  log(`  - Minting Proton to [user2: ${user2}]...`);
  creator = user1;
  receiver = user2;
  annuityPct = '1000'; // 10%
  burnToRelease = false;
  await proton
    .connect(protonCreator)
    .createProton(creator, receiver, TEST_NFT_TOKEN_URI, annuityPct, burnToRelease);


  log(`  - Minting Proton to [user3: ${user3}]...`);
  creator = user1;
  receiver = user3;
  annuityPct = '1500'; // 15%
  burnToRelease = true;
  await proton
    .connect(protonCreator)
    .createProton(creator, receiver, TEST_NFT_TOKEN_URI, annuityPct, burnToRelease);



  log('\n  Proton Minting Complete!');
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
