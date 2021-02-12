// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface ILendingPoolAddressesProviderV2 {
  function getLendingPool() external view returns (address);
}