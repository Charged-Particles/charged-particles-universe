// SPDX-License-Identifier: MIT

// ChargedParticles.sol -- Charged Particles
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

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/Address.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/IERC721.sol";

import "./interfaces/IUniverse.sol";


/**
 * @notice Charged Particles Universe Contract
 * @dev Upgradeable Contract
 */
contract Universe is IUniverse, Initializable, OwnableUpgradeSafe {
  using SafeMath for uint256;
  using Address for address;
  using SafeERC20 for IERC20;

  // The ChargedParticles Contract Address
  address public chargedParticles;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;  // 10000  (100%)

  // ION Token Rewards
  IERC20 public ionToken;
  //   Asset Token => Reward Multiplier
  mapping (address => uint256) internal ionRewardsMultiplier;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize() public initializer {
    __Ownable_init();
  }


  /***********************************|
  |      Only Charged Particles       |
  |__________________________________*/

  function onEnergize(
    address contractAddress,
    uint256 tokenId,
    string calldata liquidityProviderId,
    address assetToken,
    uint256 assetAmount
  )
    external
    override
    onlyChargedParticles
  {
    // no-op
  }

  function onDischarge(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address assetToken,
    uint256 interestAmount
  )
    external
    override
    onlyChargedParticles
  {
    // Reward ION tokens
    if (ionRewardsMultiplier[assetToken] > 0 && interestAmount > 0) {
      address receiver = IERC721(contractAddress).ownerOf(tokenId);
      _rewardIonTokens(receiver, assetToken, interestAmount);
    }
  }

  function onRelease(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address assetToken,
    uint256,
    uint256 interestAmount
  )
    external
    override
    onlyChargedParticles
  {
    // Reward ION tokens
    if (ionRewardsMultiplier[assetToken] > 0 && interestAmount > 0) {
      address receiver = IERC721(contractAddress).ownerOf(tokenId);
      _rewardIonTokens(receiver, assetToken, interestAmount);
    }
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Connects to the Charged Particles Controller
    */
  function setChargedParticles(
    address _chargedParticles
  )
    external
    onlyOwner
    onlyValidContractAddress(_chargedParticles)
  {
    chargedParticles = _chargedParticles;
  }

  function setIonToken(
    address _ionToken
  )
    external
    onlyOwner
    onlyValidContractAddress(_ionToken)
  {
    ionToken = IERC20(_ionToken);
  }

  function setIonRewardsMultiplier(
    address assetToken,
    uint256 multiplier
  )
    external
    onlyOwner
    // onlyValidContractAddress(assetToken)
  {
    ionRewardsMultiplier[assetToken] = multiplier;
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _rewardIonTokens(address receiver, address assetToken, uint256 baseAmount) internal {
    if (address(ionToken) == address(0x0) || receiver == address(0x0)) { return; }

    // Calculate rewards multiplier
    uint256 balance = ionToken.balanceOf(address(this));
    if (balance == 0) { return; }

    uint256 amount = baseAmount.mul(ionRewardsMultiplier[assetToken]).div(PERCENTAGE_SCALE);
    if (amount > balance) {
      amount = balance;
    }

    ionToken.safeTransfer(receiver, amount);

    emit RewardIssued(receiver, address(ionToken), amount);
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any non-account
  modifier onlyValidContractAddress(address account) {
    require(account != address(0x0) && account.isContract(), "Universe: invalid address");
    _;
  }

  /// @dev Throws if called by any account other than the Charged Particles contract
  modifier onlyChargedParticles() {
    require(chargedParticles == msg.sender, "Universe: only charged particles");
    _;
  }
}
