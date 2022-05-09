const {
  TASK_TEST,
  TASK_COMPILE_GET_COMPILER_INPUT
} = require('hardhat/builtin-tasks/task-names');

require('dotenv').config();

require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-gas-reporter');
require('hardhat-abi-exporter');
require('solidity-coverage');
require('hardhat-deploy-ethers');
require('hardhat-deploy');
require("hardhat-watcher");


// This must occur after hardhat-deploy!
task(TASK_COMPILE_GET_COMPILER_INPUT).setAction(async (_, __, runSuper) => {
  const input = await runSuper();
  input.settings.metadata.useLiteralContent = process.env.USE_LITERAL_CONTENT != 'false';
  console.log(`useLiteralContent: ${input.settings.metadata.useLiteralContent}`);
  return input;
});

// Task to run deployment fixtures before tests without the need of "--deploy-fixture"
//  - Required to get fixtures deployed before running Coverage Reports
task(
  TASK_TEST,
  "Runs the coverage report",
  async (args, hre, runSuper) => {
    await hre.run('compile');
    await hre.deployments.fixture();
    return runSuper({...args, noCompile: true});
  }
);


const mnemonic = {
  testnet: `${process.env.TESTNET_MNEMONIC}`.replace(/_/g, ' '),
  mainnet: `${process.env.MAINNET_MNEMONIC}`.replace(/_/g, ' '),
};

const optimizerDisabled = process.env.OPTIMIZER_DISABLED

module.exports = {
    solidity: {
        compilers: [
          {
            version: '0.6.12',
            settings: {
                optimizer: {
                    enabled: !optimizerDisabled,
                    runs: 200
                }
            },
            evmVersion: 'istanbul'
          },
          {
            version: '0.4.11', // for testing cryptopunks (matches compiler version of etherscan verified contract)
            settings: {
              optimizer: {
                enabled: true,
                runs: 200
              }
            }
          }
        ]
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: './build/contracts',
        deploy: './deploy',
        deployments: './deployments'
    },
    networks: {
        hardhat: {
            blockGasLimit: 200000000,
            allowUnlimitedContractSize: true,
            gasPrice: 1e9,
            forking: {
                url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_APIKEY}`,
                blockNumber: 11400000,  // MUST be after Aave V2 was deployed
                timeout: 1000000
            },
        },
        kovan: {
            // url: `https://kovan.infura.io/v3/${process.env.INFURA_APIKEY}`,
            url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_APIKEY}`,
            gasPrice: 3e9,
            blockGasLimit: 12400000,
            accounts: {
                mnemonic: mnemonic.testnet,
                initialIndex: 0,
                count: 10,
            }
        },
        mumbai: {
            url: `https://rpc-mumbai.matic.today`,
            // url: `https://rpc-mumbai.maticvigil.com/v1/${process.env.MATIC_APIKEY}`,
            // url: `https://matic-mumbai.chainstacklabs.com/`,
            gasPrice: 3e9,
            accounts: {
                mnemonic: mnemonic.testnet,
                initialIndex: 0,
                count: 10,
            },
            chainId: 80001
        },
        polygon: {
            // url: `https://rpc-mainnet.maticvigil.com/v1/${process.env.MATIC_APIKEY}`,
            url: `https://matic-mainnet.chainstacklabs.com/`,
            gasPrice: 120e9,
            accounts: {
                mnemonic: mnemonic.mainnet,
                initialIndex: 0,
                count: 3,
            }
        },
        mainnet: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_APIKEY}`,
            // url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_APIKEY}`,
            gasPrice: 40e9,
            blockGasLimit: 12487794,
            accounts: {
                mnemonic: mnemonic.mainnet,
                initialIndex: 0,
                count: 3,
            }
        },
    },
    etherscan: {
      apiKey: {
        mainnet: process.env.ETHERSCAN_APIKEY,
        kovan: process.env.ETHERSCAN_APIKEY,
        polygon: process.env.POLYGONSCAN_APIKEY,
        polygonMumbai: process.env.POLYGONSCAN_APIKEY,
      }
    },
    // polygonscan: {
    //   apiKey: process.env.POLYGONSCAN_APIKEY
    // },
    gasReporter: {
        currency: 'USD',
        gasPrice: 1,
        enabled: (process.env.REPORT_GAS) ? true : false
    },
    abiExporter: {
      path: './abis',
      runOnCompile: true,
      // Mindful of https://github.com/ItsNickBarry/hardhat-abi-exporter/pull/29/files
      // and https://github.com/ItsNickBarry/hardhat-abi-exporter/pull/35 as they heavily change behavior around this package
      clear: true,
      flat: true,
      only: [
        'Universe',
        'ChargedState',
        'ChargedSettings',
        'ChargedManagers',
        'ChargedParticles',
        'ParticleSplitter',
        'AaveWalletManager',
        'AaveWalletManagerB',
        'AaveBridgeV2',
        'GenericWalletManager',
        'GenericWalletManagerB',
        'GenericBasketManager',
        'GenericBasketManagerB',
        'Ionx',
        'Proton',
        'ProtonB',
        'Lepton',
        'Lepton2',
        'ERC20',
        'ERC721',
        'ExternalERC721',
        'FungibleERC1155',
        'NonFungibleERC1155',
        'YieldFarm',
        'Staking',
        'YieldFarm2',
        'Staking2',
        'CommunityVault',
        'MerkleDistributor',
        'MerkleDistributor2',
        'MerkleDistributor3',
        'TokenInfoProxy',
        'VestingClaim',
        'VestingClaim2',
        'VestingClaim3',
        'VestingClaim4',
        'VestingClaim5',
        'VestingClaim6',
        'VestingClaim7',
      ],
    },
    namedAccounts: {
        deployer: {
          default: 0,
        },
        protocolOwner: {
          default: 1,
          1: '0x0Ca678b984186b0117501C00d4A6B4F8F342D06D', // IONX Gnosis Multisig
        },
        initialMinter: {
          default: 2,
        },
        user1: {
          default: 3,
        },
        user2: {
          default: 4,
        },
        user3: {
          default: 5,
        },
        trustedForwarder: {
          default: 7, // Account 8
          1: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // mainnet
          3: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // ropsten
          4: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // rinkeby
          42: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // kovan
          137: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // Polygon L2 Mainnet
          80001: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // Polygon L2 Testnet - Mumbai
        }
    },
    watcher: {
      compilation: {
        tasks: ["compile"],
        files: ["./contracts"],
        verbose: true,
      },
      test: {
        tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
        files: ['./test/**/*'],
        verbose: true
      }
    },
};
