// SPDX-License-Identifier: MIT

// Universe.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./interfaces/IUniverse.sol";
import "./interfaces/IChargedParticles.sol";
import "./interfaces/ILepton.sol";
import "./lib/TokenInfo.sol";
import "./lib/BlackholePrevention.sol";
import "./interfaces/IRewardProgram.sol";


/**
 * @notice Charged Particles Universe Contract with Rewards Program
 * @dev Upgradeable Contract
 */
contract UniverseRP is IUniverse, Initializable, OwnableUpgradeable, BlackholePrevention {
  using SafeMathUpgradeable for uint256;
  using TokenInfo for address;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  uint256 constant internal PERCENTAGE_SCALE = 1e4;  // 10000  (100%)

  // The ChargedParticles Contract Address
  address public chargedParticles;

  // Asset Token => Reward Program
  mapping (address => address) internal assetRewardPrograms;


  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize() public initializer {
    __Ownable_init();
  }


  function getRewardProgram(address asset) public view returns (address) {
    return _getRewardProgram(asset);
  }

  function registerExistingDeposits(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  ) external {
    address rewardProgram = getRewardProgram(assetToken);
    if (rewardProgram != address(0)) {
      IRewardProgram(rewardProgram).registerExistingDeposits(contractAddress, tokenId, walletManagerId);
    }
  }


  /***********************************|
  |      Only Charged Particles       |
  |__________________________________*/

  function onEnergize(
    address /* sender */,
    address /* referrer */,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    address rewardProgram = getRewardProgram(assetToken);
    if (rewardProgram != address(0)) {
      IRewardProgram(rewardProgram).registerAssetDeposit(
        contractAddress,
        tokenId,
        walletManagerId,
        assetAmount
      );
    }
  }

  function onDischarge(
    address contractAddress,
    uint256 tokenId,
    string calldata /* walletManagerId */,
    address assetToken,
    uint256 creatorEnergy,
    uint256 receiverEnergy
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    address rewardProgram = getRewardProgram(assetToken);
    if (rewardProgram != address(0)) {
      uint256 totalInterest = receiverEnergy.add(creatorEnergy);
      IRewardProgram(rewardProgram).registerAssetRelease(contractAddress, tokenId, totalInterest);
    }
  }

  function onDischargeForCreator(
    address contractAddress,
    uint256 tokenId,
    string calldata /* walletManagerId */,
    address /* creator */,
    address assetToken,
    uint256 receiverEnergy
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    address rewardProgram = getRewardProgram(assetToken);
    if (rewardProgram != address(0)) {
      IRewardProgram(rewardProgram).registerAssetRelease(contractAddress, tokenId, receiverEnergy);
    }
  }

  function onRelease(
    address contractAddress,
    uint256 tokenId,
    string calldata /* walletManagerId */,
    address assetToken,
    uint256 principalAmount,
    uint256 creatorEnergy,
    uint256 receiverEnergy
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    address rewardProgram = getRewardProgram(assetToken);
    if (rewardProgram != address(0)) {
      // "receiverEnergy" includes the "principalAmount"
      uint256 totalInterest = receiverEnergy.sub(principalAmount).add(creatorEnergy);
      IRewardProgram(rewardProgram).registerAssetRelease(contractAddress, tokenId, totalInterest);
    }
  }

  function onCovalentBond(
    address contractAddress,
    uint256 tokenId,
    string calldata /* managerId */,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    address rewardProgram = getRewardProgram(nftTokenAddress);
    if (rewardProgram != address(0)) {
      IRewardProgram(rewardProgram).registerNftDeposit(contractAddress, tokenId, nftTokenAddress, nftTokenId, nftTokenAmount);
    }
  }

  function onCovalentBreak(
    address contractAddress,
    uint256 tokenId,
    string calldata /* managerId */,
    address nftTokenAddress,
    uint256 nftTokenId,
    uint256 nftTokenAmount
  )
    external
    virtual
    override
    onlyChargedParticles
  {
    address rewardProgram = getRewardProgram(nftTokenAddress);
    if (rewardProgram != address(0)) {
      IRewardProgram(rewardProgram).registerNftRelease(contractAddress, tokenId, nftTokenAddress, nftTokenId, nftTokenAmount);
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
    virtual
    override
  {
    // no-op
  }

  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function setChargedParticles(
    address controller
  )
    external
    virtual
    onlyOwner
    onlyValidContractAddress(controller)
  {
    chargedParticles = controller;
    emit ChargedParticlesSet(controller);
  }

  function setRewardProgram(
    address rewardProgam,
    address assetToken,
    address nftMultiplier
  )
    external
    onlyOwner
    onlyValidContractAddress(rewardProgam)
  {
    require(assetToken != address(0x0), "UNI:E-403");
    assetRewardPrograms[assetToken] = rewardProgam;
    assetRewardPrograms[nftMultiplier] = rewardProgam;
    emit RewardProgramSet(assetToken, nftMultiplier, rewardProgam);
  }

  function removeRewardProgram(
    address assetToken,
    address nftMultiplier
  )
    external
    onlyOwner
  {
    delete assetRewardPrograms[assetToken];
    delete assetRewardPrograms[nftMultiplier];
    emit RewardProgramRemoved(assetToken, nftMultiplier);
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

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external virtual onlyOwner {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getRewardProgram(address assetToken) internal view returns (address) {
    return assetRewardPrograms[assetToken];
  }


  /***********************************|
  |             Modifiers             |
  |__________________________________*/

  /// @dev Throws if called by any non-account
  modifier onlyValidContractAddress(address account) {
    require(account != address(0x0) && account.isContract(), "UNI:E-417");
    _;
  }

  /// @dev Throws if called by any account other than the Charged Particles contract
  modifier onlyChargedParticles() {
    require(chargedParticles == msg.sender, "UNI:E-108");
    _;
  }
}
