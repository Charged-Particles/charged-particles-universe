
# Charged Particles

## Protocol Contracts:

- contracts/
  - ChargedParticles.sol -  **(Upgradeable)**
  - ChargedSettings.sol
  - ChargedState.sol
  - yield/
    - aave/
      - v2/
        - AaveBridgeV2.sol
      - AaveWalletManager.sol
      - AaveSmartWallet.sol
    - generic/
      - erc20/
        - GenericWalletManager.sol
        - GenericSmartWallet.sol
      - erc721/
        - GenericBasketManager.sol
        - GenericSmartBasket.sol
  - lib/
    - BlackholePrevention.sol
    - ERC721.sol
    - NftTokenType.sol
    - SmartWalletBase.sol
    - TokenInfo.sol
    - WalletManagerBase.sol

---

## Token Contracts:

- contracts/
  - tokens/
    - Ion.sol
    - Proton.sol
    - Lepton2.sol


---

# Primary Entry Points

## Read:

- ChargedParticles.sol
  - baseParticleMass(...)
  - currentParticleCharge(...)
  - currentParticleKinetics(...)
  - currentParticleCovalentBonds(...)
- Proton.sol
  - creatorOf(...)
  - getSalePrice(...)
  - getLastSellPrice(...)
  - getCreatorRoyalties(...)
  - getCreatorRoyaltiesPct(...)
  - getCreatorRoyaltiesReceiver(...)


## Write:

- ChargedParticles.sol
  - energizeParticle(...)
  - dischargeParticle(...)
  - dischargeParticleAmount(...)
  - dischargeParticleForCreator(...)
  - releaseParticle(...)
  - releaseParticleAmount(...)
  - covalentBond(...)
  - breakCovalentBond(...)
- Proton.sol
  - claimCreatorRoyalties(...)
  - createChargedParticle(...)
  - createBasicProton(...)
  - createProton(...)
  - createProtonForSale(...)
  - buyProton(...)
  - setSalePrice(...)
  - setRoyaltiesPct(...)
  - setCreatorRoyaltiesReceiver(...)
