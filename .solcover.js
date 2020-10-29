module.exports = {
    mocha: { reporter: 'mocha-junit-reporter' },
    skipFiles: [
      "assets/dai/Dai.sol",
      "test"
    ]
  };