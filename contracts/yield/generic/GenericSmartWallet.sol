// SPDX-License-Identifier: MIT

// GenericSmartWallet.sol -- Charged Particles

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../lib/SmartWalletBase.sol";


/**
 * @notice Generic ERC20-Token Smart-Wallet Bridge
 * @dev Non-upgradeable Contract
 */
contract GenericSmartWallet is SmartWalletBase {
  using SafeMath for uint256;
  using SafeCast for uint256;

  // Asset Token => Principal Balance
  mapping (address => uint256) internal _assetPrincipalBalance;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  function initialize()
    public
  {
    SmartWalletBase.initializeBase();
  }

  function isReserveActive(address assetToken)
    external
    override
    view
    returns (bool)
  {
    return _getPrincipal(assetToken) == 0;
  }

  function getReserveInterestToken(address assetToken)
    external
    override
    view
    returns (address)
  {
    return assetToken;
  }

  function getPrincipal(address assetToken)
    external
    override
    returns (uint256)
  {
    return _getPrincipal(assetToken);
  }

  function getInterest(address /* assetToken */)
    external
    override
    returns (uint256 creatorInterest, uint256 ownerInterest)
  {
    return (0, 0);
  }

  function getTotal(address assetToken)
    external
    override
    returns (uint256)
  {
    return _getPrincipal(assetToken);
  }

  function getRewards(address assetToken)
    external
    override
    returns (uint256)
  {
    return IERC20(assetToken).balanceOf(address(this));
  }

  function deposit(address assetToken, uint256 assetAmount, uint256 /* referralCode */)
    external
    override
    returns (uint256)
  {
    // Track Principal
    _trackAssetToken(assetToken);
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].add(assetAmount);
  }

  function withdraw(address receiver, address assetToken)
    external
    override
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    creatorAmount = 0;
    receiverAmount = _getPrincipal(assetToken);
    // Track Principal
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].sub(receiverAmount);
    IERC20(assetToken).transfer(receiver, receiverAmount);
  }

  function withdrawAmount(address receiver, address assetToken, uint256 assetAmount)
    external
    override
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    creatorAmount = 0;
    receiverAmount = _getPrincipal(assetToken);
    if (receiverAmount >= assetAmount) {
      receiverAmount = assetAmount;
    }
    // Track Principal
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].sub(receiverAmount);
    IERC20(assetToken).transfer(receiver, receiverAmount);
  }

  function withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsAmount)
    external
    override
    returns (uint256)
  {
    address self = address(this);
    IERC20 rewardsToken = IERC20(rewardsTokenAddress);

    uint256 walletBalance = rewardsToken.balanceOf(self);
    require(walletBalance >= rewardsAmount, "AaveSmartWallet: INSUFF_BALANCE");

    // Transfer Rewards to Receiver
    require(rewardsToken.transfer(receiver, rewardsAmount), "AaveSmartWallet: REWARDS_TRANSFER_FAILED");
    return rewardsAmount;
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getPrincipal(address assetToken) internal view returns (uint256) {
    return _assetPrincipalBalance[assetToken];
  }

}

