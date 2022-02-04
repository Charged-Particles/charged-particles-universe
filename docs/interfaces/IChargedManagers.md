## `IChargedManagers`

Interface for Charged Wallet-Managers




### `isContractOwner(address contractAddress, address account) → bool` (external)





### `isWalletManagerEnabled(string walletManagerId) → bool` (external)





### `getWalletManager(string walletManagerId) → contract IWalletManager` (external)





### `isNftBasketEnabled(string basketId) → bool` (external)





### `getBasketManager(string basketId) → contract IBasketManager` (external)





### `validateDeposit(address sender, address contractAddress, uint256 tokenId, string walletManagerId, address assetToken, uint256 assetAmount)` (external)





### `validateNftDeposit(address sender, address contractAddress, uint256 tokenId, string basketManagerId, address nftTokenAddress, uint256 nftTokenId)` (external)





### `validateDischarge(address sender, address contractAddress, uint256 tokenId)` (external)





### `validateRelease(address sender, address contractAddress, uint256 tokenId)` (external)





### `validateBreakBond(address sender, address contractAddress, uint256 tokenId)` (external)






### `Initialized(address initiator)`





### `ControllerSet(address controllerAddress, string controllerId)`





### `WalletManagerRegistered(string walletManagerId, address walletManager)`





### `BasketManagerRegistered(string basketId, address basketManager)`





