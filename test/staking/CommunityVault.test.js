const { expect } = require('chai');

const {
  ethers,
  network,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
  presets
} = require('../../js-helpers/deploy');

describe('CommunityVault', function () {
    let chainId, snapshotId;
    let deployer, owner, user, communityVault;
    let deployerAddr, ownerAddr, userAddr, communityVaultAddr;
    let ionxToken;

    const distributedAmount = ethers.BigNumber.from(800000).mul(ethers.BigNumber.from(10).pow(18))

    beforeEach(async function () {
        chainId = await getChainId();
        snapshotId = await ethers.provider.send('evm_snapshot')

        const namedAccts = (await getNamedAccounts());
        deployerAddr = namedAccts.deployer
        deployer = ethers.provider.getSigner(deployerAddr);
        ownerAddr = namedAccts.protocolOwner
        owner = ethers.provider.getSigner(ownerAddr);
        userAddr = namedAccts.user1
        user = ethers.provider.getSigner(userAddr);

        const CommunityVault = await ethers.getContractFactory('CommunityVault')
        const Ionx = await ethers.getContractFactory('Ionx')

        // ionxToken = await Ionx.deploy(creator.address)
        ionxToken = Ionx.attach(getDeployData('Ionx', chainId).address).connect(owner);
        communityVault = await CommunityVault.deploy(ionxToken.address)
        communityVaultAddr = communityVault.address
    })
    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(communityVault.address).to.not.equal(0)
            expect(ionxToken.address).to.not.equal(0)
        })
    })

    describe('Contract Tests', function () {
        it('Mint IONX tokens in community vault address', async function () {
            await ionxToken.transfer(communityVaultAddr, distributedAmount)
            expect(await ionxToken.balanceOf(communityVaultAddr)).to.be.equal(distributedAmount)
        })

        it('should fail if no owner tries to set allowance', async function () {
            await expect(communityVault.connect(user).setAllowance(userAddr, distributedAmount)).to.be.revertedWith(
                'Ownable: caller is not the owner',
            )
        })

        it('should set allowance as owner', async function () {
            await ionxToken.transfer(communityVaultAddr, distributedAmount)
            await communityVault.connect(deployer).setAllowance(userAddr, distributedAmount)
            expect(await ionxToken.allowance(communityVaultAddr, userAddr)).to.be.equal(distributedAmount)
        })

        it('should transfer ownership', async function () {
            expect(await communityVault.owner()).to.be.equal(deployerAddr)
            await expect(communityVault.connect(deployer).transferOwnership(ownerAddr)).to.emit(
                communityVault, 'OwnershipTransferred')
            expect(await communityVault.owner()).to.be.equal(ownerAddr)
        })
    })

    describe('Events', function () {
        it('setAllowance emits SetAllowance', async function () {
            await ionxToken.transfer(communityVaultAddr, distributedAmount)
            await expect(communityVault.connect(deployer).setAllowance(userAddr, distributedAmount))
                .to.emit(communityVault, 'SetAllowance')
        })
    })
})
