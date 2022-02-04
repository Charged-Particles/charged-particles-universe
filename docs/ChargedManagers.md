## `ChargedManagers`

Charged Particles Wallet-Managers Contract




### `initialize(address initiator)` (public)





### `isContractOwner(address contractAddress, address account) → bool` (external)

Checks if an Account is the Owner of an NFT Contract
   When Custom Contracts are registered, only the "owner" or operator of the Contract
   is allowed to register them and define custom rules for how their tokens are "Charged".
   Otherwise, any token can be "Charged" according to the default rules of Charged Particles.




### `isWalletManagerEnabled(string walletManagerId) → bool` (external)





### `getWalletManager(string walletManagerId) → contract IWalletManager` (external)





### `isNftBasketEnabled(string basketId) → bool` (external)





### `getBasketManager(string basketId) → contract IBasketManager` (external)





### `validateDeposit(address sender, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount)` (external)



Validates a Deposit according to the rules set by the Token Contract


### `validateNftDeposit(address sender, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId)` (external)



Validates an NFT Deposit according to the rules set by the Token Contract


### `validateDischarge(address sender, address contractAddress, uint256 tokenId)` (external)





### `validateRelease(address sender, address contractAddress, uint256 tokenId)` (external)





### `validateBreakBond(address sender, address contractAddress, uint256 tokenId)` (external)





### `setController(address controller, string controllerId)` (external)



Setup the various Charged-Controllers

### `registerWalletManager(string walletManagerId, address walletManager)` (external)



Register Contracts as wallet managers with a unique liquidity provider ID

### `registerBasketManager(string basketId, address basketManager)` (external)



Register Contracts as basket managers with a unique basket ID

### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `withdrawERC1155(address payable receiver, address tokenAddress, uint256 tokenId, uint256 amount)` (external)





### `_isWalletManagerEnabled(string walletManagerId) → bool` (internal)



See {ChargedParticles-isWalletManagerEnabled}.

### `_isNftBasketEnabled(string basketId) → bool` (internal)



See {ChargedParticles-isNftBasketEnabled}.

### `_validateDeposit(address sender, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount)` (internal)



Validates a Deposit according to the rules set by the Token Contract


### `_validateDepositAmount(address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount, uint256 depositCap, uint256 depositMin, uint256 depositMax)` (internal)



Validates a Deposit-Amount according to the rules set by the Token Contract


### `_validateNftDeposit(address sender, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId)` (internal)



Validates an NFT Deposit according to the rules set by the Token Contract


### `_validateDischarge(address sender, address contractAddress, uint256 tokenId)` (internal)





### `_validateRelease(address sender, address contractAddress, uint256 tokenId)` (internal)





### `_validateBreakBond(address sender, address contractAddress, uint256 tokenId)` (internal)





### `_validateState(bool allowFromAll, bool isApproved, uint256 timelock, uint256 tempLockExpiry)` (internal)






