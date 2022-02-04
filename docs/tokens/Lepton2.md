## `Lepton2`





### `whenNotMigrated()`





### `whenNotPaused()`






### `mintLepton() → uint256 newTokenId` (external)





### `batchMintLepton(uint256 count)` (external)





### `totalSupply() → uint256` (public)





### `maxSupply() → uint256` (external)





### `getNextType() → uint256` (external)





### `getNextPrice() → uint256` (external)





### `getMultiplier(uint256 tokenId) → uint256` (external)





### `getBonus(uint256 tokenId) → uint256` (external)





### `tokenURI(uint256 tokenId) → string` (public)





### `addLeptonType(string tokenUri, uint256 price, uint32 supply, uint32 multiplier, uint32 bonus)` (external)





### `updateLeptonType(uint256 leptonIndex, string tokenUri, uint256 price, uint32 supply, uint32 multiplier, uint32 bonus)` (external)





### `setMaxMintPerTx(uint256 maxAmount)` (external)





### `setPausedState(bool state)` (external)





### `withdrawEther(address payable receiver, uint256 amount)` (external)





### `withdrawErc20(address payable receiver, address tokenAddress, uint256 amount)` (external)





### `withdrawERC721(address payable receiver, address tokenAddress, uint256 tokenId)` (external)





### `migrateAccounts(address oldLeptonContract, uint256 count)` (external)





### `_getLepton(uint256 tokenId) → struct ILepton.Classification` (internal)





### `_mintLepton(address receiver) → uint256 newTokenId` (internal)





### `_batchMintLepton(address receiver, uint256 count)` (internal)





### `_refundOverpayment(uint256 threshold)` (internal)





### `_finalizeMigration()` (internal)






