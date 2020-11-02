// SPDX-License-Identifier: MIT

// WalletManagerBase.sol -- Charged Particles
// Copyright (c) 2019, 2020 Rob Secord <robsecord.eth>
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

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IWalletManager.sol";
import "../interfaces/IChargedParticles.sol";


/**
 * @notice Wallet-Manager-Base Contract
 * @dev Non-upgradeable Contract
 */
abstract contract WalletManagerBase is Initializable, OwnableUpgradeSafe, IWalletManager {
  using SafeMath for uint256;

  // The Controller Contract Address
  address internal _controller;

  // Template Contract for creating Token Smart-Wallet Bridges
  address internal _walletTemplate;

  //       TokenID => Token Smart-Wallet Address
  mapping (uint256 => address) internal _wallets;

  // State of Wallet Manager
  bool internal _paused;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initializeBase() public initializer {
    __Ownable_init();
  }


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
  }

  /**
    * @dev Connects to the Charged Particles Controller
    */
  function setController(address controller) external onlyOwner {
    _controller = controller;
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  /**
    * @dev Collects the Required Asset Token from the users wallet
    */
  function _collectAssetToken(address _from, address _assetToken, uint256 _assetAmount) internal {
    IERC20 assetToken = IERC20(_assetToken);
    uint256 userAssetBalance = assetToken.balanceOf(_from);
    require(_assetAmount <= userAssetBalance, "AaveWalletManager: INSUFF_FUNDS");
    // Be sure to Approve this Contract to transfer your Asset Token
    require(assetToken.transferFrom(_from, address(this), _assetAmount), "AaveWalletManager: TRANSFER_FAILED");
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
    require(_controller == msg.sender, "WalletManagerBase: ONLY_CONTROLLER");
    _;
  }

  // Throws if called by any account other than the Charged Particles Escrow Controller.
  modifier whenNotPaused() {
    require(_paused != true, "WalletManagerBase: PAUSED");
    _;
  }

}
