// SPDX-License-Identifier: MIT

// SmartWalletBase.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/ISmartWallet.sol";
import "./BlackholePrevention.sol";

/**
 * @notice ERC20-Token Smart-Wallet Base Contract
 * @dev Non-upgradeable Contract
 */
abstract contract SmartWalletBase is ISmartWallet, BlackholePrevention {
  using EnumerableSet for EnumerableSet.AddressSet;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;  // 10000  (100%)

  address internal _walletManager;

  address internal nftCreator;
  uint256 internal nftCreatorAnnuityPct;
  uint256 internal nftCreatorAmountDischarged;

  EnumerableSet.AddressSet internal _assetTokens;

  //   Asset Token => Principal Balance
  mapping (address => uint256) internal _assetPrincipalBalance;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initializeBase() public {
    require(_walletManager == address(0x0), "SWB:E-002");
    _walletManager = msg.sender;
  }


  /***********************************|
  |              Public               |
  |__________________________________*/

  function getAssetTokenCount() external view virtual override returns (uint256) {
    return _assetTokens.length();
  }

  function getAssetTokenByIndex(uint256 index) external view virtual override returns (address) {
    if (index >= _assetTokens.length()) {
      return address(0);
    }
    return _assetTokens.at(index);
  }

  function setNftCreator(address creator, uint256 annuityPct) external virtual override onlyWalletManager {
    nftCreator = creator;
    nftCreatorAnnuityPct = annuityPct;
  }

  function executeForAccount(
    address contractAddress,
    uint256 ethValue,
    bytes memory encodedParams
  )
    external
    override
    onlyWalletManager
    returns (bytes memory)
  {
    (bool success, bytes memory result) = contractAddress.call{value: ethValue}(encodedParams);
    require(success, string(result));
    return result;
  }

  function refreshPrincipal(address assetToken)
    external
    virtual
    override
    onlyWalletManager
  {
    // no-op
  }


  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external virtual override onlyWalletManager {
    _withdrawEther(receiver, amount);
  }

  function withdrawERC20(address payable receiver, address tokenAddress, uint256 amount) external virtual override onlyWalletManager {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external virtual override onlyWalletManager {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getPrincipal(address assetToken) internal view virtual returns (uint256) {
    return _assetPrincipalBalance[assetToken];
  }

  function _trackAssetToken(address assetToken) internal virtual {
    if (!_assetTokens.contains(assetToken)) {
      _assetTokens.add(assetToken);
    }
  }

  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any account other than the wallet manager
  modifier onlyWalletManager() {
    require(_walletManager == msg.sender, "SWB:E-109");
    _;
  }
}