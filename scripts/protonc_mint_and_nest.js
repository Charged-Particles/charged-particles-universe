// yarn hardhat run scripts/protonc_mint_and_nest.js --network somnia-testnet
const hre = require("hardhat");
const {
    getDeployData,
} = require('../js-helpers/deploy');

async function main() {
    const { ethers, getNamedAccounts } = hre;
    const log = console.log;
    const network = await ethers.provider.getNetwork();
    log(network);

    // Named accounts, defined in buidler.config.js:
    const { deployer, owner } = await getNamedAccounts();

    const ddProtonC = getDeployData('ProtonC', network.chainId);
    const ddChargedParticles = getDeployData('ChargedParticles', network.chainId);

    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log('Charged Particles: Mint ProtonC NFTs and Nest Them');
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

    log('  Using Network: ', network.chainId);
    log('  Using Accounts:');
    log('  - Deployer:    ', deployer);
    log('  - Owner:       ', owner);
    log(' ');

    // Load ProtonC contract
    log('  Loading ProtonC from: ', ddProtonC.address);
    const ProtonC = await ethers.getContractFactory('ProtonC');
    const protonC = await ProtonC.attach(ddProtonC.address);

    // Load ChargedParticles contract
    log('  Loading ChargedParticles from: ', ddChargedParticles.address);
    const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
    const chargedParticles = await ChargedParticles.attach(ddChargedParticles.address);

    // Mint first ProtonC NFT
      log('  Minting first ProtonC NFT...');
      const tokenId1 = await protonC.callStatic.createBasicProton(deployer, deployer, 'https://example.com/token1');
      await protonC.createBasicProton(deployer, deployer, 'https://example.com/token1').then(tx => tx.wait());
      log('  Minted ProtonC NFT #', tokenId1.toString());

      // Mint second ProtonC NFT
      log('  Minting second ProtonC NFT...');
      const tokenId2 = await protonC.callStatic.createBasicProton(deployer, deployer, 'https://example.com/token2');
      await protonC.createBasicProton(deployer, deployer, 'https://example.com/token2').then(tx => tx.wait());
      log('  Minted ProtonC NFT #', tokenId2.toString());

    // const tokenId1 = 1;
    // const tokenId2 = 2;
    const basketManagerId = 'generic.B';

    // Approve ChargedParticles to transfer the second NFT
    log('  Approving ChargedParticles to transfer NFT #', tokenId2.toString(), '...');
    await protonC.approve(ddChargedParticles.address, tokenId2).then(tx => tx.wait());
    log('  Approved ChargedParticles for NFT #', tokenId2.toString());

    console.log({
        protoncc: protonC.address,    // contractAddress
        tokenId1,           // tokenId (parent)
        basketManagerId,    // basketManagerId
        protonc: protonC.address,    // nftTokenAddress
        tokenId2,           // nftTokenId (child)
        amount: 1                   // nftTokenAmount
    })
    // Nest the second NFT into the first one using covalent bonding
    log('  Nesting NFT #', tokenId2.toString(), ' into NFT #', tokenId1.toString(), '...');
    
    await chargedParticles.covalentBond(
        protonC.address,    // contractAddress
        tokenId1,           // tokenId (parent)
        basketManagerId,    // basketManagerId
        protonC.address,    // nftTokenAddress
        tokenId2,           // nftTokenId (child)
        1                   // nftTokenAmount
    ).then(tx => tx.wait());
    log('  Successfully nested NFT #', tokenId2.toString(), ' into NFT #', tokenId1.toString());

    log('\n  Transaction Execution Complete!');
    log('  - Parent NFT ID: ', tokenId1.toString());
    log('  - Child NFT ID:  ', tokenId2.toString());
    log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });