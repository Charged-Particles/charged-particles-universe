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
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/BlackholePrevention.sol";


contract Ion is ERC20Permit, Ownable, BlackholePrevention {
  using SafeMath for uint256;

  /// @notice An event thats emitted when the minter address is changed
  event MinterChanged(address minter, address newMinter);

  /// @notice Total number of tokens in circulation
  uint256 constant public INITIAL_SUPPLY = 1e8 ether;

  /// @notice Minimum time between mints
  uint32 public constant INFLATION_EPOCH = 1 days * 365;

  /// @notice Cap on the percentage of totalSupply that can be minted at each mint
  uint8 public constant INFLATION_CAP = 2;

  /// @notice Address which may mint new tokens
  address public minter;

  /// @notice The timestamp after which minting may occur
  uint256 public mintingAllowedAfter;


  constructor() public ERC20Permit("Charged Particles - ION", "ION") {}


  /**
    * @notice Change the minter address
    * @param newMinter The address of the new minter
    */
  function setMinter(address newMinter) external onlyOwner {
    emit MinterChanged(minter, newMinter);
    minter = newMinter;
  }

  /**
    * @notice Mint new tokens
    * @param receiver The address of the destination account
    * @param amount The number of tokens to be minted
    */
  function mint(address receiver, uint256 amount) external onlyMinter {
    require(block.timestamp >= mintingAllowedAfter, "Ion:E-114");
    require(receiver != address(0), "Ion:E-403");

    uint256 amountToMint = amount;
    uint256 _totalSupply = totalSupply();

    // From Inflationary Supply
    if (_totalSupply >= INITIAL_SUPPLY) {
      mintingAllowedAfter = mintingAllowedAfter.add(INFLATION_EPOCH);
      amountToMint = _totalSupply.mul(INFLATION_CAP).div(100);
    }

    // From Initial Supply
    else {
      if (_totalSupply.add(amountToMint) > INITIAL_SUPPLY) {
        amountToMint = INITIAL_SUPPLY.sub(_totalSupply);
      }
      if (_totalSupply.add(amountToMint) == INITIAL_SUPPLY) {
        mintingAllowedAfter = block.timestamp.add(INFLATION_EPOCH);
      }
    }

    // transfer the amount to the recipient
    _mint(receiver, amountToMint);
  }

  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }

  modifier onlyMinter() {
    require(msg.sender == minter, "Ion:E-113");
    _;
  }
}
