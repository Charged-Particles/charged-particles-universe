// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface IComptroller {
  function getAllMarkets() external view returns (address[] memory);
}
