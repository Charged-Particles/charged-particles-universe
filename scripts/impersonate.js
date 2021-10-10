
const hre = require("hardhat");
const _ = require('lodash');


async function main() {
  // const { log } = deployments;
  const log = console.log;
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }

  const { ethers, network } = hre; // Get network from HRE.
  //const network = await ethers.provider.getNetwork(); // <- Wrong

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles: Impersonate Account');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  log('  Using Network: ', process.env.HARDHAT_NETWORK);
  
  const myAccount = "0xd62f0E5b1e90489C0d3020CcEcdB8abbE051d5B5";
//   await network.provider.send("hardhat_setBalance", [
//     myAccount,
//     "0x1000",
//   ]); <--- Fails :( 

  const impersonateMoney = '0xbda5747bfd65f08deb54cb465eb87d40e51b197e';

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [impersonateMoney],
  });

  let signer = await ethers.getSigner(impersonateMoney);

  const tx = {
    to: myAccount,
    value: ethers.utils.parseEther("5")
  }
  await signer.sendTransaction(tx); // 5ETH to me!


  const impersonatedAddress = '0x4022891DF7645F87009C048598F2FB9055537A64';
  console.log(Object.keys(network));
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [impersonatedAddress],
  });

  
 // https://app.charged.fi/go/energize/0x63174fa9680c674a5580f7d747832b2a2133ad8f/512 
 // NFT we want to "steal" to debug in the fork
 signer = await ethers.getSigner(impersonatedAddress);

 const txSend = 0;
  signer.sendTransaction();
  log('Done.');
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
