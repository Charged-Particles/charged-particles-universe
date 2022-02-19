// SPDX-License-Identifier: MIT

// ParticleSplitter.sol -- Part of the Charged Particles Protocol
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

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IParticleSplitter.sol";
import "./interfaces/IChargedManagers.sol";
import "./interfaces/IWalletManager.sol";
import "./interfaces/IBasketManager.sol";
import "./interfaces/ITokenInfoProxy.sol";
import "./lib/BlackholePrevention.sol";

/**
 * @notice Charged Particles Contract
 * @dev Upgradeable Contract
 */
contract ParticleSplitter is IParticleSplitter, Ownable, ReentrancyGuard, BlackholePrevention
{
  IChargedManagers internal _chargedManagers;
  ITokenInfoProxy internal _tokenInfoProxy;

  mapping (address => bool) internal _externalAddressesAllowed;


  /***********************************|
  |        Execute for Account        |
  |__________________________________*/

  /// @notice Executes an arbitrary command on an NFT Wallet
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param walletManagerId      The Wallet Manager controlling the NFT Wallet to execute on
  /// @param externalAddress      The Address of the External Contract to execute on
  /// @param encodedParams        The encoded function call to execute
  function executeForWallet(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address externalAddress,
    bytes memory encodedParams
  )
    external
    payable
    virtual
    override
    onlyTokenOwner(contractAddress, tokenId)
    nonReentrant
    returns (bytes memory)
  {
    require(_chargedManagers.isWalletManagerEnabled(walletManagerId), "PS:E-419");
    require(_externalAddressesAllowed[externalAddress], "PS:E-117");

    // Validate Owner/Operator & Timelocks
    _chargedManagers.validateRelease(msg.sender, contractAddress, tokenId);

    // Get appropriate Wallet Manager
    IWalletManager walletMgr = _chargedManagers.getWalletManager(walletManagerId);

    // Get Address of Wallet to send any ETH into
    if (msg.value > 0) {
      address wallet = walletMgr.getWalletAddressById(contractAddress, tokenId, address(0), 0);
      payable(wallet).sendValue(msg.value);
    }

    emit ExecuteForWallet(contractAddress, tokenId, walletManagerId, externalAddress, encodedParams, msg.value);

    // Execute command for NFT Wallet
    return walletMgr.executeForAccount(contractAddress, tokenId, externalAddress, msg.value, encodedParams);
  }

  /// @notice Executes an arbitrary command on an NFT Basket
  /// @param contractAddress      The Address to the Contract of the Token
  /// @param tokenId              The ID of the Token
  /// @param basketManagerId      The Basket Manager controlling the NFT Wallet to execute on
  /// @param externalAddress      The Address of the External Contract to execute on
  /// @param encodedParams        The encoded function call to execute
  function executeForBasket(
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address externalAddress,
    bytes memory encodedParams
  )
    external
    payable
    virtual
    override
    onlyTokenOwner(contractAddress, tokenId)
    nonReentrant
    returns (bytes memory)
  {
    require(_chargedManagers.isNftBasketEnabled(basketManagerId), "PS:E-419");
    require(_externalAddressesAllowed[externalAddress], "PS:E-117");

    // Validate Owner/Operator & Timelocks
    _chargedManagers.validateRelease(msg.sender, contractAddress, tokenId);

    // Get appropriate Basket Manager
    IBasketManager basketMgr = _chargedManagers.getBasketManager(basketManagerId);

    // Get Address of Wallet to send any ETH into
    if (msg.value > 0) {
      address wallet = basketMgr.getBasketAddressById(contractAddress, tokenId);
      payable(wallet).sendValue(msg.value);
    }

    emit ExecuteForBasket(contractAddress, tokenId, basketManagerId, externalAddress, encodedParams, msg.value);

    // Execute command for NFT Wallet
    return basketMgr.executeForAccount(contractAddress, tokenId, externalAddress, msg.value, encodedParams);
  }

  function withdrawWalletRewards(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address rewardsToken,
    uint256 rewardsAmount
  )
    external
    virtual
    override
    onlyTokenOwner(contractAddress, tokenId)
    nonReentrant
    returns (uint256 amountWithdrawn)
  {
    require(_chargedManagers.isWalletManagerEnabled(walletManagerId), "PS:E-419");

    // Validate Owner/Operator & Timelocks
    _chargedManagers.validateRelease(msg.sender, contractAddress, tokenId);

    // Get appropriate Wallet Manager
    IWalletManager walletMgr = _chargedManagers.getWalletManager(walletManagerId);

    // Withdraw Rewards for NFT Wallet
    return walletMgr.withdrawRewards(receiver, contractAddress, tokenId, rewardsToken, rewardsAmount);
  }

  function withdrawBasketRewards(
    address receiver,
    address contractAddress,
    uint256 tokenId,
    string calldata basketManagerId,
    address rewardsToken,
    uint256 rewardsAmount
  )
    external
    virtual
    override
    onlyTokenOwner(contractAddress, tokenId)
    nonReentrant
    returns (uint256 amountWithdrawn)
  {
    require(_chargedManagers.isNftBasketEnabled(basketManagerId), "PS:E-419");

    // Validate Owner/Operator & Timelocks
    _chargedManagers.validateRelease(msg.sender, contractAddress, tokenId);

    // Get appropriate Basket Manager
    IBasketManager basketMgr = _chargedManagers.getBasketManager(basketManagerId);

    // Withdraw Rewards for NFT Basket
    return basketMgr.withdrawRewards(receiver, contractAddress, tokenId, rewardsToken, rewardsAmount);
  }

  function refreshWalletPrincipal(
    address contractAddress,
    uint256 tokenId,
    string calldata walletManagerId,
    address assetToken
  )
    external
    virtual
    override
  {
    require(_chargedManagers.isWalletManagerEnabled(walletManagerId), "PS:E-419");

    IWalletManager walletMgr = _chargedManagers.getWalletManager(walletManagerId);
    walletMgr.refreshPrincipal(contractAddress, tokenId, assetToken);

    emit PrincipalRefreshed(contractAddress, tokenId, walletManagerId, assetToken);
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/

  /**
    * @dev Setup the ChargedManagers Interface
    */
  function setChargedManagers(address chargedManagers) external virtual onlyOwner {
    _chargedManagers = IChargedManagers(chargedManagers);
    emit ChargedManagersSet(chargedManagers);
  }

  /**
    * @dev Setup the ChargedManagers Interface
    */
  function setTokenInfoProxy(address tokenInfoProxy) external virtual onlyOwner {
    _tokenInfoProxy = ITokenInfoProxy(tokenInfoProxy);
    emit TokenInfoProxySet(tokenInfoProxy);
  }

  /**
    * @dev Allows/Disallows execute from on specific contracts
    */
  function setExternalContracts(address[] calldata contracts, bool state) external onlyOwner {
    uint count = contracts.length;
    for (uint i; i < count; i++) {
      address externalContract = contracts[i];
      _externalAddressesAllowed[externalContract] = state;
      emit PermsSetForExternal(externalContract, state);
    }
  }


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
  |             Modifiers             |
  |__________________________________*/

  modifier onlyTokenOwner(address contractAddress, uint256 tokenId) {
    address tokenOwner = _tokenInfoProxy.getTokenOwner(contractAddress, tokenId);
    require(msg.sender == tokenOwner, "PS:E-102");
    _;
  }
}
