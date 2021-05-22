const { tokenInfo, stakingDate } = require('../config');

const { bn, tokens, tokensBN, calculateSumArithmeticSeriesAtN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../js-helpers/utils');

const firstEpochPools = dateToEpoch(stakingDate); // 22 May 2021 11 AM UTC

const stakingInfo = {
  staking: {
    epochDuration: 60*60,
  },
  ionToken: {
    startAmount: bn(48_077),
    epoch1Start: firstEpochPools, 
    nrOfEpochs: bn(96), // 1 hourPerEpoch
    deprecation: bn(100),
  },
  liquidityPoolTokens: {
    startAmount: bn(48_077),
    epoch1Start: firstEpochPools,
    nrOfEpochs: bn(96),
    deprecation: bn(100),
  },
  nftYieldFarmingL1: {
    //   startAmount: bn(192_308), 192_308 ? to split by 2?
    //   epoch1Start: dateToEpoch(nftYieldFarmDate),
    //   nrOfEpochs: bn(100),
  },
  nftYieldFarmingSideChain: {},
  helpers: {
    getIonDistributionAmount: function() {
      const a1 = stakingInfo.ionToken.startAmount;
      const d = stakingInfo.ionToken.deprecation;
      const n = stakingInfo.ionToken.nrOfEpochs;

      const sumAtN = calculateSumArithmeticSeriesAtN(a1, d, n);
      return tokensBN(sumAtN); // 4_312_700_000_000_000_000_000_000
    },
    getLiquidityDistributionAmount: function() {
      const a1 = stakingInfo.liquidityPoolTokens.startAmount;
      const d = stakingInfo.liquidityPoolTokens.deprecation;
      const n = stakingInfo.liquidityPoolTokens.nrOfEpochs;

      const sumAtN = calculateSumArithmeticSeriesAtN(a1, d, n);
      return tokensBN(sumAtN); // // 4_312_700_000_000_000_000_000_000
    }
  },
  encrypted: {
    text: "plain"
  }
}

module.exports = {
  stakingInfo,
}