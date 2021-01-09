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
    public
    override
    view
    returns (bool)
  {
    return _getPrincipal(assetToken) == 0;
  }

  function getReserveInterestToken(address assetToken)
    public
    override
    view
    returns (address)
  {
    return assetToken;
  }

  function getPrincipal(address assetToken)
    public
    override
    returns (uint256)
  {
    return _getPrincipal(assetToken);
  }

  function getInterest(address /* assetToken */)
    public
    override
    returns (uint256 creatorInterest, uint256 ownerInterest)
  {
    return (0, 0);
  }

  function getTotal(address assetToken)
    public
    override
    returns (uint256)
  {
    return _getPrincipal(assetToken);
  }

  function getRewards(address /* assetToken */)
    public
    override
    returns (uint256)
  {
    return 0;
  }

  function deposit(address assetToken, uint256 assetAmount, uint256 /* referralCode */)
    public
    override
    returns (uint256)
  {
    // Track Principal
    _trackAssetToken(assetToken);
    _assetPrincipalBalance[assetToken] = _assetPrincipalBalance[assetToken].add(assetAmount);
  }

  function withdraw(address receiver, address assetToken)
    public
    override
    returns (uint256 /* creatorAmount */, uint256 /* receiverAmount */)
  {
    IERC20(assetToken).transfer(receiver, _getPrincipal(assetToken));
  }

  function withdrawAmount(address receiver, address assetToken, uint256 assetAmount)
    public
    override
    returns (uint256 /* creatorAmount */, uint256 /* receiverAmount */)
  {
    uint256 walletAmount = _getPrincipal(assetToken);
    if (walletAmount < assetAmount) {
      assetAmount = walletAmount;
    }
    IERC20(assetToken).transfer(receiver, walletAmount);
  }

  function withdrawRewards(address /* receiver */, address /* rewardsToken */, uint256 /* rewardsAmount */)
    public
    override
    returns (uint256)
  {
    return 0;
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getPrincipal(address assetToken) internal view returns (uint256) {
    return _assetPrincipalBalance[assetToken];
  }

}

