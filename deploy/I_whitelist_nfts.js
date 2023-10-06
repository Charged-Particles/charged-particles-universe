const {
  getDeployData,
} = require('../js-helpers/deploy');

const {
  executeTx,
} = require('../js-helpers/executeTx');

const {
  log,
  chainTypeById,
  chainNameById,
  chainIdByName,
} = require('../js-helpers/utils');

const _ = require('lodash');

const _WHITELISTED_CONTRACTS = {
  '1': [
    // "0x63174fa9680c674a5580f7d747832b2a2133ad8f", // Proton A
    // "0x04d572734006788B646ce35b133Bdf7160f79995", // Proton B
    // "0xBb4Ddbc0E26d4E4ae838B12a832379295D5fD917", // Proton C (Soul)
    // "0x3cd2410eaa9c2dce50af6ccab72dc93879a09c1f", // Lepton 2
    // "0xcd2ba94e435e536dc48648eab2f4f1db257bc64c", // Particlon
    // "0xB66a603f4cFe17e3D27B87a8BfCaD319856518B8", // Rarible ERC1155
    // "0xd07dc4262bcdbf85190c01c996b4c06a461d2430", // Rarible Collection
    // "0xd07dc4262bcdbf85190c01c996b4c06a461d2430", // Rarible RARI
    // "0xdfe3ac769b2d8e382cb86143e0b0b497e1ed5447", // THE PLUTO ALLIANCE
    // "0x929167191ca41a4753eda357bb6e5ad6f15fb89b", // Trism Originals
    // "0xd86898728aa9921101515a38b7d15d16c682e8ce", // Trism Vaults
    // "0xc0cb81c1f89ab0873653f67eea42652f13cd8416", // Lobby Lobsters
    // "0x2D92C4f9F75308d0b9b098B142369032E4f901Ff", // Floor Gen 3
    // "0xCcc441ac31f02cD96C153DB6fd5Fe0a2F4e6A68d", // FLUF
    // "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // Bored Apes
    // "0x60E4d786628Fea6478F785A6d7e704777c86a7c6", // Mutant Apes
    // "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", // Doodle
    // "0x23581767a106ae21c074b2276D25e5C3e136a68b", // MoonBirds
    // "0xD2A077Ec359D94E0A0b7E84435eaCB40A67a817c", // Admit One
    // "0x1cBB182322Aee8ce9F4F1f98d7460173ee30Af1F", // Polymorph
    // "0x76236B6f13F687D0bbeDbbCe0e30e9F07d071C1C", // RealVision Pro
    // "0xc36cb218848F173148ff55f4dfC18f1540FB7475", // Mango's Blue Chips
    // "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03", // Nouns
    // "0x4b10701bfd7bfedc47d50562b76b436fbb5bdb3b", // Lil Nuons
    // "0x2a46f2ffd99e19a89476e2f62270e0a35bbf0756", // Makersplace v2
    // "0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258", // Otherdeed
    // "0xed5af388653567af2f388e6224dc7c4b3241c544", // Azuki
    // "0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b", // Clone X
    // "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7", // Meebits
    // "0xba30e5f9bb24caa003e9f2f0497ad287fdf95623", // Bored Ape Kennel Club
    // "0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7", // Loot
    // "0xe785e82358879f061bc3dcac6f0444462d4b5330", // World Of Women
    // "0x1cb1a5e65610aeff2551a50f76a87a7d3fb649c6", // Cryptoadz
    // "0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949", // Beanz
    // "0x4db1f25d3d98600140dfc18deb7515be5bd293af", // Hape Prime
    // "0xa3aee8bce55beea1951ef834b99f3ac60d1abeeb", // Veefriends
    // "0xbd3531da5cf5857e7cfaa92426877b022e612cf8", // Pudgy Penguins
    // "0x629a673a8242c2ac4b7b8c5d8735fbeac21a6205", // Sorare
    // "0xbd4455da5929d5639ee098abfaa3241e9ae111af", // NFT Worlds
    // "0x9a534628b4062e123ce7ee2222ec20b86e16ca8f", // Mekaverse
    // "0x7d8820fa92eb1584636f4f5b8515b5476b75171a", // Murakami flowers
    // "0x4f89cd0cae1e54d98db6a80150a824a533502eea", // Peaceful Groupies
    // "0x59468516a8259058bad1ca5f8f4bff190d30e066", // Invisible Friends
    // "0xc2c747e0f7004f9e8817db2ca4997657a7746928", // Hashmasks
    // "0xbce3781ae7ca1a5e050bd9c4c77369867ebc307e", // Goblintown
    // "0x79fcdef22feed20eddacbb2587640e45491b757f", // Mfers
    // "0xc92ceddfb8dd984a89fb494c376f9a48b999aafc", // Creature World
    // "0xb4d06d46a8285f4ec79fd294f78a881799d8ced9", // 3landers
    // "0x892848074ddea461a15f337250da3ce55580ca85", // Cyberbrokers
    // "0x57a204aa1042f6e66dd7730813f4024114d74f37", // Cyberkongz
    // "0x4b3406a41399c7fd2ba65cbc93697ad9e7ea61e5", // Lost Poets
    // "0x86c10d10eca1fca9daf87a279abccabe0063f247", // Cool Pets
    // "0x8943c7bac1914c9a7aba750bf2b6b09fd21037e0", // Lazy Lions
    // "0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0", // SuperRare
    // "0xabb3738f04dc2ec20f4ae4462c3d069d02ae045b", // KnownOrigin
    // "0x79986af15539de2db9a5086382daeda917a9cf0c", // Voxels Parcel
    // "0xe6A5e67F92CC6219E9c210f2734A6175Ee4eE6D1", // Moda Dropcase NFT (DropCase)
    // "0x5d183d790d6b570eaec299be432f0a13a00058a9", // HMNZone
    // "0x92939Fc66f67017832be6b279410a59cA6A42a20", // APE Domains .ape
  ],
  '5': [
    // "0xAEdEDf4A27d4Ea6f658b5F69F70a72d12BDeb937", // Proton
    // "0xEDa5dA03bB30f7137F00787edAee84ae4fD54905", // Proton
    // "0xfb6075A3f960DBcd28Ae4Bb45092ce33D2909060", // Proton
    // "0xd1bCe91a13089b1f3178487aB8d0d2Ae191C1963", // Proton B
    // "0x1554b19E1eD9FE78F375AC7c8F63Fe9E85d15a16", // Proton B
    // "0x517fEfB53b58Ec8764ca885731Db20Ca2dcac7b7", // Proton B
    // "0xF0e4ed501ED7d960886e3f9E8d569e1a1253Eb53", // Proton B
    // "0x6D05f07c30be99317D649302dA2054C667Cdd93D", // Proton C (Soul)
    // "0x92971E5bB4d098CaCf2314292bDb5eDC3f5CF25e", // Proton C (Soul)
    // "0xc191e3De6e8ab034Adc4B199749F7199DA9a98e6", // Lepton 2
    // "0xef815ad5401cee4b8b2e6bc2f8c481d84e5d0871", // External NFT Example Contract
  ],
  '42': [
    // "0xAEdEDf4A27d4Ea6f658b5F69F70a72d12BDeb937", // Proton
    // "0xEDa5dA03bB30f7137F00787edAee84ae4fD54905", // Proton
    // "0xfb6075A3f960DBcd28Ae4Bb45092ce33D2909060", // Proton
    // "0xd1bCe91a13089b1f3178487aB8d0d2Ae191C1963", // Proton B
    // "0x1554b19E1eD9FE78F375AC7c8F63Fe9E85d15a16", // Proton B
    // "0x517fEfB53b58Ec8764ca885731Db20Ca2dcac7b7", // Proton B
    // "0xF0e4ed501ED7d960886e3f9E8d569e1a1253Eb53", // Proton B
    // "0xf5891837cc808f8d20a76c6a5db5a0c5374b6a1b", // Proton C (Soul)
    // "0xef815ad5401cee4b8b2e6bc2f8c481d84e5d0871", // External NFT Example Contract
  ],
  '137': [
    // "0xe2a9b15e283456894246499fb912cce717f83319", // Proton
    // "0x1CeFb0E1EC36c7971bed1D64291fc16a145F35DC", // Proton B
    // "0x59dde2EBe605cD75365F387FFFE82E5203b8E4cd", // Proton C (Soul)
    // "0x4ed360c8725d3a63f564f8484a582d0a7cecea7a", // Lepton 2
    // "0x9d305a42a3975ee4c1c57555bed5919889dce63f", // Sandbox Land
    // "0x28BFEFd2FDc109527D9d5e459417b12a8eF3AC0B", // Moda Dropcase NFT (DropCase)
    // "0x96c89cc7c5d2fbfa41afa10da5917742ff35941b", // Elder ENTS
    // "0x135dE69e2C8A6f14f00dcf9c9e8D8120FBebeF5a", // HMNZone
    // "0x4bf5a99ea2f8de061f7d77ba9edd749503d945da", // .BASIN (FlexiPunkTLD)
    // "0xf6a44012d24ca5d67ece21ea7d34886a55754e86" // TaterDAO Land
  ],
  '80001': [
    // "0xd02cB38f5D68333219d32Ea2a08c3BCdC92753F2", // Proton
    // "0xd04f13d02ea469dfF7eEce1b1aE0Ca234837DB38", // Proton B
    // "0x56D0d2e232e73634E5E9aaAB5d1b2f2e68e062Bd", // Proton C (Soul)
    // "0x3e3792288599A748B242F6626E276Cae43f0f688", // Lepton 2
    // "0xbc7895fa82a2e5c575b8105f62d2e57d53b6e75c", // External NFT Example Contract
    // "0x865Bd661EEFE49C4Ebd096e87720528C12959Ab9", // Moda Dropcase NFT (DropCase)
  ]
};


module.exports = async (hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer, protocolOwner } = await getNamedAccounts();
    const network = await hre.network;
    let iface, fragment, fnSig;

    const chainId = chainIdByName(network.name);
    const {isProd, isHardhat} = chainTypeById(chainId);

    // if (chainId !== 42) { return; } // Kovan only

    const ddChargedSettings = getDeployData('ChargedSettings', chainId);
    // const ddProton = getDeployData('Proton', chainId);
    // const ddProtonB = getDeployData('ProtonB', chainId);
    // const ddLepton = getDeployData('Lepton', chainId);
    // const ddTokenInfoProxy = getDeployData('TokenInfoProxy', chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles Protocol - External NFTs');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', chainNameById(chainId));
    log('  Using Accounts:');
    log('  - Deployer:          ', deployer);
    log('  - Owner:             ', protocolOwner);
    log(' ');

    log('  Loading ChargedSettings from: ', ddChargedSettings.address);
    const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
    const chargedSettings = await ChargedSettings.attach(ddChargedSettings.address);

    // log('  Loading TokenInfoProxy from: ', ddTokenInfoProxy.address);
    // const TokenInfoProxy = await ethers.getContractFactory('TokenInfoProxy');
    // const tokenInfoProxy = await TokenInfoProxy.attach(ddTokenInfoProxy.address);

    // if (chainId === 31337) {
    //   const ddExternalERC721 = getDeployData('ExternalERC721', chainId);
    //   _WHITELISTED_CONTRACTS['31337'] = [
    //     ddProton.address,
    //     ddProtonB.address,
    //     ddLepton.address,
    //     ddExternalERC721.address,
    //   ];
    // }


    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Enable Contracts for Charging
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    if (_WHITELISTED_CONTRACTS[chainId].length) {
      await executeTx('1-a', `ChargedSettings: Enabling ${_WHITELISTED_CONTRACTS[chainId].length} Contracts for Chain ID: ${chainId}`, async () =>
        await chargedSettings.enableNftContracts(_WHITELISTED_CONTRACTS[chainId])
      );
    }

    // await executeTx('1-a', `ChargedSettings: Enabling External NFT for "crypto-j-42"`, async () =>
    //   await chargedSettings.enableNftContracts(['0x9C97e093A01061C7FDc7ED6c1eeCA0C20C3d294F'])
    // );


    // Remap Function Signatures:
    // ref: https://abi.hashex.org/

    // SuperRare
    // iface = new ethers.utils.Interface([ 'function tokenCreator(uint256)' ]);
    // fragment = iface.getFunction('tokenCreator');
    // fnSig = iface.getSighash(fragment);
    // await executeTx('2-a', `TokenInfoProxy: Remapping "creatorOf" for SuperRare to Signature: ${fnSig}`, async () =>
    //   await tokenInfoProxy.setContractFnOwnerOf('0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0', fnSig)
    // );

    // KnownOrigin
    // iface = new ethers.utils.Interface([ 'function getCreatorOfToken(uint256)' ]);
    // fragment = iface.getFunction('getCreatorOfToken');
    // fnSig = iface.getSighash(fragment);
    // await executeTx('2-b', `TokenInfoProxy: Remapping "creatorOf" for KnownOrigin to Signature: ${fnSig}`, async () =>
    //   await tokenInfoProxy.setContractFnOwnerOf('0xabb3738f04dc2ec20f4ae4462c3d069d02ae045b', fnSig)
    // );


    log(`\n  Contract Initialization Complete!`);
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['whitelist-nfts'];
