// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.7.0;

contract EthSender {
  receive () external payable {}

  function sendEther(address target) public {
    selfdestruct(payable(target));
  }
}
