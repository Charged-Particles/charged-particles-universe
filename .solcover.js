require('dotenv').config();

module.exports = {
    mocha: {
      reporter: 'mocha-junit-reporter',
      grep: "@skip-on-coverage", // Find everything with this tag
      invert: true               // Run the grep's inverse set.
    },
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