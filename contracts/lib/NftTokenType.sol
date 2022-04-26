// SPDX-License-Identifier: MIT

// NftTokenType.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/introspection/IERC165.sol";

library NftTokenType {
  bytes4 constant internal INTERFACE_SIGNATURE_ERC721 = 0x80ac58cd;
  bytes4 constant internal INTERFACE_SIGNATURE_ERC1155 = 0xd9b67a26;

  uint256 constant internal TYPE_MASK = uint256(uint128(~0)) << 128;
  uint256 constant internal TYPE_NFT_BIT = 1 << 255;

  function isERC721(address contractAddress) internal view returns (bool) {
    return IERC165(contractAddress).supportsInterface(INTERFACE_SIGNATURE_ERC721);
  }

  function isERC1155(address contractAddress) internal view returns (bool) {
    return IERC165(contractAddress).supportsInterface(INTERFACE_SIGNATURE_ERC1155);
  }

  function getTokenType(address contractAddress, uint256 tokenId) internal view returns (uint256) {
    IERC165 tokenInterface = IERC165(contractAddress);
    bool is1155 = tokenInterface.supportsInterface(INTERFACE_SIGNATURE_ERC1155);

    if (!is1155 || (tokenId & TYPE_NFT_BIT != TYPE_NFT_BIT)) { return 0; }

    return tokenId & TYPE_MASK;
  }
}
