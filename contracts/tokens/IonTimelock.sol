// SPDX-License-Identifier: MIT

// IonTimelock.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/IIonTimelock.sol";

contract IonTimelock is IIonTimelock {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IERC20 public token;
  address public receiver;
  Portion[] public portions;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor (address _receiver, address _token) public {
    require(_receiver != address(0x0), "IonTimelock: E-403");
    require(_token != address(0x0), "IonTimelock: E-403");

    token = IERC20(_token);
    receiver = _receiver;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function addPortions(uint256[] memory amounts, uint256[] memory releaseTimes) public override returns (bool) {
    require(amounts.length == releaseTimes.length, "IonTimelock: E-202");

    uint256 totalAmount;
    for (uint i = 0; i < amounts.length; i++) {
      uint256 releaseTime = releaseTimes[i];
      uint256 amount = amounts[i];

      // solhint-disable-next-line not-rely-on-time
      require(releaseTime > block.timestamp, "IonTimelock: E-301");

      portions.push(Portion({
        amount: amount,
        releaseTime: releaseTime,
        claimed: false
      }));

      totalAmount = totalAmount.add(amount);
    }

    uint256 amountAvailable = token.balanceOf(address(this));
    require(amountAvailable >= totalAmount, "IonTimelock: E-411");

    emit PortionsAdded(amounts, releaseTimes);
    return true;
  }

  /**
    * @return releaseTime The time when the next portion of tokens will be released.
    */
  function nextReleaseTime() public view override returns (uint256 releaseTime) {
    uint256 portionCount = portions.length;
    for (uint i = 0; i < portionCount; i++) {
      // solhint-disable-next-line not-rely-on-time
      if (portions[i].releaseTime > block.timestamp) {
        releaseTime = portions[i].releaseTime;
        break;
      }
    }
  }

  /**
    * @return releaseAmount The next amount that will be released.
    */
  function nextReleaseAmount() public view override returns (uint256 releaseAmount) {
    uint256 portionCount = portions.length;
    for (uint i = 0; i < portionCount; i++) {
      // solhint-disable-next-line not-rely-on-time
      if (portions[i].releaseTime > block.timestamp) {
        releaseAmount = portions[i].amount;
        break;
      }
    }
  }

  /**
    * @notice Transfers tokens held by timelock to the receiver.
    */
  function release() public override returns (uint256 amount) {
    uint256 portionCount = portions.length;
    for (uint i = 0; i < portionCount; i++) {
      // solhint-disable-next-line not-rely-on-time
      if (!portions[i].claimed && portions[i].releaseTime <= block.timestamp) {
        amount = amount.add(portions[i].amount);
        portions[i].claimed = true;

        emit PortionReleased(portions[i].amount, portions[i].releaseTime);
      }
    }

    uint256 amountAvailable = token.balanceOf(address(this));
    require(amount <= amountAvailable, "IonTimelock: E-411");
    token.safeTransfer(receiver, amount);
  }
}
