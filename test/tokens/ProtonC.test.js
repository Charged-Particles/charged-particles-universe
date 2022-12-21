const { expect } = require("chai");

describe('ProtonC', () => {
  let protonC, signers, signer, user1;

  beforeEach(async () => {
    const ProtonC = await hre.ethers.getContractFactory("ProtonC");

    protonC = await ProtonC.deploy();
    signer = await hre.ethers.getSigner();
    signers = await hre.ethers.getSigners();
    user1 = signers[1];
  });

  it.only ('Should deploy', async () => {
    expect(await soul.name()).to.equal('ProtonB')
  });
});