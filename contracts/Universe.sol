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

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedParticles.sol";


/**
 * @notice Charged Particles Universe Contract
 * @dev Upgradeable Contract
 */
contract Universe is IUniverse, Initializable, OwnableUpgradeable {
  using SafeMathUpgradeable for uint256;
  using AddressUpgradeable for address;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  // The ChargedParticles Contract Address
  address public chargedParticles;
  address public proton;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;  // 10000  (100%)
  uint256 constant internal ION_MAX_SUPPLY = 1e8;    // 100,000,000
  uint256 internal ionRewardsEarned;

  // ION Token Rewards
  IERC20Upgradeable public ionToken;

  //   Asset Token => Reward Multiplier
  mapping (address => uint256) internal ionRewardsMultiplier;

  //       Account => Total Amount of Stable-coin Discharged
  mapping (address => uint256) internal stableDischarge;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize() public initializer {
    __Ownable_init();
  }


  /***********************************|
  |         Public Functions          |
  |__________________________________*/

  function claimIonTokens(uint256 amount) public returns (uint256 ionReward) {
    require(stableDischarge[msg.sender] > 0, "Universe: E-411");

    uint256 balance = ionToken.balanceOf(address(this));
    require(balance > 0, "Universe: E-413");

    return _claimIonTokens(msg.sender, amount);
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
    uint256 creatorAmount,
    uint256 receiverAmount
  )
    external
    override
    onlyChargedParticles
  {
    // Reward ION tokens
    if (ionRewardsMultiplier[assetToken] > 0 && receiverAmount > 0) {
      address ionReceiver = IERC721Upgradeable(contractAddress).ownerOf(tokenId);
      _rewardIonTokens(ionReceiver, assetToken, creatorAmount.add(receiverAmount));
    }
  }

  function onDischargeForCreator(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address,
    address assetToken,
    uint256 receiverAmount
  )
    external
    override
    onlyChargedParticles
  {
    // Reward ION tokens
    if (ionRewardsMultiplier[assetToken] > 0 && receiverAmount > 0) {
      address ionReceiver = IERC721Upgradeable(contractAddress).ownerOf(tokenId);
      _rewardIonTokens(ionReceiver, assetToken, receiverAmount);
    }
  }

  function onRelease(
    address contractAddress,
    uint256 tokenId,
    string calldata,
    address assetToken,
    uint256 principalAmount,
    uint256 creatorAmount,
    uint256 receiverAmount
  )
    external
    override
    onlyChargedParticles
  {
    // Reward ION tokens
    uint256 interestAmount = creatorAmount.add(receiverAmount).sub(principalAmount);
    if (ionRewardsMultiplier[assetToken] > 0 && interestAmount > 0) {
      address receiver = IERC721Upgradeable(contractAddress).ownerOf(tokenId);
      _rewardIonTokens(receiver, assetToken, interestAmount);
    }
  }

  function onProtonSale(
    address contractAddress,
    uint256 tokenId,
    address oldOwner,
    address newOwner,
    uint256 salePrice,
    address creator,
    uint256 creatorRoyalties
  )
    external
    override
    onlyProton
  {
    // no-op
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setChargedParticles(
    address _chargedParticles
  )
    external
    onlyOwner
    onlyValidContractAddress(_chargedParticles)
  {
    chargedParticles = _chargedParticles;
    emit ChargedParticlesSet(_chargedParticles);
  }

  function setIonToken(
    address _ionToken
  )
    external
    onlyOwner
    onlyValidContractAddress(_ionToken)
  {
    ionToken = IERC20Upgradeable(_ionToken);
    emit IonTokenSet(_ionToken);
  }

  function setProtonToken(
    address _protonToken
  )
    external
    onlyOwner
    onlyValidContractAddress(_protonToken)
  {
    proton = _protonToken;
    emit ProtonTokenSet(_protonToken);
  }

  function setIonRewardsMultiplier(
    address assetToken,
    uint256 multiplier
  )
    external
    onlyOwner
  {
    ionRewardsMultiplier[assetToken] = multiplier;
    emit IonRewardsMultiplierSet(assetToken, multiplier);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _rewardIonTokens(address receiver, address assetToken, uint256 baseAmount) internal {
    if (address(ionToken) == address(0x0) || receiver == address(0x0)) { return; }
    if (ionRewardsEarned == ION_MAX_SUPPLY) { return; }

    // Calculate rewards multiplier
    uint256 amount = baseAmount.mul(ionRewardsMultiplier[assetToken]).div(PERCENTAGE_SCALE);
    if (ionRewardsEarned.add(amount) > ION_MAX_SUPPLY) {
      amount = ION_MAX_SUPPLY.sub(ionRewardsEarned);
    }
    ionRewardsEarned = ionRewardsEarned.add(amount);
    stableDischarge[receiver] = stableDischarge[receiver].add(amount);

    emit RewardEarned(receiver, address(ionToken), amount);
  }

  function _claimIonTokens(address account, uint256 amount) internal returns (uint256) {
    uint256 amountEarned = stableDischarge[account];
    if (amount > amountEarned) {
      amount = amountEarned;
    }

    uint256 balance = ionToken.balanceOf(address(this));
    if (amount > balance) {
      amount = balance;
    }

    stableDischarge[account] = stableDischarge[account].sub(amount);

    ionToken.safeTransfer(account, amount);

    emit RewardClaimed(account, address(ionToken), amount);
    return amount;
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any non-account
  modifier onlyValidContractAddress(address account) {
    require(account != address(0x0) && account.isContract(), "Universe: E-417");
    _;
  }

  /// @dev Throws if called by any account other than the Charged Particles contract
  modifier onlyChargedParticles() {
    require(chargedParticles == msg.sender, "Universe: E-108");
    _;
  }

  /// @dev Throws if called by any account other than the Proton NFT contract
  modifier onlyProton() {
    require(proton == msg.sender, "Universe: E-110");
    _;
  }
}
