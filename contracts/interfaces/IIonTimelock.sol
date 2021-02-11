// SPDX-License-Identifier: MIT

// IIonTimelock.sol -- Part of the Charged Particles Protocol
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

pragma solidity >=0.6.0;

/**
 * @title Charged Particles Ion-Timelock Interface
 * @dev ...
 */
interface IIonTimelock {

  struct Portion {
    uint256 amount;
    uint256 releaseTime;
    bool claimed;
  }

  function addPortions(uint256[] memory amounts, uint256[] memory releaseTimes) external returns (bool);
  function nextReleaseTime() external view returns (uint256 releaseTime);
  function nextReleaseAmount() external view returns (uint256 releaseAmount);
  function release(uint256 numPortions, uint256 indexOffset) external returns (uint256 amount);
  function releasePortion(uint256 portionIndex) external returns (uint256 amount);

  event PortionsAdded(uint256[] amounts, uint256[] releaseTimes);
  event PortionReleased(uint256 amounts, uint256 releaseTime);
}
