const { tokenInfo, uniswapV2Addr } = require('../../config/config');

const DISTRIBUTION_INFO = {
    total: tokens(100 * CONSTANT_1M),
    community: {
      unlocked: {
        total: community.breakdown.unlocked.deposit.tokens,
        launch: {
          total: community.breakdown.unlocked.breakdown.launch.deposit.tokens,
          uniswap: community.breakdown.unlocked.breakdown.launch.breakdown.uniswap.deposit.tokens,
          polkastarter: community.breakdown.unlocked.breakdown.launch.breakdown.polkastarter.deposit.tokens,
        },
        gratitude: {
          total: community.breakdown.unlocked.breakdown.gratitude.deposit.tokens,
          nfts: nfts.tokens,
          airdrop: airdrop.tokens,
        }
      },
      strategic: community.breakdown.strategic.deposit.tokens,
      lprewards: stakingInfo.helpers.getLiquidityDistributionAmount().toString(),
      staking: stakingInfo.helpers.getPushDistributionAmount().toString(),
    },
    team: team.deposit.tokens,
    foundation: foundation.deposit.tokens,
    investors: investors.deposit.tokens
}

