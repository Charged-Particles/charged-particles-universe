const {
  chainNameById,
  chainIdByName,
  getDeployData,
  log,
  presets,
} = require("../js-helpers/deploy");

const _ = require('lodash');

const TEST_NFT_TOKEN_URI = 'https://ipfs.io/ipfs/QmZrWBZo1y6bS2P6hCSPjkccYEex31bCRBbLaz4DqqwCzp';

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { user1, user2, user3 } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 1;

    const chainId = chainIdByName(network.name);

    const protonCreator = await ethers.provider.getSigner(user1);

    const ddProton = getDeployData('Proton', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Mint Proton Tokens ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
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
      .createProton(
        creator,
        receiver,
        TEST_NFT_TOKEN_URI,
        annuityPct,
        burnToRelease,
        { value: presets.Proton.mintFee }
      );


    creator = user1;
    receiver = user3;
    annuityPct = '1500'; // 15%
    burnToRelease = true;

    log(`  - Minting Proton to [user3: ${user3}]...`)(alchemyTimeout);
    await proton
      .connect(protonCreator)
      .createProton(
        creator,
        receiver,
        TEST_NFT_TOKEN_URI,
        annuityPct,
        burnToRelease,
        { value: presets.Proton.mintFee }
      );



    log('\n  Proton Minting Complete!');
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-protons']