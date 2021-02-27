const {
    ethers,
    getNamedAccounts,
    getChainId,
  } = require("hardhat");
  
  const {
    getDeployData,
    toWei,
  } = require("../js-helpers/deploy");
  
  const { expect } = require("chai");
  
  describe("Treasury", () => {
    let chainId;
    let treasury;
    let deployer;
    let user1;
    let signerD;
    let signer1;
  
    beforeEach(async () => {
      chainId = await getChainId(); // chainIdByName(network.name);
  
      const namedAccts = (await getNamedAccounts());
      deployer = namedAccts.deployer
      user1 = namedAccts.user1;
      signerD = ethers.provider.getSigner(deployer);
      signer1 = ethers.provider.getSigner(user1);
  
      // Connect to Internal Contracts
      const Treasury = await ethers.getContractFactory("Treasury");
      treasury = Treasury.attach(getDeployData("Treasury", chainId).address);
    });
  
    it("should allow sending ETH into the contract and retrieving it by the owner", async () => {
        expect(await signer1.sendTransaction({to: treasury.address, value: toWei("10")})).to.emit(treasury, "TreasuryDeposit").withArgs(toWei("10"));
        expect(await treasury.connect(signerD).withdrawEther(user1, toWei("10"))).to.changeEtherBalance(signer1, toWei("10"));
    });

});
  