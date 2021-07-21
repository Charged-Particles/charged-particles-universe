## `ChargedParticles`

Charged Particles Contract


Upgradeable Contract

### `managerEnabled(string walletManagerId)`





### `basketEnabled(string basketManagerId)`






### `initialize(address _trustedForwarder)` (public)





### `getStateAddress() → address stateAddress` (external)





### `getSettingsAddress() → address settingsAddress` (external)





### `onERC721Received(address, address, uint256, bytes) → bytes4` (external)





### `getFeesForDeposit(uint256 assetAmount) → uint256 protocolFee` (external)

/ @notice Calculates the amount of Fees to be paid for a specific deposit amount




### `baseParticleMass(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

/ @notice Gets the Amount of Asset Tokens that have been Deposited into the Particle
representing the Mass of the Particle.




### `currentParticleCharge(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

/ @notice Gets the amount of Interest that the Particle has generated representing
the Charge of the Particle




### `currentParticleKinetics(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256` (external)

/ @notice Gets the amount of LP Tokens that the Particle has generated representing
the Kinetics of the Particle




### `currentParticleCovalentBonds(address contractAddress, uint256 tokenId, string basketManagerId) → uint256` (external)

/ @notice Gets the total amount of ERC721 Tokens that the Particle holds




### `energizeParticle(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, address referrer) → uint256 yieldTokensAmount` (external)

/ @notice Fund Particle with Asset Token
   Must be called by the account providing the Asset
   Account must Approve THIS contract as Operator of Asset

NOTE: DO NOT Energize an ERC20 Token, as anyone who holds any amount
      of the same ERC20 token could discharge or release the funds.
      All holders of the ERC20 token would essentially be owners of the Charged Particle.





### `dischargeParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Allows the owner or operator of the Token to collect or transfer the interest generated
        from the token without removing the underlying Asset that is held within the token.




### `dischargeParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Allows the owner or operator of the Token to collect or transfer a specific amount of the interest
        generated from the token without removing the underlying Asset that is held within the token.




### `dischargeParticleForCreator(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 receiverAmount` (external)

/ @notice Allows the Creator of the Token to collect or transfer a their portion of the interest (if any)
        generated from the token without removing the underlying Asset that is held within the token.




### `releaseParticle(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Releases the Full amount of Asset + Interest held within the Particle by LP of the Assets




### `releaseParticleAmount(address receiver, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount) → uint256 creatorAmount, uint256 receiverAmount` (external)

/ @notice Releases a partial amount of Asset + Interest held within the Particle by LP of the Assets




### `covalentBond(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)

/ @notice Deposit other NFT Assets into the Particle
   Must be called by the account providing the Asset
   Account must Approve THIS contract as Operator of Asset





### `breakCovalentBond(address receiver, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool success` (external)

/ @notice Release NFT Assets from the Particle




### `setChargedSettings(address settingsController)` (external)

/ @dev Setup the Charged-Settings Controller



### `setChargedState(address stateController)` (external)

/ @dev Setup the Charged-State Controller



### `setUniverse(address universe)` (external)

/ @dev Setup the Universal Controller



### `setLeptonToken(address token)` (external)





### `setTrustedForwarder(address _trustedForwarder)` (external)





### `setDepositFee(uint256 fee)` (external)

/ @dev Setup the Base Deposit Fee for the Protocol



### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `_validateDeposit(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount)` (internal)

/ @dev Validates a Deposit according to the rules set by the Token Contract




### `_validateDepositAmount(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, uint256 depositCap, uint256 depositMin, uint256 depositMax)` (internal)

/ @dev Validates a Deposit-Amount according to the rules set by the Token Contract




### `_validateNftDeposit(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId)` (internal)

/ @dev Validates an NFT Deposit according to the rules set by the Token Contract




### `_validateDischarge(address contractAddress, uint256 tokenId)` (internal)





### `_validateRelease(address contractAddress, uint256 tokenId)` (internal)





### `_validateBreakBond(address contractAddress, uint256 tokenId)` (internal)





### `_validateState(bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry)` (internal)





### `_depositIntoWalletManager(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, uint256 feeAmount) → uint256` (internal)

/ @dev Deposit Asset Tokens into an NFT via the Wallet Manager




### `_depositIntoBasketManager(address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId) → bool` (internal)

/ @dev Deposit NFT Tokens into the Basket Manager




### `_getFeesForDeposit(uint256 assetAmount) → uint256 protocolFee` (internal)




Calculates the amount of Fees to be paid for a specific deposit amount
  Fees are calculated in Interest-Token as they are the type collected for Fees


### `_collectAssetToken(address from, address tokenAddress, uint256 tokenAmount) → uint256 protocolFee` (internal)

/ @dev Collects the Required ERC20 Token(s) from the users wallet
  Be sure to Approve this Contract to transfer your Token(s)




### `_collectNftToken(address from, address nftTokenAddress, uint256 nftTokenId)` (internal)

/ @dev Collects the Required ERC721 Token(s) from the users wallet
  Be sure to Approve this Contract to transfer your Token(s)




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




