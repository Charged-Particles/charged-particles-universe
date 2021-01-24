// SPDX-License-Identifier: MIT

// GenericERC20WalletManager.sol -- Charged Particles

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../../lib/WalletManagerBase.sol";
import "./GenericERC721SmartWallet.sol";

/**
 * @notice Generic ERC721 Wallet Manager
 * @dev Non-upgradeable Contract
 */
contract GenericERC721WalletManager is WalletManagerBase {
  using SafeMath for uint256;

  uint256 internal _referralCode;

  /***********************************|
  |          Initialization           |
  |__________________________________*/

  constructor () public {
    _walletTemplate = address(new GenericERC721SmartWallet());
  }

  /***********************************|
  |              Public               |
  |__________________________________*/

  function isReserveActive(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    view
    returns (bool)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return false; }
    return GenericERC721SmartWallet(_wallets[uuid]).isReserveActive(assetToken);
  }

  function getReserveInterestToken(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    view
    returns (address)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return address(0x0); }
    return GenericERC721SmartWallet(_wallets[uuid]).getReserveInterestToken(assetToken);
  }

  /**
    * @notice Gets the Available Balance of Assets held in the Token
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Available Balance of the Token
    */
  function getTotal(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    returns (uint256)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return GenericERC721SmartWallet(_wallets[uuid]).getTotal(assetToken);
  }

  /**
    * @notice Gets the Principal-Amount of Assets held in the Smart-Wallet
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return  The Principal-Balance of the Smart-Wallet
    */
  function getPrincipal(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    returns (uint256)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return GenericERC721SmartWallet(_wallets[uuid]).getPrincipal(assetToken);
  }

  /**
    * @notice Gets the Interest-Amount that the Token has generated
    * @param contractAddress The Address to the External Contract of the Token
    * @param tokenId The ID of the Token within the External Contract
    * @return creatorInterest The NFT Creator's portion of the Interest
    * @return ownerInterest The NFT Owner's portion of the Interest
    */
  function getInterest(address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    returns (uint256 creatorInterest, uint256 ownerInterest)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] != address(0x0)) {
    return GenericERC721SmartWallet(_wallets[uuid]).getInterest(assetToken);
    }
  }

  function getRewards(address contractAddress, uint256 tokenId, address rewardToken)
    public
    override
    returns (uint256)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    if (_wallets[uuid] == address(0x0)) { return 0; }
    return GenericERC721SmartWallet(_wallets[uuid]).getRewards(rewardToken);
  }

  function energize(address contractAddress, uint256 tokenId, address assetToken, uint256 assetID)
    public
    override
    onlyController
    returns (uint256 yieldTokensAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];

    // Deposit into Smart-Wallet
    yieldTokensAmount = GenericERC721SmartWallet(wallet).deposit(assetToken, assetID, _referralCode);

    // Log Event
    emit WalletEnergized(contractAddress, tokenId, assetToken, assetID, yieldTokensAmount);
  }

  function discharge(address /* receiver */, address /* contractAddress */, uint256 /* tokenId */, address /* assetToken */)
    public
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    return (0, 0);
  }

  function dischargeAmount(address /* receiver */, address /* contractAddress */, uint256 /* tokenId */, address /* assetToken */, uint256 /* assetAmount */)
    public
    override
    onlyController
    returns (uint256 creatorAmount, uint256 receiverAmount)
  {
    return (0, 0);
  }

  function dischargeAmountForCreator(
    address /* receiver */,
    address /* contractAddress */,
    uint256 /* tokenId */,
    address /* creator */,
    address /* assetToken */,
    uint256 /* assetAmount */
  )
    external
    override
    onlyController
    returns (uint256 receiverAmount)
  {
    return 0;
  }

  function release(address receiver, address contractAddress, uint256 tokenId, address assetToken)
    public
    override
    onlyController
    returns (uint256 principalAmount, uint256 creatorAmount, uint256 receiverAmount)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "GenericERC20WalletManager: INVALID_TOKEN_ID");

    // Release Principal + Interest
    principalAmount = GenericERC721SmartWallet(wallet).getPrincipal(assetToken);
    (creatorAmount, receiverAmount) = GenericERC721SmartWallet(wallet).withdraw(receiver, assetToken);

    // Log Event
    emit WalletReleased(contractAddress, tokenId, receiver, assetToken, principalAmount, creatorAmount, receiverAmount);
  }

  function withdrawRewards(address receiver, address contractAddress, uint256 tokenId, address rewardsToken, uint256 rewardsID)
    public
    override
    onlyController
    returns (uint256 id)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    require(wallet != address(0x0), "GenericERC20WalletManager: INVALID_TOKEN_ID");

    // Withdraw Rewards to Receiver
    id = GenericERC721SmartWallet(wallet).withdrawRewards(receiver, rewardsToken, rewardsID);

    // Log Event
    emit WalletRewarded(contractAddress, tokenId, receiver, rewardsToken, id);
  }

  function withdrawEther(address contractAddress, uint256 tokenId, address payable receiver, uint256 amount)
    public
    override
    onlyController
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    return GenericERC721SmartWallet(wallet).withdrawEther(receiver, amount);
  }

  function executeForAccount(address contractAddress, uint256 tokenId, address externalAddress, uint256 ethValue, bytes memory encodedParams)
    public
    override
    onlyController
    returns (bytes memory)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];
    return GenericERC721SmartWallet(wallet).executeForAccount(externalAddress, ethValue, encodedParams);
  }

  function getWalletAddressById(address contractAddress, uint256 tokenId, address creator, uint256 annuityPct)
    public
    override
    onlyController
    returns (address)
  {
    uint256 uuid = _getTokenUUID(contractAddress, tokenId);
    address wallet = _wallets[uuid];

    // Create Smart-Wallet if none exists
    if (wallet == address(0x0)) {
      wallet = _createWallet();
      _wallets[uuid] = wallet;

      if (creator != address(0x0)) {
        GenericERC721SmartWallet(wallet).setNftCreator(creator, annuityPct);
      }

      emit NewSmartWallet(contractAddress, tokenId, wallet, creator, annuityPct);
    }

    return wallet;
  }

  /***********************************|
  |         Private Functions         |
  |__________________________________*/

  function _createWallet()
    internal
    returns (address)
  {
    address newWallet = _createClone(_walletTemplate);
    GenericERC721SmartWallet(newWallet).initialize();
    return newWallet;
  }

}
