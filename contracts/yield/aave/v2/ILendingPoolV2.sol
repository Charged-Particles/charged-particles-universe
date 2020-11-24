// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

import "./ILendingPoolAddressesProviderV2.sol";

library ReserveConfiguration {
  struct Map {
    uint256 data;
  }
}

library UserConfiguration {
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
  function borrow(address reserve, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
  function repay(address reserve, uint256 amount, uint256 rateMode, address onBehalfOf) external;
  function swapBorrowRateMode(address reserve, uint256 rateMode) external;
  function rebalanceStableBorrowRate(address reserve, address user) external;
  function setUserUseReserveAsCollateral(address reserve, bool useAsCollateral) external;
  function liquidationCall(address collateral, address reserve, address user, uint256 purchaseAmount,bool receiveAToken) external;
  function flashLoan(address receiver, address[] calldata assets, uint256[] calldata amounts, uint256[] calldata modes, address onBehalfOf, bytes calldata params, uint16 referralCode) external;
  function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalBorrowsETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor);
  function initReserve(address reserve, address aTokenAddress, address stableDebtAddress, address variableDebtAddress, address interestRateStrategyAddress) external;
  function setReserveInterestRateStrategyAddress(address reserve, address rateStrategyAddress)external;
  function setConfiguration(address reserve, uint256 configuration) external;
  function getConfiguration(address reserve) external view returns (ReserveConfiguration.Map memory);
  function getUserConfiguration(address user) external view returns (UserConfiguration.Map memory);
  function getReserveNormalizedIncome(address reserve) external view returns (uint256);
  function getReserveNormalizedVariableDebt(address reserve) external view returns (uint256);
  function getReserveData(address asset) external view returns (ReserveLogic.ReserveData memory);
  function finalizeTransfer(address asset, address from, address to, uint256 amount, uint256 balanceFromAfter, uint256 balanceToBefore) external;
  function getReservesList() external view returns (address[] memory);
  function getAddressesProvider() external view returns (ILendingPoolAddressesProviderV2);
  function setPause(bool val) external;
  function paused() external view returns (bool);
}
