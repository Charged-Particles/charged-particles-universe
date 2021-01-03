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
    const { initialMinter } = await getNamedAccounts();
    const network = await hre.network;
    const alchemyTimeout = 1;

    const chainId = chainIdByName(network.name);

    const protonCreator = await ethers.provider.getSigner(initialMinter);

    const ddProton = getDeployData('Proton', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Mint Proton Tokens ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Creator:     ', initialMinter);
    log(' ');

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log(`  - Minting Proton 1...`)(alchemyTimeout);
    await proton
      .connect(protonCreator)
      .createBasicProton(
        initialMinter,
        initialMinter,
        TEST_NFT_TOKEN_URI,
        { value: presets.Proton.mintFee }
      );


    log(`  - Minting Proton 2...`)(alchemyTimeout);
    await proton
      .connect(protonCreator)
      .createBasicProton(
        initialMinter,
        initialMinter,
        TEST_NFT_TOKEN_URI,
        { value: presets.Proton.mintFee }
      );



    log('\n  Proton Minting Complete!');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-protons']