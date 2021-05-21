const { tokenInfo, stakingDate } = require('../config');

const { bn, tokens, tokensBN, calculateSumArithmeticSeriesAtN, dateToEpoch, timeInSecs, CONSTANT_100K, CONSTANT_1M } = require('../../js-helpers/utils');

const stakingInfo = {
  staking: {
    epochDuration: timeInSecs(7,24,60,60),
    communityVaultAddress: "", // Fill me?
    ionTokenAddress: {
        kovan: '0xD4b7e8676b2A7fAa6bd175234ffB48316d81DD38',
        mainnet: '0xCB367047f6860566a10ab778A02fA48eeCD1f22e',
    }
  },
  ionToken: {
    startAmount: bn(48_077),
    epoch1Start: dateToEpoch(stakingDate), // 19 May 2021 2 PM UTC
    nrOfEpochs: bn(12), // 7 daysPerEpoch
    deprecation: bn(100),
  },
  liquidityPoolTokens: {
    startAmount: bn(48_077),
    epoch1Start: dateToEpoch(stakingDate), // 19 May 2021 2 PM UTC
    nrOfEpochs: bn(12),
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