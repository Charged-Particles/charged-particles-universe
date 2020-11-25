// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface ILendingPoolV1 {
  function deposit ( address _reserve, uint256 _amount, uint16 _referralCode ) external payable;
  function getReserveConfigurationData ( address _reserve ) external view returns ( uint256 ltv, uint256 liquidationThreshold, uint256 liquidationDiscount, address interestRateStrategyAddress, bool usageAsCollateralEnabled, bool borrowingEnabled, bool fixedBorrowRateEnabled, bool isActive );
  function getReserveData ( address _reserve ) external view returns ( uint256 totalLiquidity, uint256 availableLiquidity, uint256 totalBorrowsFixed, uint256 totalBorrowsVariable, uint256 liquidityRate, uint256 variableBorrowRate, uint256 fixedBorrowRate, uint256 averageFixedBorrowRate, uint256 utilizationRate, uint256 liquidityIndex, uint256 variableBorrowIndex, address aTokenAddress, uint40 lastUpdateTimestamp );
}
