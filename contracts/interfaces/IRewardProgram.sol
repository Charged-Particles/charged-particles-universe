// SPDX-License-Identifier: MIT

// IRewardProgram.sol -- Part of the Charged Particles Protocol
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

interface IRewardProgram {
  /* admin events */
  event RewardProgramFunded(uint256 amount);
  event RewardProgramOutOfFunds();

  /* user events */
  event RewardsClaimed(address indexed contractAddress, uint256 tokenId, address indexed receiver, uint256 rewarded, uint256 remaining);

  event AssetRegistered(address indexed contractAddress, uint256 tokenId, string walletManagerId, uint256 principalAmount);
  event AssetDeposit(address indexed contractAddress, uint256 tokenId, string walletManagerId, uint256 principalAmount);
  event AssetRelease(address indexed contractAddress, uint256 tokenId, uint256 interestAmount);

  event NftDeposit(address indexed contractAddress, uint256 tokenId, address indexed nftTokenAddress, uint256 nftTokenId);
  event NftRelease(address indexed contractAddress, uint256 tokenId, address indexed nftTokenAddress, uint256 nftTokenId);

  /* data types */
  struct ProgramRewardData {
    address stakingToken;
    address rewardToken;
    uint256 baseMultiplier; // Basis Points
    address multiplierNft;
  }

  struct AssetStake {
    uint256 start;
    uint256 claimableRewards;
    string walletManagerId;
  }

  struct NftStake {
    uint256 multiplier; // in Basis Points
    uint256 depositBlockNumber;
    uint256 releaseBlockNumber;
  }

  /* user functions */
  function getProgramData() external view returns (ProgramRewardData memory programData);
  function getFundBalance() external view returns (uint256);
  function getClaimableRewards(address contractAddress, uint256 tokenId) external view returns (uint256);
  function claimRewards(address contractAddress, uint256 tokenId, address receiver) external;

  function registerExistingDeposits(address contractAddress, uint256 tokenId, string calldata walletManagerId) external;

  function registerAssetDeposit(address contractAddress, uint256 tokenId, string calldata walletManagerId, uint256 principalAmount) external;
  function registerAssetRelease(address contractAddress, uint256 tokenId, uint256 interestAmount) external;

  function registerNftDeposit(address contractAddress, uint256 tokenId, address nftTokenAddress, uint256 nftTokenId, uint256 nftTokenAmount) external;
  function registerNftRelease(address contractAddress, uint256 tokenId, address nftTokenAddress, uint256 nftTokenId, uint256 nftTokenAmount) external;
}