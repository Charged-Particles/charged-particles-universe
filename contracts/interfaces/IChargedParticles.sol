// SPDX-License-Identifier: MIT

// IChargedParticles.sol -- Charged Particles
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

/**
 * @notice Interface for Charged Particles
 */
interface IChargedParticles {

  /***********************************|
  |             Public API            |
  |__________________________________*/

  function isLiquidityProviderEnabled(string calldata liquidityProviderId) external view returns (bool);
  function getLiquidityProvidersCount() external view returns (uint);
  function getLiquidityProviderByIndex(uint index) external view returns (string memory);
  function getWalletManager(string calldata liquidityProviderId) external view returns (address);

  function getTokenUUID(address contractAddress, uint256 tokenId) external pure returns (uint256);
  function getOwnerUUID(string calldata liquidityProviderId, address owner) external pure returns (uint256);

  function setDischargeApproval(address contractAddress, uint256 tokenId, address operator) external;
  function setReleaseApproval(address contractAddress, uint256 tokenId, address operator) external;
  function setTimelockApproval(address contractAddress, uint256 tokenId, address operator) external;
  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external view returns (bool);
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external view returns (bool);
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external view returns (bool);

  function getFeesForDeposit(address contractAddress, uint256 assetAmount) external view returns (uint256 protocolFee, uint256 externalFee);
  function getTotalFeeForDeposit(address contractAddress, uint256 assetAmount) external view returns (uint256);

  function baseParticleMass(address contractAddress, uint256 tokenId, string calldata liquidityProviderId, address assetToken) external returns (uint256);
  function currentParticleCharge(address contractAddress, uint256 tokenId, string calldata liquidityProviderId, address assetToken) external returns (uint256);
  function currentParticleKinetics(address contractAddress, uint256 tokenId, string calldata liquidityProviderId, address assetToken) external returns (uint256);

  /***********************************|
  |     Register Contract Settings    |
  |(For External Contract Integration)|
  |__________________________________*/

  function isContractOwner(address contractAddress, address account) external view returns (bool);
  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external view returns (bool);

  function setExternalContractConfigs(
    address contractAddress,
    string calldata liquidityProvider,
    uint256 assetDepositFee,
    uint256 assetDepositMin,
    uint256 assetDepositMax
  ) external;

  function setCreatorConfigs(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent,
    bool burnToRelease
  ) external;

  function getCollectedFees(
    address contractAddress,
    string calldata liquidityProviderId,
    address assetToken
  ) external returns (uint256 balance, uint256 interestAccrued);

  function storeCollectedFees(
    address contractAddress,
    string calldata liquidityProviderId,
    address assetToken
  ) external returns (uint256 amountStored);

  function withdrawContractFees(
    address contractAddress,
    address receiver,
    string calldata liquidityProviderId,
    address assetToken
  ) external returns (uint256 amount);

  function setDischargeTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  ) external;

  function setReleaseTimelock(
    address contractAddress,
    uint256 tokenId,
    uint256 unlockBlock
  ) external;

  /***********************************|
  |          Particle Charge          |
  |__________________________________*/

  function energizeParticle(
      address contractAddress,
      uint256 tokenId,
      string calldata liquidityProviderId,
      address assetToken,
      uint256 assetAmount
  ) external returns (uint256 yieldTokensAmount);

  function dischargeParticle(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata liquidityProviderId,
      address assetToken
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function dischargeParticleAmount(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata liquidityProviderId,
      address assetToken,
      uint256 assetAmount
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function releaseParticle(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata liquidityProviderId,
      address assetToken
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function finalizeRelease(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata liquidityProviderId,
      address assetToken
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  /***********************************|
  |          Particle Events          |
  |__________________________________*/

  event UniverseSet(
    address indexed universeAddress
  );
  event DepositFeeSet(
    uint256 depositFee
  );
  event LiquidityProviderRegistered(
    string indexed liquidityProviderId,
    address indexed walletManager
  );
  event TokenContractConfigsSet(
    address indexed contractAddress,
    string indexed liquidityProvider,
    uint256 assetDepositFee,
    uint256 assetDepositMin,
    uint256 assetDepositMax
  );
  event TokenCreatorConfigsSet(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed creatorAddress,
    uint256 annuityPercent,
    bool burnToRelease
  );
  event DischargeApproval(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed owner,
    address operator
  );
  event ReleaseApproval(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed owner,
    address operator
  );
  event TimelockApproval(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed owner,
    address operator
  );
  event TokenDischargeTimelock(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed operator,
    uint256 unlockBlock
  );
  event TokenReleaseTimelock(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed operator,
    uint256 unlockBlock
  );
  event FeesWithdrawn(
    address indexed contractAddress,
    address indexed receiver,
    string liquidityProviderId,
    address assetToken,
    uint256 amount
  );
  event UpdateContractWhitelist(
    address indexed contractAddress,
    bool state
  );
}
