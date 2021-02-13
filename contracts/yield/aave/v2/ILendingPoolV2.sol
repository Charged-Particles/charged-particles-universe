// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

import "./ILendingPoolAddressesProviderV2.sol";

library ReserveConfiguration {
  struct Map {
    uint256 data;
  }
}

library ReserveLogic {
  struct ReserveData {
    ReserveConfiguration.Map configuration;
    uint128 liquidityIndex;
    uint128 variableBorrowIndex;
    uint128 currentLiquidityRate;
    uint128 currentVariableBorrowRate;
    uint128 currentStableBorrowRate;
    uint40 lastUpdateTimestamp;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    uint8 id;
  }
}

interface ILendingPoolV2 {
  function deposit(address reserve, uint256 amount, address onBehalfOf, uint16 referralCode) external;
  function withdraw(address reserve, uint256 amount, address to) external;
  function getReserveData(address asset) external view returns (ReserveLogic.ReserveData memory);
}
