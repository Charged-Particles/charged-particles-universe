module.exports = {
    mocha: {
      reporter: 'mocha-junit-reporter',
      grep: "@skip-on-coverage", // Find everything with this tag
      invert: true               // Run the grep's inverse set.
    },
    providerOptions: {
      network_id: 31337,
      _chainId: 31337,
      _chainIdRpc: 31337
    },
    client: require('ganache-cli'),
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