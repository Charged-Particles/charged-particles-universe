// SPDX-License-Identifier: MIT

// TokenInfoProxy.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ITokenInfoProxy.sol";
import "../interfaces/IERC721Chargeable.sol";


contract TokenInfoProxy is ITokenInfoProxy, Ownable {
  using Address for address;

  event ContractFunctionSignatureSet(address indexed contractAddress, string fnName, bytes4 fnSig);

  struct FnSignatures {
    bytes4 ownerOf;
    bytes4 creatorOf;
    bytes4 collectOverride;
    bytes4 depositOverride;
  }
  mapping (address => FnSignatures) internal _remappedFnSigs;

  function setContractFnOwnerOf(address contractAddress, bytes4 fnSig) external override onlyOwner {
    _remappedFnSigs[contractAddress].ownerOf = fnSig;
    emit ContractFunctionSignatureSet(contractAddress, "ownerOf", fnSig);
  }

  function setContractFnCreatorOf(address contractAddress, bytes4 fnSig) external onlyOwner {
    _remappedFnSigs[contractAddress].creatorOf = fnSig;
    emit ContractFunctionSignatureSet(contractAddress, "creatorOf", fnSig);
  }

  function setContractFnCollectOverride(address contractAddress, bytes4 fnSig) external onlyOwner {
    require(_remappedFnSigs[contractAddress].collectOverride == bytes4(0));
    _remappedFnSigs[contractAddress].collectOverride = fnSig;
    emit ContractFunctionSignatureSet(contractAddress, "collectOverride", fnSig);
  }

  function setContractFnDepositOverride(address contractAddress, bytes4 fnSig) external onlyOwner {
    require(_remappedFnSigs[contractAddress].depositOverride == bytes4(0));
    _remappedFnSigs[contractAddress].depositOverride = fnSig;
    emit ContractFunctionSignatureSet(contractAddress, "depositOverride", fnSig);
  }

  function getTokenUUID(address contractAddress, uint256 tokenId) external pure override returns (uint256) {
    return uint256(keccak256(abi.encodePacked(contractAddress, tokenId)));
  }

  function isErc721OwnerOrOperator(address contractAddress, uint256 tokenId, address sender) external returns (bool) {
    IERC721Chargeable tokenInterface = IERC721Chargeable(contractAddress);
    address tokenOwner = _getTokenOwner(contractAddress, tokenId);
    return (sender == tokenOwner || tokenInterface.isApprovedForAll(tokenOwner, sender));
  }

  function getTokenOwner(address contractAddress, uint256 tokenId) external returns (address) {
    return _getTokenOwner(contractAddress, tokenId);
  }

  function _getTokenOwner(address contractAddress, uint256 tokenId) internal returns (address) {
    bytes4 fnSig = IERC721Chargeable.ownerOf.selector;
    if (_remappedFnSigs[contractAddress].ownerOf != bytes4(0)) {
      fnSig = _remappedFnSigs[contractAddress].ownerOf;
    }
    bytes memory returnData = contractAddress.functionCall(abi.encodeWithSelector(fnSig, tokenId), "TokenInfoProxy: low-level call failed on getTokenOwner");
    return abi.decode(returnData, (address));
  }

  function getTokenCreator(address contractAddress, uint256 tokenId) external override returns (address) {
    bytes4 fnSig = IERC721Chargeable.creatorOf.selector;
    if (_remappedFnSigs[contractAddress].creatorOf != bytes4(0)) {
      fnSig = _remappedFnSigs[contractAddress].creatorOf;
    }
    bytes memory returnData = contractAddress.functionCall(abi.encodeWithSelector(fnSig, tokenId), "TokenInfoProxy: low-level call failed on getTokenCreator");
    return abi.decode(returnData, (address));
  }

  function getCollectOverrideFnSig(address contractAddress) external returns (bytes4) {
    return _remappedFnSigs[contractAddress].collectOverride;
  }

  function getDepositOverrideFnSig(address contractAddress) external returns (bytes4) {
    return _remappedFnSigs[contractAddress].depositOverride;
  }
}
