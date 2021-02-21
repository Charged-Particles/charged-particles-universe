// SPDX-License-Identifier: MIT

// Treasury.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/access/Ownable.sol";

import "./lib/BlackholePrevention.sol";


/**
 * @notice The Charged Particles Treasury Contract
 */
contract Treasury is BlackholePrevention, Ownable {

    event TreasuryDeposit(uint256 amount);

    receive() external payable {
        emit TreasuryDeposit(msg.value);
    }

    function withdrawEther(address payable receiver, uint256 amount) external virtual onlyOwner {
        _withdrawEther(receiver, amount);
    }

    function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external virtual onlyOwner {
        _withdrawERC20(receiver, tokenAddress, amount);
    }

    function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual onlyOwner {
        _withdrawERC721(receiver, tokenAddress, tokenId);
    }
    
}