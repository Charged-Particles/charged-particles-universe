const {
  getDeployData,
  presets,
} = require('../js-helpers/deploy');

const {
  log,
  toBN,
  toWei,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const {
  executeTx,
  accumulatedGasCost,
  getAccumulatedGasCost,
  resetAccumulatedGasCost,
} = require('../js-helpers/executeTx');

const _ = require('lodash');

const SingularityCollection = [
  'https://ipfs.io/ipfs/QmScSSJ8HdKr13qkPHHgM7UMbbsLMRjLt2TRY8nQ97qCrL',
  'https://ipfs.io/ipfs/QmUYDhtnhjJXH5yPzYhEqg7SuQ4W7HwaHFMVUQxSq41dtq',
  'https://ipfs.io/ipfs/QmWc1upvg4C4wSiSu1ry72Lw2smGsEptq73vV5hNk84MR9',
  'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu',
  'https://ipfs.io/ipfs/QmVT2TvPjznpoNAgRhvzR5paH9rGqZ9kskM7iqK3oVDqAi',

  'https://ipfs.io/ipfs/QmNkRS2kXSoquxBzMjAAzAim5MkBmdWapiqMDUx7Ycfev7',
  'https://ipfs.io/ipfs/QmWzSAsvMQtrsGua7Bv9VrnjhYzPVQb2tQD82s3nBBL6c5',
  'https://ipfs.io/ipfs/QmW9CyctFiLPS4jVYMsphCse39WSzBNMjBqS2nbiUpbQPh',
  'https://ipfs.io/ipfs/QmYYz36gkueJjy7LxogPq7Uh2ZyoqByPv6cCypKktVWJ7H',
  'https://ipfs.io/ipfs/QmafjdCLdTeXsMUX85fvWAkwcMcNbRdsd2HHysWZVP7TpC',

  'https://ipfs.io/ipfs/QmaL5CjZABwLX9L6yXdvHFox7fYFdZGvyDFKuLZssw1Ypo',
  'https://ipfs.io/ipfs/QmSeE4icQQte3DPgJsLuHstRocTJSD5vQHNbsrDX3U5wSC',
  'https://ipfs.io/ipfs/QmcJX9VWqdeAMq8FJTzS2o2WdRXqGciYHjVk9hL4DC2q85',
  'https://ipfs.io/ipfs/QmWAtrv5gvgRGc5u2nqFctgTUU7DgWxnHUXB8Az5HBbyvc',
  'https://ipfs.io/ipfs/QmatHa7y7JzBUBYnozCAqXyPaoT5bvWZckHqEMfpdEBgy5',

  'https://ipfs.io/ipfs/Qmexdm7Y7WkymGfJAVdF4Ex3TLXhsRGzb6cN8ug9mxKJ4K',
  'https://ipfs.io/ipfs/QmcXaXc54txJU8V8u7a3h7dpwDGxbFy6px9FKvdsTqLBvP',
  'https://ipfs.io/ipfs/QmUSw99dH3LikLHYBaWnQm9NGXzJkqkBqvfXK2hscPmb8p',
  'https://ipfs.io/ipfs/Qme4EazsTrRiGY6HtUJpTCJyePkLgU8xcC3qwiiHB9wfLn',
  'https://ipfs.io/ipfs/QmRchzHj74k4virx3WXgoNNJTTYSPhGqQ69LHk4dj1fnqV',

  'https://ipfs.io/ipfs/Qmexdm7Y7WkymGfJAVdF4Ex3TLXhsRGzb6cN8ug9mxKJ4K',
  'https://ipfs.io/ipfs/QmcXaXc54txJU8V8u7a3h7dpwDGxbFy6px9FKvdsTqLBvP',
  'https://ipfs.io/ipfs/QmUSw99dH3LikLHYBaWnQm9NGXzJkqkBqvfXK2hscPmb8p',
  'https://ipfs.io/ipfs/Qme4EazsTrRiGY6HtUJpTCJyePkLgU8xcC3qwiiHB9wfLn',
  'https://ipfs.io/ipfs/QmRchzHj74k4virx3WXgoNNJTTYSPhGqQ69LHk4dj1fnqV',
];
const SingularityPrices = [
  toWei('69'),
  toWei('30'),
  toWei('21'),
  toWei('11'),
  toWei('5.5'),

  // toWei('5'),
  // toWei('4'),
  // toWei('3'),
  // toWei('2'),
  // toWei('1'),

  // toWei('1'),
  // toWei('2'),
  // toWei('3'),
  // toWei('2'),
  // toWei('1'),

  // toWei('0.9'),
  // toWei('0.825'),
  // toWei('0.75'),
  // toWei('0.675'),
  // toWei('0.5'),
];


const _externalNftsForTesting = [
  {receiver: '0xb14d1a16f30dB670097DA86D4008640c6CcC2B76', tokenUri: 'https://ipfs.io/ipfs/QmWc1upvg4C4wSiSu1ry72Lw2smGsEptq73vV5hNk84MR9'},
  {receiver: '0xb14d1a16f30dB670097DA86D4008640c6CcC2B76', tokenUri: 'https://ipfs.io/ipfs/QmScSSJ8HdKr13qkPHHgM7UMbbsLMRjLt2TRY8nQ97qCrL'},
  {receiver: '0xb14d1a16f30dB670097DA86D4008640c6CcC2B76', tokenUri: 'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu'},
];


module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, initialMinter } = await getNamedAccounts();
    const network = await hre.network;

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);
    const leptonMaxMint = presets.Lepton.maxMintPerTx;

    const ddProton = getDeployData('Proton', chainId);
    const ddProtonB = getDeployData('ProtonB', chainId);
    const ddLepton = getDeployData('Lepton', chainId);
    const ddExternalERC721 = getDeployData('ExternalERC721', chainId);
    let externalERC721, gasCosts;

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Mint Proton & Lepton Tokens ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - For Creator:     ', initialMinter);
    log('  - With Timeout:    ', alchemyTimeout);
    log(' ');

    log('  Loading Proton from: ', ddProton.address);
    const Proton = await ethers.getContractFactory('Proton');
    const proton = await Proton.attach(ddProton.address);

    log('  Loading ProtonB from: ', ddProtonB.address);
    const ProtonB = await ethers.getContractFactory('ProtonB');
    const protonB = await ProtonB.attach(ddProtonB.address);

    log('  Loading Lepton from: ', ddLepton.address);
    const Lepton = await ethers.getContractFactory('Lepton');
    const lepton = await Lepton.attach(ddLepton.address);

    if (!isProd) {
      log('  Loading ExternalERC721 from: ', ddExternalERC721.address);
      const ExternalERC721 = await ethers.getContractFactory('ExternalERC721');
      externalERC721 = await ExternalERC721.attach(ddExternalERC721.address);
    }


    await executeTx('1-a', 'Minting Single Proton, Type "B"', async () =>
      await protonB.createProton(
        initialMinter,
        initialMinter,
        SingularityCollection[0],
      )
    );


    await executeTx('1-a', 'Batch Minting 1 Proton, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        SingularityCollection.slice(0, 1),
      )
    );


    await executeTx('1-a', 'Batch Minting 3 Protons, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        SingularityCollection.slice(0, 3),
      )
    );


    await executeTx('1-a', 'Batch Minting 5 Protons, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        SingularityCollection.slice(0, 5),
      )
    );


    await executeTx('1-a', 'Batch Minting 15 Protons, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        SingularityCollection.slice(0, 15),
      )
    );


    await executeTx('1-a', 'Batch Minting 20 Protons, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        SingularityCollection.slice(0, 20),
      )
    );


    await executeTx('1-a', 'Batch Minting 25 Protons, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        SingularityCollection.slice(0, 25),
      )
    );


    await executeTx('1-a', 'Batch Minting 50 Protons, Type "B"', async () =>
      await protonB.createProtons(
        initialMinter,
        initialMinter,
        [...SingularityCollection, ...SingularityCollection],
      )
    );


    // Gas Usage Breakdown for Minting:
    //         Mint  1       270,170
    //   Batch Mint  1       321,470
    //
    //     overhead  =  51,300   ==  overhead of minting 1 vs batch minting 1
    //
    //   Batch Mint  3       728,279         ( - overhead /  3) ==     (676,979 /  3)   ==  225,659.6667
    //   Batch Mint  5     1,185,847         ( - overhead /  5) ==   (1,134,547 /  5)   ==  226,909.4      (diff over prev:  1249.7333)
    //   Batch Mint 15     3,473,649         ( - overhead / 15) ==   (3,422,349 / 15)   ==  228,156.6      (diff over prev:  1247.2)
    //   Batch Mint 20     4,617,432         ( - overhead / 20) ==   (4,566,132 / 20)   ==  228,306.6      (diff over prev:  150)
    //   Batch Mint 25     5,761,459         ( - overhead / 25) ==   (5,710,159 / 25)   ==  228,406.36     (diff over prev:  99.76)
    //   Batch Mint 50    11,481,067         ( - overhead / 50) ==  (11,429,767 / 50)   ==  228,595.34



    //   NOTE: Running all of these causes the Leptons to be SOLD OUT and the corresponding Unit-Tests will fail when trying to mint new ones
    // log('  Batch Minting Leptons...');
    // await lepton.batchMintLepton(leptonMaxMint, {value: toWei('1')}); // 25 Electron Neutrinos
    // await lepton.batchMintLepton(leptonMaxMint, {value: toWei('1')}); // 15 Electron Neutrinos  (40 Total)
    // await lepton.batchMintLepton(leptonMaxMint, {value: toWei('1')}); // 20 Muon Neutrinos
    // await lepton.batchMintLepton(leptonMaxMint, {value: toWei('1')}); // 12 Tau Neutrinos
    // await lepton.batchMintLepton(leptonMaxMint, {value: toWei('1')}); // 8 Electrons
    // await lepton.batchMintLepton(leptonMaxMint, {value: toWei('1')}); // 5 Muons
    // await lepton.mintLepton({value: toWei('1')}); // 1 Tau
    // await lepton.mintLepton({value: toWei('1')}); // 1 Tau

    // let tx;
    // log('  Minting External NFTs...');
    // for (let i = 0; i < _externalNftsForTesting.length; i++) {
    //   log(`    - Minting "${_externalNftsForTesting[i].tokenUri}" for "${_externalNftsForTesting[i].receiver}"`);
    //   tx = await externalERC721.mintNft(_externalNftsForTesting[i].receiver, _externalNftsForTesting[i].tokenUri);
    //   await tx.wait();
    // }


    log('\n  Token Minting Complete!');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-tokens']