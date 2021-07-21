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

const _ = require('lodash');

const SingularityCollection = [
  'https://ipfs.io/ipfs/QmScSSJ8HdKr13qkPHHgM7UMbbsLMRjLt2TRY8nQ97qCrL',
  'https://ipfs.io/ipfs/QmUYDhtnhjJXH5yPzYhEqg7SuQ4W7HwaHFMVUQxSq41dtq',
  'https://ipfs.io/ipfs/QmWc1upvg4C4wSiSu1ry72Lw2smGsEptq73vV5hNk84MR9',
  'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu',
  'https://ipfs.io/ipfs/QmVT2TvPjznpoNAgRhvzR5paH9rGqZ9kskM7iqK3oVDqAi',

  // 'https://ipfs.io/ipfs/QmNkRS2kXSoquxBzMjAAzAim5MkBmdWapiqMDUx7Ycfev7',
  // 'https://ipfs.io/ipfs/QmWzSAsvMQtrsGua7Bv9VrnjhYzPVQb2tQD82s3nBBL6c5',
  // 'https://ipfs.io/ipfs/QmW9CyctFiLPS4jVYMsphCse39WSzBNMjBqS2nbiUpbQPh',
  // 'https://ipfs.io/ipfs/QmYYz36gkueJjy7LxogPq7Uh2ZyoqByPv6cCypKktVWJ7H',
  // 'https://ipfs.io/ipfs/QmafjdCLdTeXsMUX85fvWAkwcMcNbRdsd2HHysWZVP7TpC',

  // 'https://ipfs.io/ipfs/QmaL5CjZABwLX9L6yXdvHFox7fYFdZGvyDFKuLZssw1Ypo',
  // 'https://ipfs.io/ipfs/QmSeE4icQQte3DPgJsLuHstRocTJSD5vQHNbsrDX3U5wSC',
  // 'https://ipfs.io/ipfs/QmcJX9VWqdeAMq8FJTzS2o2WdRXqGciYHjVk9hL4DC2q85',
  // 'https://ipfs.io/ipfs/QmWAtrv5gvgRGc5u2nqFctgTUU7DgWxnHUXB8Az5HBbyvc',
  // 'https://ipfs.io/ipfs/QmatHa7y7JzBUBYnozCAqXyPaoT5bvWZckHqEMfpdEBgy5',

  // 'https://ipfs.io/ipfs/Qmexdm7Y7WkymGfJAVdF4Ex3TLXhsRGzb6cN8ug9mxKJ4K',
  // 'https://ipfs.io/ipfs/QmcXaXc54txJU8V8u7a3h7dpwDGxbFy6px9FKvdsTqLBvP',
  // 'https://ipfs.io/ipfs/QmUSw99dH3LikLHYBaWnQm9NGXzJkqkBqvfXK2hscPmb8p',
  // 'https://ipfs.io/ipfs/Qme4EazsTrRiGY6HtUJpTCJyePkLgU8xcC3qwiiHB9wfLn',
  // 'https://ipfs.io/ipfs/QmRchzHj74k4virx3WXgoNNJTTYSPhGqQ69LHk4dj1fnqV',
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
  { receiver: '0x9bB8b93E9E3eeb92B9C85A8058C27B962b82bAc3', tokenUri: 'https://ipfs.io/ipfs/QmWc1upvg4C4wSiSu1ry72Lw2smGsEptq73vV5hNk84MR9'},
  { receiver: '0x9bB8b93E9E3eeb92B9C85A8058C27B962b82bAc3', tokenUri: 'https://ipfs.io/ipfs/QmScSSJ8HdKr13qkPHHgM7UMbbsLMRjLt2TRY8nQ97qCrL'},
  { receiver: '0x9bB8b93E9E3eeb92B9C85A8058C27B962b82bAc3', tokenUri: 'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu'},
  { receiver: '0x9bB8b93E9E3eeb92B9C85A8058C27B962b82bAc3', tokenUri: 'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu'},
  { receiver: '0x9bB8b93E9E3eeb92B9C85A8058C27B962b82bAc3', tokenUri: 'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu'},
  { receiver: '0x9bB8b93E9E3eeb92B9C85A8058C27B962b82bAc3', tokenUri: 'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu'},
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
    const ddLepton = getDeployData('Lepton', chainId);
    const ddExternalNFT = getDeployData('ExternalNFT', chainId);

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

    log('  Loading Lepton from: ', ddLepton.address);
    const Lepton = await ethers.getContractFactory('Lepton');
    const lepton = await Lepton.attach(ddLepton.address);

    log('  Loading ExternalNFT from: ', ddExternalNFT.address);
    const ExternalNFT = await ethers.getContractFactory('ExternalNFT');
    const externalNFT = await ExternalNFT.attach(ddExternalNFT.address);


    // log('  Batch Minting Protons...');
    // await proton.batchProtonsForSale(
    //   initialMinter,
    //   toBN('500'),
    //   toBN('1000'),
    //   SingularityCollection,
    //   SingularityPrices,
    // );

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

    let tx;
    log('  Minting External NFTs...');
    for (let i = 0; i < _externalNftsForTesting.length; i++) {
      log(`    - Minting "${_externalNftsForTesting[i].tokenUri}" for "${_externalNftsForTesting[i].receiver}"`);
      tx = await externalNFT.mintNft(_externalNftsForTesting[i].receiver, _externalNftsForTesting[i].tokenUri);
      await tx.wait();
    }


    log('\n  Token Minting Complete!');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-tokens']