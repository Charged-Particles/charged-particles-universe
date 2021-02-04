// SPDX-License-Identifier: MIT

// IChargedParticles.sol -- Part of the Charged Particles Protocol
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

/**
 * @notice Interface for Charged Particles
 */
interface IChargedParticles {

  /***********************************|
  |             Public API            |
  |__________________________________*/

  function isTokenCreator(address contractAddress, uint256 tokenId, address account) external view returns (bool);
  function getTokenLockExpiry(address contractAddress, uint256 tokenId) external view returns (uint256 lockExpiry);
  function getCreatorAnnuities(address contractAddress, uint256 tokenId) external view returns (address creator, uint256 annuityPct);
  function getCreatorAnnuitiesRedirect(address contractAddress, uint256 tokenId) external view returns (address);

  // ERC20
  function isWalletManagerEnabled(string calldata walletManagerId) external view returns (bool);
  function getWalletManager(string calldata walletManagerId) external view returns (address);

  // ERC721
  function isNftBasketEnabled(string calldata basketId) external view returns (bool);
  function getBasketManager(string calldata basketId) external view returns (address);

  function setDischargeApproval(address contractAddress, uint256 tokenId, address operator) external;
  function setReleaseApproval(address contractAddress, uint256 tokenId, address operator) external;
  function setBreakBondApproval(address contractAddress, uint256 tokenId, address operator) external;
  function setTimelockApproval(address contractAddress, uint256 tokenId, address operator) external;
  function setApprovalForAll(address contractAddress, uint256 tokenId, address operator) external;

  function setPermsForRestrictCharge(address contractAddress, uint256 tokenId, bool state) external;
  function setPermsForAllowDischarge(address contractAddress, uint256 tokenId, bool state) external;
  function setPermsForAllowRelease(address contractAddress, uint256 tokenId, bool state) external;
  function setPermsForRestrictBond(address contractAddress, uint256 tokenId, bool state) external;
  function setPermsForAllowBreakBond(address contractAddress, uint256 tokenId, bool state) external;

  function isApprovedForDischarge(address contractAddress, uint256 tokenId, address operator) external view returns (bool);
  function isApprovedForRelease(address contractAddress, uint256 tokenId, address operator) external view returns (bool);
  function isApprovedForBreakBond(address contractAddress, uint256 tokenId, address operator) external view returns (bool);
  function isApprovedForTimelock(address contractAddress, uint256 tokenId, address operator) external view returns (bool);

  function baseParticleMass(address contractAddress, uint256 tokenId, string calldata walletManagerId, address assetToken) external returns (uint256);
  function currentParticleCharge(address contractAddress, uint256 tokenId, string calldata walletManagerId, address assetToken) external returns (uint256);
  function currentParticleKinetics(address contractAddress, uint256 tokenId, string calldata walletManagerId, address assetToken) external returns (uint256);
  function currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string calldata basketManagerId) external view returns (uint256);

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

  function setTemporaryLock(
    address contractAddress,
    uint256 tokenId,
    bool isLocked
  ) external;

  /***********************************|
  |     Register Contract Settings    |
  |(For External Contract Integration)|
  |__________________________________*/

  function isContractOwner(address contractAddress, address account) external view returns (bool);

  function setRequiredWalletManager(
    address contractAddress,
    string calldata walletManager
  ) external;

  function setRequiredBasketManager(
    address contractAddress,
    string calldata basketManager
  ) external;

  function setAssetTokenRestrictions(
    address contractAddress,
    bool restrictionsEnabled
  ) external;

  function setAllowedAssetToken(
    address contractAddress,
    address assetToken,
    bool isAllowed
  ) external;

  function setAssetTokenLimits(
    address contractAddress,
    address assetToken,
    uint256 depositMin,
    uint256 depositMax
  ) external;

  function setMaxNfts(
    address contractAddress,
    address nftTokenAddress,
    uint256 maxNfts
  ) external;

  function setCreatorConfigs(
    address contractAddress,
    uint256 tokenId,
    address creator,
    uint256 annuityPercent
  ) external;

  function setCreatorAnnuitiesRedirect(
    address contractAddress,
    uint256 tokenId,
    address receiver
  ) external;

  /***********************************|
  |        Particle Mechanics         |
  |__________________________________*/

  function energizeParticle(
      address contractAddress,
      uint256 tokenId,
      string calldata walletManagerId,
      address assetToken,
      uint256 assetAmount,
    address referrer
  ) external returns (uint256 yieldTokensAmount);

  function dischargeParticle(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata walletManagerId,
      address assetToken
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function dischargeParticleAmount(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata walletManagerId,
      address assetToken,
      uint256 assetAmount
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function dischargeParticleForCreator(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata walletManagerId,
      address assetToken,
      uint256 assetAmount
  ) external returns (uint256 receiverAmount);

  function releaseParticle(
      address receiver,
      address contractAddress,
      uint256 tokenId,
      string calldata walletManagerId,
      address assetToken
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function releaseParticleAmount(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken,
    uint256 assetAmount
  ) external returns (uint256 creatorAmount, uint256 receiverAmount);

  function covalentBond(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId
  ) external returns (bool success);

  function breakCovalentBond(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address nftTokenAddress,
    uint256 nftTokenId
  ) external returns (bool success);

  /***********************************|
  |          Particle Events          |
  |__________________________________*/

  event UniverseSet(
    address indexed universeAddress
  );
  event WalletManagerRegistered(
    string indexed walletManagerId,
    address indexed walletManager
  );
  event BasketManagerRegistered(
    string indexed basketId,
    address indexed basketManager
  );
  event DepositCapSet(
    uint256 depositCap
  );
  event RequiredWalletManagerSet(
    address indexed contractAddress,
    string walletManager
  );
  event RequiredBasketManagerSet(
    address indexed contractAddress,
    string basketManager
  );
  event AssetTokenRestrictionsSet(
    address indexed contractAddress,
    bool restrictionsEnabled
  );
  event AllowedAssetTokenSet(
    address indexed contractAddress,
    address assetToken,
    bool isAllowed
  );
  event AssetTokenLimitsSet(
    address indexed contractAddress,
    address assetToken,
    uint256 assetDepositMin,
    uint256 assetDepositMax
  );
  event MaxNftsSet(
    address indexed contractAddress,
    address indexed nftTokenAddress,
    uint256 maxNfts
  );
  event TokenCreatorConfigsSet(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed creatorAddress,
    uint256 annuityPercent
  );
  event TokenCreatorAnnuitiesRedirected(
    address indexed contractAddress,
    uint256 indexed tokenId,
    address indexed redirectAddress
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
  event BreakBondApproval(
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
  event TokenTempLock(
    address indexed contractAddress,
    uint256 indexed tokenId,
    uint256 unlockBlock
  );

  event PermsSetForCharge(address indexed contractAddress, bool state);
  event PermsSetForBasket(address indexed contractAddress, bool state);
  event PermsSetForTimelockAny(address indexed contractAddress, bool state);
  event PermsSetForTimelockSelf(address indexed contractAddress, bool state);

  event PermsSetForRestrictCharge(address indexed contractAddress, uint256 indexed tokenId, bool state);
  event PermsSetForAllowDischarge(address indexed contractAddress, uint256 indexed tokenId, bool state);
  event PermsSetForAllowRelease(address indexed contractAddress, uint256 indexed tokenId, bool state);
  event PermsSetForRestrictBond(address indexed contractAddress, uint256 indexed tokenId, bool state);
  event PermsSetForAllowBreakBond(address indexed contractAddress, uint256 indexed tokenId, bool state);
}
