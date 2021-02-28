// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface ICErc20 {
  function balanceOf(address owner) external view returns (uint);
  function transfer(address dst, uint amount) external returns (bool);
  function mint(uint mintAmount) external returns (uint);
  function redeem(uint redeemTokens) external returns (uint);
  function redeemUnderlying(uint redeemAmount) external returns (uint);
}