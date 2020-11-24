// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface ILendingPoolAddressesProviderV1 {
    function getLendingPool() external view returns (address);
    function getLendingPoolCore() external view returns (address payable);
}
