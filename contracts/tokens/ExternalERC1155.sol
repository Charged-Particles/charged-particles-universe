// SPDX-License-Identifier: MIT

// ExternalNFT.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ExternalERC1155 is ERC1155 {
    using Counters for Counters.Counter;

    Counters.Counter internal _tokenCount;
    mapping(uint256 => address) internal _tokenCreator;
    mapping(uint256 => address) internal _tokenOwner;

    constructor() public ERC1155("https://charged.fi/erc1155/") {}

    function creatorOf(uint256 tokenId) external view returns (address) {
        return _tokenCreator[tokenId];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _tokenOwner[tokenId];
    }

    function mintNft(address receiver) external returns (uint256 newTokenId) {
        return _mintNft(msg.sender, receiver);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        super.safeTransferFrom(from, to, id, amount, data);
        _tokenOwner[id] = to;
    }

    function _mintNft(address creator, address receiver)
        internal
        returns (uint256 newTokenId)
    {
        _tokenCount.increment();
        newTokenId = _tokenCount.current();

        _mint(receiver, newTokenId, 1, "");
        _tokenCreator[newTokenId] = creator;
        _tokenOwner[newTokenId] = creator;
    }
}
