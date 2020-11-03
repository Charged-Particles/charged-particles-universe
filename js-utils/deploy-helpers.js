const { ethers } = require('ethers')

const toWei = ethers.utils.parseEther
const toEth = ethers.utils.formatEther
const toStr = (val) => ethers.utils.toUtf8String(val).replace(/\0/g, '')

const txOverrides = (options = {}) => ({gas: 15000000, ...options})

const chainName = (chainId) => {
  switch (chainId) {
    case 1: return 'Mainnet'
    case 3: return 'Ropsten'
    case 42: return 'Kovan'
    case 31337: return 'BuidlerEVM'
    default: return 'Unknown'
  }
}

const presets = {
  ChargedParticles: {
    fees: {
      deposit: 50, // 0.5%
    }
  },
  Aave: {
    dai: {
      1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // mainnet
      3: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108', // ropsten
      42: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD', // kovan
    },
    aDai: {
      1: '0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d', // mainnet
      3: '0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201', // ropsten
      42: '0x58AD4cB396411B691A9AAb6F74545b2C5217FE6a', // kovan
    },
    lendingPoolProvider: {
      1: '0x24a42fD28C976A61Df5D00D0599C34c4f90748c8', // mainnet
      3: '0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728', // ropsten
      42: '0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5', // kovan
    }
  }
}



// DEPLOYMENT PROCEDURES:

// Deploy Contracts:
//  - Universe            (Upgradeable)
//  - ChargedParticles    (Upgradeable)
//  - AaveWalletManager   (Non-Upgradeable)
//  - Ion Token           (Non-Upgradeable, ERC20)
//  - Proton Token        (Non-Upgradeable, ERC721)
//  - IonTimelock         (Non-Upgradeable)
//     - Foundation (x1)
//     - Team       (x1)
//     - Advisors   (x3 ??)


// Config Contracts:
// - Universe
//     - setChargedParticles
//     - setIonToken
//     - setIonRewardsMultiplier
//     - setIonRewardsForAssetToken
//  - ChargedParticles
//     - setUniverse
//     - setDepositFee
//     - registerLiquidityProvider
//     - setStorageManager ??
//     - updateBlacklist
//  - AaveWalletManager
//     - setReferralCode
//  - Ion Token
//     - setUniverse
//     - mintToUniverse
//     - mintToTimelock
//  - Proton Token
//     - setChargedParticles


// const _getDeployedContract = async (bre, deployer, contractName, contractArgs = []) => {
//     const {deployments} = bre
//     const {deployIfDifferent, log} = deployments;
//     const overrides = txOverrides({from: deployer})

//     let contract = await deployments.getOrNull(contractName)
//     if (!contract) {
//         log(`  Deploying ${contractName}...`)
//         const deployResult = await deployIfDifferent(['data'], contractName, overrides, contractName, ...contractArgs)
//         contract = await deployments.get(contractName)
//         if (deployResult.newlyDeployed) {
//             log(`  - deployed at ${contract.address} for ${deployResult.receipt.gasUsed} WEI`)
//         }
//     }
//     return contract
// }

// // Used in deployment initialization scripts and unit-tests
// const contractManager = (bre) => async (contractName, contractArgs = []) => {
//     const [ deployer ] = await bre.ethers.getSigners()

//     //  Return an Ethers Contract instance with the "deployer" as Signer
//     const contract = await _getDeployedContract(bre, deployer._address, contractName, contractArgs)
//     return new bre.ethers.Contract(contract.address, contract.abi, deployer)
// }

// // Used in deployment scripts run by buidler-deploy
// const contractDeployer = (contractName, contractArgs = []) => async (bre) => {
//     const {getNamedAccounts} = bre
//     const namedAccounts = await getNamedAccounts()
//     return await _getDeployedContract(bre, namedAccounts.deployer, contractName, contractArgs)
// }


module.exports = {
  txOverrides,
  chainName,
  // contractDeployer,
  // contractManager,
  presets,
  toWei,
  toEth,
  toStr,
}