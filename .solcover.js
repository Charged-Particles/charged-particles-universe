require('dotenv').config();

module.exports = {
    mocha: {
      reporter: 'mocha-junit-reporter',
      grep: "@skip-on-coverage", // Find everything with this tag
      invert: true               // Run the grep's inverse set.
    },
    // providerOptions: {
    //   fork: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_APIKEY}@11320000`,
    //   unlocked_accounts: [
    //     '0x9eb7f2591ed42dee9315b6e2aaf21ba85ea69f8c'
    //   ],
    //   // network_id: 31337,
    //   _chainId: 31337,
    //   _chainIdRpc: 31337
    // },
    // client: require('ganache-cli'),
    skipFiles: [
      "lib/RelayRecipient.sol",
      "yield/v1/IATokenV1.sol",
      "yield/v1/ILendingPoolV1.sol",
      "yield/v1/ILendingPoolAddressesProviderV1.sol",
      "yield/v2/IATokenV2.sol",
      "yield/v2/ILendingPoolV2.sol",
      "yield/v2/ILendingPoolAddressesProviderV2.sol",
      "test"
    ]
  };