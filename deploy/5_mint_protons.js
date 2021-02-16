const {
  chainNameById,
  chainIdByName,
  getDeployData,
  log,
} = require("../js-helpers/deploy");

const _ = require('lodash');

const SingularityCollection = [
  'https://ipfs.io/ipfs/QmeRwFM49onX5PU7bXkPfhSDjeNgJFia2tf9namogFdYzR',
  'https://ipfs.io/ipfs/QmZPt3MxyDqkXytY3oMDZpCo4urmWiq6RQ7V6FokRbgzFQ',
  'https://ipfs.io/ipfs/Qme8yCknGa9WJUJ1cJ27Y9XjrYC92MHs2YzN1ZS8RuHuff',
  'https://ipfs.io/ipfs/QmQM7k2dcw282KY5dUcJ6AH7QvvXKQfz523VTb1t7BE2ey',
  'https://ipfs.io/ipfs/QmVR8Psao1JNutTrkBf5rZtTcbqoitDVm94UXUWSnMggK3',
];

module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { initialMinter } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 10 : 7);

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

    for (let i = 0; i < SingularityCollection.length; i++) {
      log(`  - Minting Proton ${i+1}...`)(alchemyTimeout);
      await proton
        .connect(protonCreator)
        .createBasicProton(
          initialMinter,
          initialMinter,
          SingularityCollection[i]
        );
    }


    log('\n  Proton Minting Complete!');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-protons']