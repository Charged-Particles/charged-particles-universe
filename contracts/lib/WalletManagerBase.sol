// SPDX-License-Identifier: MIT

// WalletManagerBase.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IWalletManager.sol";
import "../interfaces/ISmartWallet.sol";
import "../lib/TokenInfo.sol";
import "./BlackholePrevention.sol";


/**
 * @notice Wallet-Manager Base Contract
 * @dev Non-upgradeable Contract
 */
abstract contract WalletManagerBase is Ownable, BlackholePrevention, IWalletManager {
  using TokenInfo for address;

  // The Controller Contract Address
  address internal _controller;

  // The Executor Contract Address
  address internal _executor;

  // Template Contract for creating Token Smart-Wallet Bridges
  address internal _walletTemplate;

  //       TokenID => Token Smart-Wallet Address
  mapping (uint256 => address) internal _wallets;

  // State of Wallet Manager
  bool internal _paused;


  /***********************************|
  |              Public               |
  |__________________________________*/

  function isPaused() external view override returns (bool) {
    return _paused;
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Sets the Paused-state of the Wallet Manager
    */
  function setPausedState(bool paused) external onlyOwner {
    _paused = paused;
    emit PausedStateSet(paused);
  }

  /**
    * @dev Connects to the Charged Particles Controller
    */
  function setController(address controller) external onlyOwner {
    _controller = controller;
    emit ControllerSet(controller);
  }

  /**
    * @dev Connects to the ExecForAccount Controller
    */
  function setExecutor(address executor) external onlyOwner {
    _executor = executor;
    emit ExecutorSet(executor);
  }

  function withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    _withdrawEther(receiver, amount);
    return ISmartWallet(wallet).withdrawEther(receiver, amount);
  }

  function withdrawERC20(address contractAddress, uint256 tokenId, address payable receiver, address tokenAddress, uint256 amount)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    _withdrawERC20(receiver, tokenAddress, amount);
    return ISmartWallet(wallet).withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address contractAddress, uint256 tokenId, address payable receiver, address nftTokenAddress, uint256 nftTokenId)
    external
    virtual
    override
    onlyOwner
  {
    uint256 uuid = contractAddress.getTokenUUID(tokenId);
    address wallet = _wallets[uuid];
    _withdrawERC721(receiver, nftTokenAddress, nftTokenId);
    return ISmartWallet(wallet).withdrawERC721(receiver, nftTokenAddress, nftTokenId);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getTokenUUID(address contractAddress, uint256 tokenId) internal pure returns (uint256) {
    return uint256(keccak256(abi.encodePacked(contractAddress, tokenId)));
  }

  /**
    * @dev Creates Contracts from a Template via Cloning
    * see: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1167.md
    */
  function _createClone(address target) internal returns (address result) {
    bytes20 targetBytes = bytes20(target);
    assembly {
      let clone := mload(0x40)
      mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      mstore(add(clone, 0x14), targetBytes)
      mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      result := create(0, clone, 0x37)
    }
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any account other than the Controller contract
  modifier onlyController() {
    require(_controller == msg.sender, "WMB:E-108");
    _;
  }

  /// @dev Throws if called by any account other than the Executor contract
  modifier onlyExecutor() {
    require(_executor == msg.sender, "WMB:E-108");
    _;
  }

  /// @dev Throws if called by any account other than the Controller or Executor contract
  modifier onlyControllerOrExecutor() {
    require(_executor == msg.sender || _controller == msg.sender, "WMB:E-108");
    _;
  }

  // Throws if called by any account other than the Charged Particles Escrow Controller.
  modifier whenNotPaused() {
    require(_paused != true, "WMB:E-101");
    _;
  }

}
