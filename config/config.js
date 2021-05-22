require('dotenv').config();

const vestingDate = '22/05/2021 11:00';
const stakingDate = '22/05/2021 11:00';

const nftYieldFarmDate = '15/06/2021 14:00';

const uniswapV2Addr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";


const tokenInfo = {
  // token info to test
  name: 'Charged Particles - ION"',
  symbol: 'ION',
  decimals: 18,
  supply: 100_000_000, // 100 Million $IONX
};

module.exports = {
  tokenInfo,
  vestingDate,
  stakingDate,
  nftYieldFarmDate,
  uniswapV2Addr
};
