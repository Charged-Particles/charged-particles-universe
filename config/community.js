const { tokenInfo } = require('./config');
const { tokens, dateToEpoch, timeInSecs, CONSTANT_1K, CONSTANT_10K, CONSTANT_100K, CONSTANT_1M } = require('../js-helpers/utils');

const { stakingInfo } = require('./community_breakup/staking');


// const commreservoir = {
//     deposit: {
//       tokens: tokens(40352667), // 40,352,667 = 40.35% token
//       start: dateToEpoch(vestingDate), // 11 April 2021 11 PM GMT
//       cliff: timeInSecs(0, 0, 0, 0), // 0 Days in secs = 0d * 0h * 0m * 0s
//       duration: timeInSecs(1350, 24, 60, 60)
//     }
//   }


const community = {
    deposit: {
      tokens: tokens(53 * CONSTANT_1M) // 53 Million Tokens
    },
    breakdown: {
      stakingInfo: stakingInfo
    }
};

module.exports = {
    community
}