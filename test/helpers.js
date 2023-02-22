const {
    ethers,
    network,
    getNamedAccounts,
    getChainId,
  } = require('hardhat');

  const {
    getDeployData,
  } = require('../js-helpers/deploy');
  

const getChargedContracts = async() => {
  const chainId = await getChainId();
  // Connect to Internal Contracts
  const Universe = await ethers.getContractFactory('Universe');
  const ChargedState = await ethers.getContractFactory('ChargedState');
  const ChargedSettings = await ethers.getContractFactory('ChargedSettings');
  const ChargedManagers = await ethers.getContractFactory('ChargedManagers');
  const ChargedParticles = await ethers.getContractFactory('ChargedParticles');
  const ProtonC = await ethers.getContractFactory('ProtonC');

  return (
    {
      universe: Universe.attach(getDeployData('Universe', chainId).address),
      chargedState: ChargedState.attach(getDeployData('ChargedState', chainId).address),
      chargedSettings: ChargedSettings.attach(getDeployData('ChargedSettings', chainId).address),
      chargedManagers: ChargedManagers.attach(getDeployData('ChargedManagers', chainId).address),
      chargedParticles: ChargedParticles.attach(getDeployData('ChargedParticles', chainId).address),
      protonC: ProtonC.attach(getDeployData('ProtonC', chainId).address),
    }
  );
};

module.exports = {
  getChargedContracts,
}