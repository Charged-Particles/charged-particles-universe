// SPDX-License-Identifier: MIT

// GenericSmartWallet.sol -- Charged Particles

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../../../lib/SmartWalletBase.sol";


/**
 * @notice Generic ERC721-Token Smart-Wallet Bridge
 * @dev Non-upgradeable Contract
 */
contract GenericERC721SmartWallet is SmartWalletBase {
  using SafeMath for uint256;
  using SafeCast for uint256;

  // Asset Token => Principal Balance
  mapping (address => uint256) internal _assetPrincipalCount;
  mapping (uint256 => uint256) internal _assetPrincipalIDs;

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
    return IERC721(assetToken).balanceOf(address(this));
  }

  function deposit(address assetToken, uint256 assetID, uint256 /* referralCode */)
    external
    override
    returns (uint256)
  {
    // Track Principal
    _trackAssetToken(assetToken);
    _assetPrincipalIDs[_assetPrincipalCount[assetToken]] = assetID;
    _assetPrincipalCount[assetToken] = _assetPrincipalCount[assetToken].add(1);
  }

  function withdraw(address receiver, address assetToken)
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    creatorAmount = 0;
    receiverAmount = _getPrincipal(assetToken);
    // Track Principal
    _assetPrincipalCount[assetToken] = 0;
    for (uint256 i; i < receiverAmount; i++) {
      IERC721(assetToken).safeTransferFrom(address(this), receiver, _assetPrincipalIDs[i]);
    }
  }

  function withdrawAmount(address receiver, address assetToken, uint256 assetID)
    external
    override
    onlyWalletManager
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    creatorAmount = 0;
    receiverAmount = _getPrincipal(assetToken);
    uint256 receiverID = receiverAmount;
    for (uint256 i; i < receiverAmount; i++) {
      if (_assetPrincipalIDs[i] == assetID) {
        receiverID = i;
      }
    }
    require(receiverID < receiverAmount, "GenericERC721SmartWallet: E-203");
    // Track Principal
    _assetPrincipalCount[assetToken] = _assetPrincipalCount[assetToken].sub(1);
    IERC721(assetToken).safeTransferFrom(address(this), receiver, assetID);
  }

  function withdrawAmountForCreator(
    address /* receiver */,
    address /* assetToken */,
    uint256 /* assetID */
  )
    external
    override
    onlyWalletManager
    returns (uint256 receiverAmount)
  {
    return 0;
  }

  function withdrawRewards(address receiver, address rewardsTokenAddress, uint256 rewardsID)
    external
    override
    onlyWalletManager
    returns (uint256)
  {
    address self = address(this);
    IERC721 rewardsToken = IERC721(rewardsTokenAddress);

    address rewardsOwner = rewardsToken.ownerOf(rewardsID);
    require(rewardsOwner == self, "GenericSmartWallet: E-203");

    // Transfer Rewards to Receiver
    rewardsToken.safeTransferFrom(self, receiver, rewardsID);
    return rewardsID;
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _getPrincipal(address assetToken) internal view returns (uint256) {
    return _assetPrincipalCount[assetToken];
  }

}
