// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface IATokenV2 {
  function transferOnLiquidation(address from, address to, uint256 value ) external;
  function transferUnderlyingTo(address user, uint256 amount) external returns (uint256);
  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function scaledBalanceOf(address user) external view returns (uint256);
  function getScaledUserBalanceAndSupply(address user) external view returns (uint256, uint256);
  function scaledTotalSupply() external view returns (uint256);
}
