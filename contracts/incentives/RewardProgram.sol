// SPDX-License-Identifier: MIT

// RewardProgram.sol -- Part of the Charged Particles Protocol
// Copyright (c) 2023 Firma Lux, Inc. <https://charged.fi>
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

import "../interfaces/IRewardProgram.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IChargedManagers.sol";
import "../interfaces/ILepton.sol";
import "../interfaces/IWalletManager.sol";
import "../interfaces/IRewardNft.sol";
import "../lib/TokenInfo.sol";
import "../lib/ReentrancyGuard.sol";
import "../lib/BlackholePrevention.sol";
import "../interfaces/IERC20Detailed.sol";

contract RewardProgram is
  IRewardProgram,
  Ownable,
  BlackholePrevention,
  ReentrancyGuard
{
  using SafeMath for uint256;
  using SafeERC20 for IERC20Detailed;
  using TokenInfo for address;
  using EnumerableSet for EnumerableSet.UintSet;

  uint256 constant private PERCENTAGE_SCALE = 1e4;   // 10000 (100%)
  uint256 constant private LEPTON_MULTIPLIER_SCALE = 1e2;

  address private _universe;
  IChargedManagers private _chargedManagers;
  ProgramRewardData private _programData;

  mapping(uint256 => EnumerableSet.UintSet) private _multiplierNftsSet;
  mapping(uint256 => AssetStake) private _assetStake;
  mapping(uint256 => NftStake) private _nftStake;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor() public {}


  /***********************************|
  |         Public Functions          |
  |__________________________________*/

  function getProgramData() external view override returns (ProgramRewardData memory programData) {
    return _programData;
  }

  function getFundBalance() external view override returns (uint256) {
    return _getFundBalance();
  }

  function getClaimableRewards(address contractAddress, uint256 tokenId) external view override returns (uint256) {
    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    return _assetStake[parentNftUuid].claimableRewards;
  }

  function getAssetStake(uint256 uuid) view external returns (AssetStake memory) {
    return _assetStake[uuid];
  }

  function getNftStake(uint256 uuid) view external returns (NftStake memory) {
    return _nftStake[uuid];
  }

  /***********************************|
  |          Only Universe            |
  |__________________________________*/

  function registerExistingDeposits(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address stakingToken
  )
    external
    override
    onlyUniverse
    nonReentrant
  {
    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    require(_assetStake[parentNftUuid].start == 0 && _assetStake[parentNftUuid].claimableRewards == 0, "RP:E-002");

    // Initiate Asset Stake
    IWalletManager walletMgr = _chargedManagers.getWalletManager(walletManagerId);
    uint256 principal = walletMgr.getPrincipal(contractAddress, tokenId, stakingToken);
    if (principal > 0) {
      _assetStake[parentNftUuid] = AssetStake(block.number, 0, walletManagerId, stakingToken);
      emit AssetRegistered(contractAddress, tokenId, walletManagerId, principal);
    }
  }

  function registerAssetDeposit(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address stakingToken,
    uint256 principalAmount
  )
    external
    override
    onlyUniverse
  {
    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    AssetStake storage assetStake = _assetStake[parentNftUuid];

    if (assetStake.start == 0) {
      assetStake.start = block.number;
      assetStake.walletManagerId = walletManagerId;
      assetStake.stakingToken = stakingToken;
      emit AssetDeposit(contractAddress, tokenId, walletManagerId, principalAmount);
    }
  }

  function registerAssetRelease(
    address contractAddress,
    uint256 tokenId,
    uint256 interestAmount
  )
    external
    override
    onlyUniverse
    nonReentrant
    returns (uint256 rewards)
  {
    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    AssetStake storage assetStake = _assetStake[parentNftUuid];

    // Update Claimable Rewards
    uint256 newRewards = calculateRewardsEarned(parentNftUuid, assetStake.stakingToken, interestAmount);
    assetStake.claimableRewards = assetStake.claimableRewards.add(newRewards);

    // Reset Stake if Principal Balance falls to Zero
    IWalletManager walletMgr = _chargedManagers.getWalletManager(assetStake.walletManagerId);
    uint256 principal = walletMgr.getPrincipal(contractAddress, tokenId, assetStake.stakingToken);
    if (principal == 0) {
      assetStake.start = 0;
    }

    // Issue Rewards to NFT Owner
    rewards = _claimRewards(contractAddress, tokenId);

    emit AssetRelease(contractAddress, tokenId, interestAmount);
  }

  function registerNftDeposit(address contractAddress, uint256 tokenId, address depositNftAddress, uint256 depositNftTokenId, uint256 /* nftTokenAmount */)
    external
    override
    onlyUniverse
    nonReentrant
  {
    // We only care about the Multiplier NFT
    if (_programData.multiplierNft != depositNftAddress) { return; }

    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    uint256 multiplier = _getNftMultiplier(depositNftAddress, depositNftTokenId);

    if (multiplier > 0 && !_multiplierNftsSet[parentNftUuid].contains(multiplier)) {
      // Add to Multipliers Set
      _multiplierNftsSet[parentNftUuid].add(multiplier);

      // Update NFT Stake
      uint256 combinedMultiplier = _calculateTotalMultiplier(parentNftUuid);
      _nftStake[parentNftUuid] = NftStake(combinedMultiplier, block.number, 0);
    }

    emit NftDeposit(contractAddress, tokenId, depositNftAddress, depositNftTokenId);
  }

  function registerNftRelease(
    address contractAddress,
    uint256 tokenId,
    address releaseNftAddress,
    uint256 releaseNftTokenId,
    uint256 /* nftTokenAmount */
  )
    external
    override
    onlyUniverse
  {
    // We only care about the Multiplier NFT
    if (_programData.multiplierNft != releaseNftAddress) { return; }

    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    NftStake storage nftStake = _nftStake[parentNftUuid];

    // Remove from Multipliers Set
    uint256 multiplier = _getNftMultiplier(releaseNftAddress, releaseNftTokenId);
    _multiplierNftsSet[parentNftUuid].remove(multiplier);

    // Determine New Multiplier or Mark as Released
    if (_multiplierNftsSet[parentNftUuid].length() > 0) {
      nftStake.multiplier = _calculateTotalMultiplier(parentNftUuid);
    } else {
      nftStake.releaseBlockNumber = block.number;
    }

    emit NftRelease(contractAddress, tokenId, releaseNftAddress, releaseNftTokenId);
  }

  /***********************************|
  |         Reward Calculation        |
  |__________________________________*/

  function calculateBaseReward(uint256 amount) public view returns(uint256 baseReward) {
    baseReward = _calculateBaseReward(amount);
  }

  function calculateRewardsEarned(uint256 parentNftUuid, address stakingAsset,uint256 interestAmount) public view returns (uint256 totalReward) {
    uint256 baseReward = _calculateBaseReward(interestAmount);
    uint256 leptonMultipliedReward = calculateMultipliedReward(parentNftUuid, baseReward);
    totalReward = _convertDecimals(leptonMultipliedReward, stakingAsset);
  }

  function calculateMultipliedReward(uint256 parentNftUuid, uint256 baseReward) public view returns(uint256) {
    AssetStake storage assetStake = _assetStake[parentNftUuid];
    NftStake memory nftStake = _nftStake[parentNftUuid];
    uint256 multiplierBP = nftStake.multiplier;

    if (assetStake.start == 0) { return baseReward; }

    uint256 assetDepositLength = block.number.sub(assetStake.start);
    uint256 nftDepositLength = _getNftDepositLength(nftStake);

    if (multiplierBP == 0 || nftDepositLength == 0 || assetDepositLength == 0) {
      return baseReward;
    }

    if (nftDepositLength > assetDepositLength) {
      nftDepositLength = assetDepositLength;
    }

    // Percentage of the total program that the _programData.multiplierNft was deposited for
    uint256 nftRewardRatioBP = nftDepositLength.mul(PERCENTAGE_SCALE).div(assetDepositLength);

    // Amount of reward that the _programData.multiplierNft is responsible for
    uint256 amountGeneratedDuringNftDeposit = baseReward.mul(nftRewardRatioBP).div(PERCENTAGE_SCALE);

    // Amount of Multiplied Reward from NFT
    uint256 multipliedReward = amountGeneratedDuringNftDeposit.mul(multiplierBP.mul(LEPTON_MULTIPLIER_SCALE)).div(PERCENTAGE_SCALE);

    // Amount of Base Reward without Multiplied NFT Rewards
    uint256 amountGeneratedWithoutNftDeposit = baseReward.sub(amountGeneratedDuringNftDeposit);

    // Amount of Base Rewards + Multiplied NFT Rewards
    return amountGeneratedWithoutNftDeposit.add(multipliedReward);
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  function fundProgram(uint256 amount) external onlyOwner {
    require(_programData.rewardToken != address(0), "RP:E-405");
    IERC20Detailed token = IERC20Detailed(_programData.rewardToken);
    token.transferFrom(msg.sender, address(this), amount);
    emit RewardProgramFunded(amount);
  }

  function setRewardToken(address newRewardToken) external onlyOwner {
    _programData.rewardToken = newRewardToken;
  }

  function setBaseMultiplier(uint256 newMultiplier) external onlyOwner {
    _programData.baseMultiplier = newMultiplier; // Basis Points
  }

  function setChargedManagers(address manager) external onlyOwner {
    _chargedManagers = IChargedManagers(manager);
  }

  function setUniverse(address universe) external onlyOwner {
    _universe = universe;
  }

  function setRewardNft(address nftTokenAddress) external onlyOwner {
    _programData.multiplierNft = nftTokenAddress;
  }


  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount) external onlyOwner {
    _withdrawEther(receiver, amount);
  }

  function withdrawErc20(address payable receiver, address tokenAddress, uint256 amount) external onlyOwner {
    _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId) external onlyOwner {
    _withdrawERC721(receiver, tokenAddress, tokenId);
  }

  function withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount) external onlyOwner {
    _withdrawERC1155(receiver, tokenAddress, tokenId, amount);
  }


  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _claimRewards(
    address contractAddress,
    uint256 tokenId
  )
    internal
    returns (uint256 totalReward)
  {
    uint256 parentNftUuid = contractAddress.getTokenUUID(tokenId);
    AssetStake storage assetStake = _assetStake[parentNftUuid];

    // Rewards Receiver
    address receiver = IERC721(contractAddress).ownerOf(tokenId);

    // Ensure Reward Pool has Sufficient Balance
    totalReward = assetStake.claimableRewards;
    uint256 fundBalance = _getFundBalance();
    uint256 unavailReward = totalReward > fundBalance ? totalReward.sub(fundBalance) : 0;

    // Determine amount of Rewards to Transfer
    if (unavailReward > 0) {
      totalReward = totalReward.sub(unavailReward);
      emit RewardProgramOutOfFunds();
    }

    if (totalReward > 0) {
      // Update Asset Stake
      assetStake.claimableRewards = 0;
      // Transfer Available Rewards to Receiver
      IERC20Detailed(_programData.rewardToken).transfer(receiver, totalReward);
    }

    emit RewardsClaimed(contractAddress, tokenId, receiver, totalReward, unavailReward);
  }

  function _calculateBaseReward(uint256 amount) internal view returns (uint256 baseReward) {
    baseReward = amount.mul(_programData.baseMultiplier).div(PERCENTAGE_SCALE);
  }

  function _calculateTotalMultiplier(uint256 parentNftUuid) internal view returns (uint256) {
    uint256 len = _multiplierNftsSet[parentNftUuid].length();
    uint256 indexOfSmallest = 0;
    uint256 multiplier = 0;
    uint256 i = 0;

    // If holding all 6, Max Multiplier of 10X
    if (len == 6) {
      return LEPTON_MULTIPLIER_SCALE.mul(10);
    }

    // If holding more than 4, Ignore the Smallest
    if (len > 4) {
      for (; i < len; i++) {
        if (_multiplierNftsSet[parentNftUuid].at(i) < _multiplierNftsSet[parentNftUuid].at(indexOfSmallest)) {
          indexOfSmallest = i;
        }
      }
      i = 0;
    }

    // If holding less than or equal to 4, Multiplier = Half of the Sum of all
    for (; i < len; i++) {
      if (len > 4 && i == indexOfSmallest) { continue; }
      multiplier = multiplier.add(_multiplierNftsSet[parentNftUuid].at(i));
    }

    return len > 1 ? multiplier.div(2) : multiplier; // Half of the Sum
  }

  function _getNftDepositLength(NftStake memory nftStake) internal view returns (uint256 nftDepositLength) {
    if (nftStake.releaseBlockNumber > 0 ) {
      nftDepositLength = nftStake.releaseBlockNumber.sub(nftStake.depositBlockNumber);
    } else {
      nftDepositLength = block.number.sub(nftStake.depositBlockNumber);
    }
  }

  function _getNftMultiplier(address contractAddress, uint256 tokenId) internal returns (uint256) {
    bytes4 fnSig = IRewardNft.getMultiplier.selector;
    (bool success, bytes memory returnData) = contractAddress.call(abi.encodeWithSelector(fnSig, tokenId));

    if (success) {
      return abi.decode(returnData, (uint256));
    } else {
      return 0;
    }
  }

  function _convertDecimals(uint256 reward, address stakingAsset) internal view returns (uint256) {
    uint8 stakingTokenDecimals = IERC20Detailed(stakingAsset).decimals();
    return reward.mul(10**(18 - uint256(stakingTokenDecimals)));
  }

  function _getFundBalance() internal view returns (uint256) {
    return IERC20Detailed(_programData.rewardToken).balanceOf(address(this));
  }

  modifier onlyUniverse() {
    require(msg.sender == _universe, "RP:E-108");
    _;
  }
}
