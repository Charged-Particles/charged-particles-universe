## `ChargedParticles`

Charged Particles Contract


Upgradeable Contract

### `managerEnabled(string walletManagerId)`





### `basketEnabled(string basketManagerId)`






### `initialize(address initiator)` (public)





### `getStateAddress() → address stateAddress` (external)





### `getSettingsAddress() → address settingsAddress` (external)





### `getManagersAddress() → address managersAddress` (external)





### `onERC721Received(address, address, uint256, bytes) → bytes4` (external)





### `onERC1155Received(address, address, uint256, uint256, bytes) → bytes4` (external)





### `onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) → bytes4` (external)

/ @dev Unimplemented



### `supportsInterface(bytes4 interfaceId) → bool` (external)





### `getFeesForDeposit(uint256 assetAmount) → uint256 protocolFee` (external)

/ @notice Calculates the amount of fees to be paid for a specific deposit amount




### `baseParticleMass(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

/ @notice Gets the amount of asset tokens that have been deposited into the Particle
representing the Mass of the Particle




### `currentParticleCharge(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

/ @notice Gets the amount of interest that the Particle has generated representing
the Charge of the Particle




### `currentParticleKinetics(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

/ @notice Gets the amount of LP Tokens that the Particle has generated representing
the Kinetics of the Particle




### `currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string basketManagerId) → uint256` (external)

/ @notice Gets the total amount of ERC721 Tokens that the Particle holds




### `energizeParticle(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, address referrer) → uint256 yieldTokensAmount` (external)

/ @notice Fund a Particle with an asset token (ERC20)
   Must be called by the account providing the asset
   The account must approve THIS (ChargedParticles.sol) contract as Operator of the asset





### `dischargeParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Allows the owner or operator of the token (Particle) to collect or transfer the interest generated
        from the token without removing the underlying asset




### `dischargeParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Allows the owner or operator of the token (Particle) to collect or transfer a specific amount of the interest
        generated from the token without removing the underlying asset from the Particle




### `dischargeParticleForCreator(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)

/ @notice Allows the creator of the token (Particle) to collect or transfer a their portion of the interest (if any)
        generated from the token without removing the underlying asset that is held within the Particle




### `releaseParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Releases the Full amount of Asset + Interest held within the Particle by LP of the Assets




### `releaseParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Releases a partial amount of principal + interest held within the Particle by LP of the Assets




### `covalentBond(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)

/ @notice Deposit other NFT Assets into the Particle
   Must be called by the account providing the Asset
   Account must Approve THIS contract as Operator of Asset





### `breakCovalentBond(address receiver, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)

/ @notice Release NFT Assets from the Particle




### `setController(address controller, string controllerId)` (external)

/ @dev Setup the various Charged-Controllers



### `setDepositFee(uint256 fee)` (external)

/ @dev Setup the base deposit fee for the protocol



### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)





### `_validateDeposit(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount)` (internal)

/ @dev Validates a deposit according to the rules set by the token contract




### `_validateNftDeposit(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId)` (internal)

/ @dev Validates an NFT deposit according to the rules set by the token contract




### `_validateDischarge(address contractAddress, uint256 tokenId)` (internal)





### `_validateRelease(address contractAddress, uint256 tokenId)` (internal)





### `_validateBreakBond(address contractAddress, uint256 tokenId)` (internal)





### `_depositIntoWalletManager(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, uint256 feeAmount) → uint256` (internal)

/ @dev Deposit asset tokens into an NFT via the Wallet Manager




### `_depositIntoBasketManager(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool` (internal)

/ @dev Deposit NFTs into the Basket Manager




### `_getFeesForDeposit(uint256 assetAmount) → uint256 protocolFee` (internal)




Calculates the amount of fees to be paid for a specific deposit amount; fees are calculated in terms of the interest token


### `_collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) → uint256 protocolFee` (internal)

/ @dev Collects the Required ERC20 Token(s) from the user's wallet; be sure to approve this contract (ChargedParticles.sol) to transfer your token(s)




### `_collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId)` (internal)

/ @dev Collects the Required ERC721 token(s) from the user's wallet; be sure to approve this contract (ChargedParticles.sol) to transfer your nft(s)




### `_isERC1155(address nftTokenAddress) → bool` (internal)

/ @dev Checks if an NFT contract supports the ERC1155 standard interface



### `_baseParticleMass(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (internal)

/ @dev See {ChargedParticles-baseParticleMass}.



### `_currentParticleCharge(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (internal)

/ @dev See {ChargedParticles-currentParticleCharge}.



### `_currentParticleKinetics(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (internal)

/ @dev See {ChargedParticles-currentParticleKinetics}.



### `_currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string basketManagerId) → uint256` (internal)

/ @dev See {ChargedParticles-currentParticleCovalentBonds}.



### `_msgSender() → address payable` (internal)

/ @dev See {BaseRelayRecipient-_msgSender}.



### `_msgData() → bytes` (internal)

/ @dev See {BaseRelayRecipient-_msgData}.




