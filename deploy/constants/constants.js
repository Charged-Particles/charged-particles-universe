const { tokenInfo, uniswapV2Addr } = require('../../config/config');
const { tokens, CONSTANT_1M } = require('../../js-helpers/utils');
const { community } = require('../../config/community');
const { stakingInfo } = require('../../config/community_breakup/staking');

const DISTRIBUTION_INFO = {
    total: tokens(100 * CONSTANT_1M),
    community: {
      lprewards: stakingInfo.helpers.getLiquidityDistributionAmount().toString(),
      staking: stakingInfo.helpers.getIonDistributionAmount().toString(),
    },
};

const STAKING_INFO = {
  stakingInfo: stakingInfo,
  stakingAmount: stakingInfo.helpers.getIonDistributionAmount().add(stakingInfo.helpers.getLiquidityDistributionAmount())
}

module.exports = {
  DISTRIBUTION_INFO,
  STAKING_INFO,
};