// SPDX-License-Identifier: MIT

// Ion.sol -- Part of the Charged Particles Protocol
// Copyright (c) 2021 Firma Lux, Inc. <https://charged.fi>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

pragma solidity 0.6.12;

import "erc20permit/contracts/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IUniverse.sol";
import "../interfaces/IIonTimelock.sol";
import "../lib/BlackholePrevention.sol";


contract Ion is ERC20Permit, Ownable, BlackholePrevention {

  event LockApproval(address indexed owner, address indexed operator, uint256 amount);

  IUniverse internal _universe;

  // Hard-Cap at 100 Million
  uint256 public cap = 1e8 ether;

  mapping (address => uint256) public locked;
  mapping (address => uint256) public lockedUntil;
  mapping (address => mapping (address => uint256)) internal _lockAllowances;


  // Manual TODO after Launch:
  //  Owner - Mint Portions to Universe which will distribute to Internal Team/Advisors via TokenTimelock
  //  Owner - Mint Portions to Universe for Community Distribution


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor() public ERC20Permit("Charged Particles - ION", "ION") {}


  /***********************************|
  |              Staking              |
  |__________________________________*/

  function lockAllowance(address owner, address operator) external view returns (uint256) {
    return _lockAllowances[owner][operator];
  }

  function approveLock(address operator, uint256 amount) external returns (bool) {
    _approveLock(_msgSender(), operator, amount);
    return true;
  }

  function increaseLockAllowance(address operator, uint256 addedAmount) external returns (bool) {
    _approveLock(_msgSender(), operator, _lockAllowances[_msgSender()][operator].add(addedAmount));
    return true;
  }

  function decreaseLockAllowance(address operator, uint256 subtractedAmount) external returns (bool) {
    _approveLock(_msgSender(), operator, _lockAllowances[_msgSender()][operator].sub(subtractedAmount, "ION:E-409"));
    return true;
  }

  function lock(address account, uint256 amount, uint256 blocks) external returns (bool) {
    // Set number of blocks until unlocked
    // Cannot be changed once locked
    if (lockedUntil[account] <= block.number) { // unlocked
      lockedUntil[account] = blocks.add(block.number);
      locked[account] = 0;
    }

    // Set amount locked
    // Can be increased while locked
    uint256 additional = amount;
    if (locked[account] < amount) {
      additional = amount.sub(locked[account]);
      locked[account] = amount;
    }

    if (account != _msgSender()) {
      _approveLock(account, _msgSender(), _lockAllowances[account][_msgSender()].sub(additional, "ION:E-409"));
    }

    return true;
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the Universe Controller
    */
  function setUniverse(address universe) external onlyOwner {
    _universe = IUniverse(universe);
  }

  function mintToUniverse(uint256 amount) external onlyOwner returns (bool) {
    require(address(_universe) != address(0x0), "ION:E-404");
    _mint(address(_universe), amount);
  }

  function mintToTimelock(address ionTimelock, uint256[] memory amounts, uint256[] memory releaseTimes) external onlyOwner {
    require(address(ionTimelock) != address(0x0), "ION:E-403");

    uint256 totalAmount;
    for (uint i = 0; i < amounts.length; i++) {
      totalAmount = totalAmount.add(amounts[i]);
    }

    _mint(address(ionTimelock), totalAmount);
    require(IIonTimelock(ionTimelock).addPortions(amounts, releaseTimes), "ION:E-406");
  }


  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _approveLock(address owner, address operator, uint256 amount) internal {
    require(owner != address(0), "ION:E-403");
    require(operator != address(0), "ION:E-403");

    _lockAllowances[owner][operator] = amount;
    emit LockApproval(owner, operator, amount);
  }


  function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._beforeTokenTransfer(from, to, amount);

    // Minting tokens; enforce hard-cap
    if (from == address(0)) {
      require(totalSupply().add(amount) <= cap, "ION:E-408");
    }

    // Locked tokens
    if (from != address(0) && lockedUntil[from] > block.number) {
      uint256 fromBalance = balanceOf(from);
      uint256 transferable = (fromBalance > locked[from]) ? fromBalance.sub(locked[from]) : 0;
      require(transferable >= amount, "ION:E-409");
    }
  }
}
