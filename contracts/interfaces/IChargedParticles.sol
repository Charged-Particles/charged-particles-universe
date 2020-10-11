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

  event RegisterParticleContract(
    address indexed _contractAddress
  );
  event DischargeApproval(
    address indexed _contractAddress,
    uint256 indexed _tokenId,
    address indexed _owner,
    address _operator
  );
  event ReleaseApproval(
    address indexed _contractAddress,
    uint256 indexed _tokenId,
    address indexed _owner,
    address _operator
  );
  event EnergizedParticle(
    address indexed _contractAddress,
    uint256 indexed _tokenId,
    string _liquidityProviderId,
    address _assetToken,
    uint256 _assetBalance
  );
  event DischargedParticle(
    address indexed _contractAddress,
    uint256 indexed _tokenId,
    address indexed _receiver,
    string _liquidityProviderId,
    address _assetToken,
    uint256 _receivedAmount
  );
  event ReleasedParticle(
    address indexed _contractAddress,
    uint256 indexed _tokenId,
    address indexed _receiver,
    string _liquidityProviderId,
    address _assetToken,
    uint256 _receivedAmount
  );
  event FeesWithdrawn(
    address indexed _contractAddress,
    address indexed _receiver,
    string _liquidityProviderId,
    address _assetToken,
    uint256 _interestAmoount
  );

  function isLiquidityProviderEnabled(string calldata _liquidityProviderId) external view returns (bool);
  function getLiquidityProvidersCount() external view returns (uint);
  function getLiquidityProviderByIndex(uint _index) external view returns (string memory);

  function getWalletManager(string calldata _liquidityProviderId) external view returns (address);

  function getTokenUUID(address _contractAddress, uint256 _tokenId) external pure returns (uint256);
  function getOwnerUUID(string calldata _liquidityProviderId, address _owner) external pure returns (uint256);

  function getAssetMinDeposit(address _contractAddress) external view returns (uint256);
  function getAssetMaxDeposit(address _contractAddress) external view returns (uint256);
  function getCustomLiquidityProviderId(address _contractAddress) external view returns (string memory);
  function getCustomReleaseRequiresBurn(address _contractAddress) external view returns (bool);

  function setDischargeApproval(address _contractAddress, uint256 _tokenId, address _operator) external;
  function setReleaseApproval(address _contractAddress, uint256 _tokenId, address _operator) external;
  function isApprovedForDischarge(address _contractAddress, uint256 _tokenId, address _operator) external view returns (bool);
  function isApprovedForRelease(address _contractAddress, uint256 _tokenId, address _operator) external view returns (bool);

  function getFeesForDeposit(address _contractAddress, uint256 _assetAmount) external view returns (uint256 _depositFee, uint256 _customFee);
  function getFeeForDeposit(address _contractAddress, uint256 _assetAmount) external view returns (uint256);

  function baseParticleMass(address _contractAddress, uint256 _tokenId, string calldata _liquidityProviderId, address _assetToken) external returns (uint256);
  function currentParticleCharge(address _contractAddress, uint256 _tokenId, string calldata _liquidityProviderId, address _assetToken) external returns (uint256);
  function currentParticleKinetics(address _contractAddress, uint256 _tokenId, string calldata _liquidityProviderId, address _assetToken) external returns (uint256);

  /***********************************|
  |     Register Contract Settings    |
  |(For External Contract Integration)|
  |__________________________________*/

  function isContractOwner(address _account, address _contractAddress) external view returns (bool);
  function registerContractType(address _contractAddress) external;
  function registerContractSettingReleaseBurn(address _contractAddress, bool _releaseRequiresBurn) external;
  function registerContractSettingLiquidityProvider(address _contractAddress, string calldata _assetPairId) external;
  function registerContractSettingDepositFee(address _contractAddress, uint256 _depositFee) external;
  function registerContractSettingMinDeposit(address _contractAddress, uint256 _minDeposit) external;
  function registerContractSettingMaxDeposit(address _contractAddress, uint256 _maxDeposit) external;

  function getCollectedFees(
    address _contractAddress,
    string calldata _liquidityProviderId,
    address _assetToken
  ) external returns (uint256 _balance, uint256 _interestAccrued);

  function storeCollectedFees(
    address _contractAddress,
    string calldata _liquidityProviderId,
    address _assetToken
  ) external  returns (uint256 _amountStored);

  function withdrawContractFees(
    address _contractAddress,
    address _receiver,
    string calldata _liquidityProviderId,
    address _assetToken
  ) external returns (uint256 _amount);


  /***********************************|
  |          Particle Charge          |
  |__________________________________*/

  function energizeParticle(
      address _contractAddress,
      uint256 _tokenId,
      string calldata _liquidityProviderId,
      address _assetToken,
      uint256 _assetAmount
  ) external returns (uint256 _interestAmount);

  function dischargeParticle(
      address _receiver,
      address _contractAddress,
      uint256 _tokenId,
      string calldata _liquidityProviderId,
      address _assetToken
  ) external returns (uint256 _amount);

  function dischargeParticleAmount(
      address _receiver,
      address _contractAddress,
      uint256 _tokenId,
      string calldata _liquidityProviderId,
      address _assetToken,
      uint256 _assetAmount
  ) external returns (uint256 _amount);

  function releaseParticle(
      address _receiver,
      address _contractAddress,
      uint256 _tokenId,
      string calldata _liquidityProviderId,
      address _assetToken
  ) external returns (uint256 _amount);

  function finalizeRelease(
      address _receiver,
      address _contractAddress,
      uint256 _tokenId,
      string calldata _liquidityProviderId,
      address _assetToken
  ) external returns (uint256 _amount);
}
