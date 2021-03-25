// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0;

interface ICErc20 {
  event Failure(uint error, uint info, uint detail);

  function underlying() external view returns (address);
  function balanceOf(address owner) external view returns (uint);
  function transfer(address dst, uint amount) external returns (bool);
  function mint(uint mintAmount) external returns (uint);
  function redeem(uint redeemTokens) external returns (uint);
  function redeemUnderlying(uint redeemAmount) external returns (uint);
  function borrow(uint borrowAmount) external returns (uint);
  function repayBorrow(uint repayAmount) external returns (uint);
}