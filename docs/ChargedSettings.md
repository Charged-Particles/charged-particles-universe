# ChargedSettings

 > Charged Particles Settings Contract. Used to view and update rules for how the Charged Particles contract functions. Using this contract is not necessary for interfacing with the Charged Particles protocol -- any token can be charged using the default settings for Charged Particles by interacting with the Charged Particles contract on its own.

## Get Contract Settings

#### isContractOwner

Checks if an Account is the Owner of an NFT Contract. When Custom Contracts are registered, only the "owner" or operator of the Contract is allowed to register them and define custom rules for how their tokens are "Charged". Otherwise, any token can be "Charged" according to the default rules of Charged Particles.

`function isContractOwner(address contractAddress, address account) external view override virtual returns (bool);`

| Parameter / Return Value  | Description                                                        |
|---------------------------|--------------------------------------------------------------------|
| contractAddress           | address of external NFT contract to configure                      |
| account                   | if set, will only allow deposits from allowed asset tokens         |
| return                    | true if the account is the Owner of the contract                   |

#### isWalletManagerEnabled

Returns true or false depending on whether or not wallet manager is enabled.

`function isWalletManagerEnabled(string calldata walletManagerId) external virtual override view returns (bool);`

| Parameter / Return Value  | Description                       |
|---------------------------|-----------------------------------|
| walletManagerId           | id of wallet manager to check     |
| return                    | True if enabled                   |

#### getWalletManager

Gets interface for wallet manager contract.

`getWalletManager(string calldata walletManagerId) external virtual override view returns (contract IWalletManager);` 

| Parameter / Return Value  | Description                               |
|---------------------------|-------------------------------------------|
| walletManagerId           | id of wallet manager to check             |
| IWalletManager            | interface of wallet manager contract      |

#### isNftBasketEnabled

Returns true or false depending on whether or not basket manager is enabled.

`function isNftBasketEnabled(string calldata basketId) external virtual override view returns (bool);`

| Parameter / Return Value  | Description                       |
|---------------------------|-----------------------------------|
| basketManagerId           | id of basket manager to check     |
| return                    | True if enabled                   |

#### getBasketManager

Gets the interface of the Basket Manager.

`getBasketManager(string calldata basketId) external virtual override view returns (contract IWalletManager);` 

| Parameter / Return Value  | Description                               |
|---------------------------|-------------------------------------------|
| basketManagerId           | id of basket manager to check             |
| IBasketManager            | interface of basket manager contract      |

#### getCreatorAnnuities

Gets the amount of creator annuities reserved for the creator for the specified NFT.

```
getCreatorAnnuities(
  address contractAddress,
  uint256 tokenId
) external view override virutal returns (address creator, uint256 annuityPct);
```

| Parameter / Return Value  | Description                                          |
|---------------------------|------------------------------------------------------|
| contractAddress           | The Address to the Contract of the NFT               |
| tokenId                   | The tokenId of the NFT                               |
| creator                   | The creator's address                                |
| annuityPct                | The percentage of annuities reserved for the creator |


#### getCreatorAnnuitiesRedirect

Gets address that creator annuties are being redirected to.

```
function getCreatorAnnuitiesRedirect(
  address contractAddress,
  uint256 tokenId
) external view override virtual returns (address address);
```

| Parameter / Return Value  | Description                                            |
|---------------------------|--------------------------------------------------------|
| contractAddress           | The Address to the Contract of the NFT                 |
| tokenId                   | The tokenId of the NFT                                 |
| address                   | address of account where annuities are being redirected|

#### getTempLockExpiryBlocks

Gets the temporary time lock expiry blocks.

`function getTempLockExpiryBlocks() external view override virtual returns (uint256);`

| Parameter / Return Value  | Description   |
|---------------------------|---------------|
| return                    | expiry blocks |


#### getTimelockApprovals

Gets the approvals for time locks.

```function getTimelockApprovals(address operator) external view override virutal returns (bool timelockAny, bool timelockOwn);``

| Parameter / Return Value  | Description                                                             |
|---------------------------|-------------------------------------------------------------------------|
| operator                  | operator of contract                                                    |
| timelockAny               | whether or not operator can time lock any NFT on behalf of user         |
| timelockOwn               | whether or not operator can time lock their own NFTS on behalf of users |


#### getAssetRequirements

Get requirements for an asset token. Aave, Compound, etc. have requirements for tokens. This function returns the requirements for those tokens.

```
function getAssetRequirements(
  address contractAddress, 
  address assetToken
) external view override virtual
  returns (
    string memory requiredWalletManager,
    bool energizeEnabled,
    bool restrictedAssets,
    bool validAsset,
    uint256 depositCap,
    uint256 depositMin,
    uint256 depositMax
  );
```

| Parameter / Return Value  | Description                                          |
|---------------------------|------------------------------------------------------|
| contractAddress           | address of contract                                  |
| assetToken                | address of asset token to get requirements for       |
| requiredWalletManager     | wallet manager required for asset token              |
| energizeEnabled           | whether or not energizing is enabled for asset token |
| restrictedAssets          | whether or not asset token is a restricted asset     |
| validAsset                | whether or not asset token is a valid asset          |
| depositCap                | cap on deposit amount for asset token                |
| depositMin                | minimum deposit amount for asset token               |
| depositMax                | maximum deposit amount for asset token               |

#### getNftAssetRequirements

Get requirements relating to if / how many NFTs can be deposited into a particle.

```
function getNftAssetRequirements(
  address contractAddress,
  address nftTokenAddress
) external view override virtual
  returns (
    string requiredBasketManager,
    bool basketEnabled,
    uint256 maxNfts
  );
```

| Parameter / Return Value  | Description                                              |
|---------------------------|----------------------------------------------------------|
| contractAddress           | address of Particle contract                             |
| nftTokenAddress           | address of NFT token                                     |
| requiredBasketManager     | basket manager                                           |
| basketEnabled             | whether or not depositing NFTs into Particles is enabled |
| maxNfts                   | maxNfts that can be desposited into a Particle           |

#### setCreatorAnnuities

Sets the Custom Configuration for Creators of Proton-based NFTs.

```
function setCreatorAnnuities(
  address contractAddress,
  uint256 tokenId,
  address creator,
  uint256 annuityPercent
) external virtual override;
```

| Parameter / Return Value  | Description                                                     |
|---------------------------|-----------------------------------------------------------------|
| contractAddress           | address of Particle contract                                    |
| tokenId                   | id of Particle                                                  |
| creator                   | address of creator                                              |
| annuityPercent            | percentage of Particle's charge (interest) creator will receive |

#### setCreatorAnnuitiesRedirect

Sets a Custom Receiver Address for the Creator Annuities.

```
setCreatorAnnuitiesRedirect(
  address contractAddress,
  uint256 tokenId,
  address creator,
  address receiver
) external virtual override;
```

| Parameter / Return Value  | Description                                  |
|---------------------------|----------------------------------------------|
| contractAddress           | address of Particle contract                 |
| tokenId                   | id of Particle                               |
| creator                   | address of creator                           |
| receiver                  | address that annuities will be redirected to |


## Register (Set) Contract Settings

> _for external contract integration_

#### setRequiredWalletManager

Sets a Required Wallet-Manager for External NFT Contracts (otherwise set to "none" to allow any Wallet-Manager).

```
function setRequiredWalletManager(
  address contractAddress,
  string walletManager
) external virtual override onlyValidExternalContract(contractAddress) onlyContractOwnerOrAdmin(contractAddress, msg.sender);
``` 

| Parameter / Return Value  | Description                                                        |
|---------------------------|--------------------------------------------------------------------|
| contractAddress           | address of external NFT contract to configure                      |
| walletManager             | if set, will only allow deposits from this specific wallet-manager |

#### setRequiredBasketManager

Sets a Required Basket-Manager for External NFT Contracts (otherwise set to "none" to allow any Basket-Manager).

```
function setRequiredBasketManager(
  address contractAddress,
  string calldata basketManager
) external virtual override onlyValidExternalContract(contractAddress) onlyContractOwnerOrAdmin(contractAddress, msg.sender);
```

| Parameter / Return Value  | Description                                                        |
|---------------------------|--------------------------------------------------------------------|
| contractAddress           | address of external NFT contract to configure                      |
| walletManager             | if set, will only allow deposits from this specific wallet-manager |

#### setAssetTokenRestrictions

Enables or Disables Asset-Token Restrictions for External NFT Contracts.

```
function setAssetTokenRestrictions(
  address contractAddress,
  bool restrictionsEnabled
) external virtual override onlyValidExternalContract(contractAddress) onlyContractOwnerOrAdmin(contractAddress, msg.sender);
```

| Parameter / Return Value  | Description                                                        |
|---------------------------|--------------------------------------------------------------------|
| contractAddress           | address of external NFT contract to configure                      |
| walletManager             | if set, will only allow deposits from allowed asset tokens         |

#### setAllowedAssetToken

Enables or Disables Allowed Asset Tokens for External NFT Contracts.

| Parameter / Return Value  | Description                                                        |
|---------------------------|--------------------------------------------------------------------|
| contractAddress           | address of external NFT contract to configure                      |
| walletManager             | if set, will only allow deposits from allowed asset tokens         |

#### setAssetTokenLimits

Sets the Custom Configuration for External Contracts.

```
function setAssetTokenLimits(
  address contractAddress,
  address assetToken,
  uint256 depositMin,
  uint256 depositMax
) external virtual override onlyValidExternalContract(contractAddress) onlyContractOwnerOrAdmin(contractAddress, msg.sender); 

```

| Parameter / Return Value  | Description                                                        |
|---------------------------|--------------------------------------------------------------------|
| contractAddress           | address of external NFT contract to configure                      |
| assetToken                | address of asset token to set limits for (e.g. DAI)                |
| depositMin                | if set, will define the minimum amount of Asset tokens the NFT may hold, otherwise any amount                |
| depositMax                | if set, will define the maximum amount of Asset tokens the NFT may hold, otherwise any amount                |


#### setMaxNfts

Sets the Max Number of NFTs that can be held by a Charged Particle NFT.

```
function setMaxNfts(
  address contractAddress,
  address nftTokenAddress,
  uint256 maxNfts
) external virtual override onlyValidExternalContract(contractAddress) onlyContractOwnerOrAdmin(contractAddress, msg.sender);
```

| Parameter / Return Value  | Description                                    |
|---------------------------|------------------------------------------------|
| contractAddress           | address of external NFT contract to configure  |
| nftTokenAddress           | address of the NFT token to set a maximum for  |
| maxNfts                   | maximum number of NFTs a Particle can hold     |
