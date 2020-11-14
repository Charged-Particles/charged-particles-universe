const {TASK_COMPILE_GET_COMPILER_INPUT} = require('@nomiclabs/buidler/builtin-tasks/task-names');
usePlugin("@nomiclabs/buidler-ethers");

require('dotenv').config();

usePlugin('@nomiclabs/buidler-waffle');
usePlugin('@nomiclabs/buidler-etherscan');
usePlugin('@nomiclabs/buidler-ethers');
usePlugin('@openzeppelin/buidler-upgrades');
usePlugin('buidler-gas-reporter');
usePlugin('buidler-abi-exporter');
usePlugin('solidity-coverage');
usePlugin('buidler-deploy');

// This must occur after buidler-deploy!
task(TASK_COMPILE_GET_COMPILER_INPUT).setAction(async (_, __, runSuper) => {
  const input = await runSuper();
  input.settings.metadata.useLiteralContent = false;
  return input;
});


task("deploy", "Deploy Charged Particles!")
  .addFlag("protocol", "Protocol deployment flag")
  .addFlag("aave", "Aave deployment flag")
  .addFlag("proton", "Proton deployment flag")
  .addFlag("ion", "Ion deployment flag")
  .addFlag("timelocks", "Timelocks deployment flag")
  .setAction(async ({ protocol, aave, proton, ion, timelocks }, hre) => {
    const { deploy } = require("./js-utils/deploy-helpers");
    protocol && await deploy(hre).protocol();
    aave && await deploy(hre).aave();
    proton && await deploy(hre).proton();
    ion && await deploy(hre).ion();
    timelocks && await deploy(hre).timelocks();
  })


const mnemonic = {
  testnet: `${process.env.TESTNET_MNEMONIC}`.replace(/_/g, ' '),
  mainnet: `${process.env.MAINNET_MNEMONIC}`.replace(/_/g, ' '),
};

module.exports = {
    solc: {
        version: '0.6.12',
        optimizer: {
            enabled: true,
            runs: 200
        },
        evmVersion: 'istanbul'
    },
    paths: {
        artifacts: './build',
        deploy: './deploy',
        deployments: './deployments'
    },
    networks: {
        buidlerevm: {
            blockGasLimit: 200000000,
            allowUnlimitedContractSize: true,
            gasPrice: 8e9
        },
        coverage: {
            url: 'http://127.0.0.1:8555',
            blockGasLimit: 200000000,
            allowUnlimitedContractSize: true
        },
        local: {
            url: 'http://127.0.0.1:8545',
            blockGasLimit: 200000000
        },
        kovan: {
            url: `https://kovan.infura.io/v3/${process.env.INFURA_APIKEY}`,
            gasPrice: 10e9,
            blockGasLimit: 200000000,
            accounts: {
                mnemonic: mnemonic.testnet,
                initialIndex: 0,
                count: 3,
            }
        },
        ropsten: {
            url: `https://ropsten.infura.io/v3/${process.env.INFURA_APIKEY}`,
            gasPrice: 10e9,
            blockGasLimit: 200000000,
            accounts: {
                mnemonic: mnemonic.testnet,
                initialIndex: 0,
                count: 3,
            }
        }
    },
    etherscan: {
      apiKey: process.env.ETHERSCAN_APIKEY
    },
    gasReporter: {
        currency: 'USD',
        gasPrice: 1,
        enabled: (process.env.REPORT_GAS) ? true : false
    },
    abiExporter: {
      path: './abis',
      clear: true,
      flat: true,
      only: [
        'Universe',
        'ChargedParticles',
        'AaveWalletManager',
        'Ion',
        'IonTimelock',
        'Proton',
        'ERC20',
        'ERC721'
      ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        owner: {
          default: 1,
        },
        trustedForwarder: {
            default: 7, // Account 8
            1: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // mainnet
            3: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // ropsten
            42: '0x1337c0d31337c0D31337C0d31337c0d31337C0d3', // kovan
        }
    }
};
