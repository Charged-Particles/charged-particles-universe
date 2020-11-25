const {
  chainName,
  getDeployData,
  log,
} = require("../js-utils/deploy-helpers");

const _ = require('lodash');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZUzTfddYk56W39okxjf3UrZZRUs3dK33DCRaLbARdRGb';

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { user1, user2, user3 } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 1;

    const protonCreator = await ethers.provider.getSigner(user1);

    const ddProton = getDeployData('Proton', network.config.chainId);


    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Mint Ion Tokens ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainName(network.config.chainId));
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

    log(`  - Minting Proton to [user2: ${user2}]...`)(alchemyTimeout);
    creator = user1;
    receiver = user2;
    annuityPct = '1000'; // 10%
    burnToRelease = false;
    await proton
      .connect(protonCreator)
      .createProton(creator, receiver, TEST_NFT_TOKEN_URI, annuityPct, burnToRelease);


    log(`  - Minting Proton to [user3: ${user3}]...`)(alchemyTimeout);
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

module.exports.tags = ['mint-protons']