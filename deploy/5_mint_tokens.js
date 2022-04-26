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

const testHelpers = require('../js-helpers/test');

const _ = require('lodash');


let _DEPLOY_ROBS_NFTS = true;
const RobsTestCollection = [
  "ipfs://QmcbUiZVJVGMXKGV453YFhKxVKpQZKQSSvz8HAcSZxUBmr",
  "ipfs://QmUi3rmHLiQaEHziR4rKrCwA1a2ZuqNvaCDGoZDHHm85YG",
  "ipfs://Qmdxhvd6KVhaFFtyY49ZNHtUGbyWJ55RPVPPQLUQeQQV8j",
  "ipfs://QmRfQguqZqppZXuwV4HNKRocF5JPGbjGaKoSjAMdw5TksH",
  "ipfs://QmSF4kDAsaVXCdvYGo5jkzMHRPTQXzWwyhuzpxyeR8dYan",
  "ipfs://QmcReccrBqkQF1koydeiB8oezrcPxJspRqAkUEeBae29eE",
  "ipfs://QmYpzRutFhp9Pdrt22wFD3DNePH6zrawnnpFgAag2z8nhd",
  "ipfs://QmTdV1JzPSj5WFPP7EfUsBwm6QCLHzd5fhnhQcXXgYF3YF",
  "ipfs://QmTgYYCfgb7xQcpkLkE3xo7wZnUBdTWZrW6ir7FPvqiaiu",
  "ipfs://QmVw7cPRmyN9Z44JXh7jG1iAK9UZ9cUATe6sknSaS9Whz9",
];


const _externalERC721 = [
  'https://ipfs.io/ipfs/QmWc1upvg4C4wSiSu1ry72Lw2smGsEptq73vV5hNk84MR9',
  'https://ipfs.io/ipfs/QmScSSJ8HdKr13qkPHHgM7UMbbsLMRjLt2TRY8nQ97qCrL',
  'https://ipfs.io/ipfs/QmPUoAULoodhy2uipiCZbT4YcMwCJX7jEK9wM8V2A7JXxu',
];

const _externalERC1155 = [
  'https://arweave.net/LjyCZiR9D4v8M9mpMKymuyvnXUtTXHftHF2txi3QCGs',
  'https://arweave.net/Tbnh-usk61-Y8lonVFd6SbebnPfUA6wFqMbCBPbyjVM',
  'https://arweave.net/WjLspfljcMRspz_hTvnJbS_b89-6jkTWukSxH4lOmB4',
];


module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, initialMinter, user1, user2, user3, user4, user5 } = await getNamedAccounts();
    const network = await hre.network;
    const { callAndReturn } = testHelpers(network);

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);
    const alchemyTimeout = isHardhat ? 0 : (isProd ? 10 : 7);
    const leptonMaxMint = presets.Lepton.maxMintPerTx;

    const ddChargedParticles = getDeployData('ChargedParticles', chainId);
    const ddProton = getDeployData('Proton', chainId);
    const ddProtonB = getDeployData('ProtonB', chainId);
    const ddLepton = getDeployData('Lepton', chainId);
    const ddExternalERC721 = getDeployData('ExternalERC721', chainId);
    const ddFungibleERC1155 = getDeployData('FungibleERC1155', chainId);
    const ddNonFungibleERC1155 = getDeployData('NonFungibleERC1155', chainId);

    let externalERC721, fungibleERC1155, nonFungibleERC1155, gasCosts;

    const nftReceiver = user5;

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Mint Proton & Lepton Tokens ');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - For Receiver:    ', nftReceiver);
    log(' ');

    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

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

      log('  Loading FungibleERC1155 from: ', ddFungibleERC1155.address);
      const FungibleERC1155 = await ethers.getContractFactory('FungibleERC1155');
      fungibleERC1155 = await FungibleERC1155.attach(ddFungibleERC1155.address);

      log('  Loading NonFungibleERC1155 from: ', ddNonFungibleERC1155.address);
      const NonFungibleERC1155 = await ethers.getContractFactory('NonFungibleERC1155');
      nonFungibleERC1155 = await NonFungibleERC1155.attach(ddNonFungibleERC1155.address);
    }



    const _mintProtonNft = async (index, type, tokenUri, minter) => {
      log(`   - Minting Proton ${index+1}, Type "${type}" with URI: ${tokenUri}...`);
      const contract = type === 'A' ? proton : protonB;
      const signer = ethers.provider.getSigner(minter);
      const tokenId = await callAndReturn({
        contractInstance: contract,
        contractMethod: 'createBasicProton',
        contractCaller: signer,
        contractParams: [
          minter,    // creator
          minter,    // receiver
          tokenUri,
        ],
      });
      return {contract, address: contract.address, tokenId: tokenId.toString()};
    };

    const _mintExternalERC721 = async (index, contract, type, tokenUri, minter) => {
      log(`   - Minting 721 NFT ${index+1}, Type "${type}" with URI: ${tokenUri}...`);
      const signer = ethers.provider.getSigner(minter);
      const tokenId = await callAndReturn({
        contractInstance: contract,
        contractMethod: 'mintNft',
        contractCaller: signer,
        contractParams: [
          minter,    // receiver
          tokenUri,
        ],
      });
      return {contract, address: contract.address, tokenId: tokenId.toString()};
    };

    const _mintExternalERC1155 = async (index, contract, type, minter, args = []) => {
      log(`   - Minting 1155 NFT ${index+1}, Type "${type}"...`);
      const signer = ethers.provider.getSigner(minter);
      const tokenId = await callAndReturn({
        contractInstance: contract,
        contractMethod: 'mintNft',
        contractCaller: signer,
        contractParams: args,
      });
      return {contract, address: contract.address, tokenId: tokenId.toString()};
    };

    const _covalentBond = async (account, managerId, nftA, nftB, nftAmount = 1) => {
      log(`   - Bonding NFT "${nftB.tokenId}" into "${nftA.tokenId}"...`);
      const signer = ethers.provider.getSigner(account);

      const tx = await nftB.contract.connect(signer).setApprovalForAll(chargedParticles.address, true);
      await tx.wait();
      return await callAndReturn({
        contractInstance: chargedParticles,
        contractMethod: 'covalentBond',
        contractCaller: signer,
        contractParams: [
          nftA.address,
          nftA.tokenId,
          managerId,
          nftB.address,
          nftB.tokenId,
          nftAmount
        ],
      });
    };


    const testingTokens = {
      externalERC721: [],
      fungibleERC1155: [],
      nonFungibleERC1155: [],
      protons: [],
    };
    let tokenIds, data;



    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // ERC721
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (!isProd) {
      log(' ');
      log('  Minting External ERC721s...');
      for (let i = 0; i < _externalERC721.length; i++) {
        data = await _mintExternalERC721(i, externalERC721, "ExternalERC721", _externalERC721[i], nftReceiver);
        testingTokens.externalERC721.push(data);
      }
      if (testingTokens.externalERC721.length) {
        tokenIds = _.reduce(testingTokens.externalERC721, (final, obj) => { final.push(obj.tokenId); return final; }, []);
        log(`   == Minted External ERC721 Token IDs: ${tokenIds}`);
      }
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // ERC1155
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (!isProd) {
      log(' ');
      log('  Minting Fungible ERC1155s...');

      // 10 Fungible ERC1155s
      testingTokens.fungibleERC1155.push(await _mintExternalERC1155(0, fungibleERC1155, 'Fungible', nftReceiver, [nftReceiver, 10]));
      log(`   == Minted Fungible ERC1155 Token IDs: ${testingTokens.fungibleERC1155[0].tokenId}`);

      log(' ');
      log('  Minting Non-Fungible ERC1155s...');
      // 3 NonFungible ERC1155s
      const nonFungibleTokens = [
        await _mintExternalERC1155(1, nonFungibleERC1155, 'Non-Fungible', nftReceiver, [nftReceiver]),
        await _mintExternalERC1155(2, nonFungibleERC1155, 'Non-Fungible', nftReceiver, [nftReceiver]),
        await _mintExternalERC1155(3, nonFungibleERC1155, 'Non-Fungible', nftReceiver, [nftReceiver]),
      ];
      testingTokens.nonFungibleERC1155.push(...nonFungibleTokens);
      tokenIds = _.reduce(nonFungibleTokens, (final, obj) => { final.push(obj.tokenId); return final; }, []);
      log(`   == Minted Non-Fungible ERC1155 Token IDs: ${tokenIds}`);
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Protons
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (!isProd) {
      log(' ');
      log('  Minting NFTs from Rob\'s Collection');
      for (let i = 0; i < RobsTestCollection.length; i++) {
        data = await _mintProtonNft(i, i>2?'B':'A', RobsTestCollection[i], nftReceiver);
        testingTokens.protons.push(data);
      }
      if (testingTokens.protons.length) {
        tokenIds = _.reduce(testingTokens.protons, (final, obj) => { final.push(obj.tokenId); return final; }, []);
        log(`   == Minted Protons with Token IDs: ${tokenIds}`);
      }
    }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Charges
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (testingTokens.protons.length) {
      log(' ');
      log('  Charging up the Particles');

      // Proton B into Proton A
      await _covalentBond(
        nftReceiver,
        'generic.B',
        testingTokens.protons[0], // Proton A - #1
        testingTokens.protons[3], // Proton B - #1
      );

      // Proton A into Proton B
      await _covalentBond(
        nftReceiver,
        'generic.B',
        testingTokens.protons[4], // Proton B - #2
        testingTokens.protons[1], // Proton A - #2
      );

      // Deposit ERC1155s into Proton A - #3
      await _covalentBond(
        nftReceiver,
        'generic.B',
        testingTokens.protons[2],         // Proton A - #3
        testingTokens.fungibleERC1155[0], // Fungible Token
        3                                 // Amount of Tokens to Deposit
      );

      // Deposit ERC1155s into Proton B - #3
      await _covalentBond(
        nftReceiver,
        'generic.B',
        testingTokens.protons[5],            // Proton B - #3
        testingTokens.nonFungibleERC1155[0], // Non-Fungible Token # 1
      );

      // Deposit ERC20s into Proton B - #10
      // todo..

      // Deposit ERC20s into Proton B - #9
      // todo..

      // Russian Doll of Proton Bs (#7 holds #8 which holds #9 which holds #10)
      await _covalentBond(nftReceiver, 'generic.B', testingTokens.protons[8], testingTokens.protons[9]);
      await _covalentBond(nftReceiver, 'generic.B', testingTokens.protons[7], testingTokens.protons[8]);
      await _covalentBond(nftReceiver, 'generic.B', testingTokens.protons[6], testingTokens.protons[7]);
    }






    // await executeTx('1-a', 'Minting Single Proton, Type "B"', async () =>
    //   await protonB.createProton(
    //     initialMinter,
    //     initialMinter,
    //     SingularityCollection[0],
    //   )
    // );


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



    log('\n  Token Minting Complete!');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}

module.exports.tags = ['mint-tokens']