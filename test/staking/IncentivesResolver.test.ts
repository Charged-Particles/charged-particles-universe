const { expect } = require('chai');

const {
  ethers,
  network,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
  presets,
  getIonxDistributionAmount,
  getLiquidityDistributionAmount,
} = require('../../js-helpers/deploy');

const BN = ethers.BigNumber;
const formatUnits = ethers.utils.formatUnits;
const {
    toWei,
    toBN,
    bn,
    tokensBN,
  } = require('../../js-helpers/utils');

describe('Incentives Resolver', function () {
    let yieldFarmLP, yieldFarmIonx;
    let staking;
    let incentivesResolver;
    let communityVault, communityVaultAddr;
    let ionxToken, stakeToken;

    let deployer, owner, user, user2;
    let deployerAddr, ownerAddr, userAddr, user2Addr;

    let chainId;
    let startAmount,startAmountIonx;
    let startAmountBn, startAmountIonxBn;
    let deprecation;
    let deprecationBn;
    let snapshotId;
    let epochDuration;
    let NR_OF_EPOCHS;

    let epoch1Start;

    //https://en.wikipedia.org/wiki/1_%2B_2_%2B_3_%2B_4_%2B_%E2%8B%AF
    let distributedAmount, distributedAmountIonx;

    let amount;

    beforeEach(async function () {

        chainId = await getChainId();
        const incentives = presets.Incentives[chainId];

        startAmount = incentives.lpTokens.startAmount;
        startAmountBn = incentives.lpTokens.startAmount.mul(ethers.BigNumber.from(10).pow(18));

        startAmountIonx = incentives.ionxToken.startAmount;
        startAmountIonxBn = incentives.ionxToken.startAmount.mul(ethers.BigNumber.from(10).pow(18));

        deprecation = incentives.ionxToken.deprecation;
        deprecationBn = incentives.ionxToken.deprecation.mul(ethers.BigNumber.from(10).pow(18));
        epochDuration = incentives.staking.epochDuration;
        NR_OF_EPOCHS = incentives.ionxToken.nrOfEpochs;

        //https://en.wikipedia.org/wiki/1_%2B_2_%2B_3_%2B_4_%2B_%E2%8B%AF
        distributedAmount = getLiquidityDistributionAmount(chainId);
        distributedAmountIonx = getIonxDistributionAmount(chainId);

        // console.log({
        //     startAmount: ethers.utils.formatUnits(startAmountBn),
        //     startAmountIonx: ethers.utils.formatUnits(startAmountIonxBn),
        //     distributedAmount:distributedAmount.toString(),
        //     distributedAmountIonx: distributedAmountIonx.toString(),
        //     distributedAmountNorm: ethers.utils.formatUnits(distributedAmount),
        //     distributedAmountNormIonx: ethers.utils.formatUnits(distributedAmountIonx),
        // })

        amount = ethers.BigNumber.from(33).mul(ethers.BigNumber.from(10).pow(18));

        const namedAccts = (await getNamedAccounts());

        deployerAddr = namedAccts.deployer;
        deployer = ethers.provider.getSigner(deployerAddr);

        ownerAddr = namedAccts.protocolOwner;
        owner = ethers.provider.getSigner(ownerAddr);

        userAddr = namedAccts.user1;
        user = ethers.provider.getSigner(userAddr);

        user2Addr = namedAccts.user2;
        user2 = ethers.provider.getSigner(user2Addr);

        snapshotId = await ethers.provider.send('evm_snapshot');


        const Staking = await ethers.getContractFactory('Staking', deployer);

     epoch1Start = (await getCurrentUnix()) + 1000;
        staking = await Staking.deploy(epoch1Start, epochDuration);
        await staking.deployed();

 
        const Ionx = await ethers.getContractFactory('Ionx');
        const CommunityVault = await ethers.getContractFactory('CommunityVault');

        ionxToken = await Ionx.deploy(); // Fresh Ionx
        await ionxToken.deployed();
        stakeToken = await Ionx.deploy(); // Fresh stake
        await stakeToken.deployed();
        await ionxToken.setMinter(ownerAddr);
        await stakeToken.setMinter(ownerAddr);


        // Mint to owner
        await ionxToken.connect(owner).mint(ownerAddr, distributedAmountIonx);
        await ionxToken.connect(owner).mint(ownerAddr, distributedAmount);

        await stakeToken.connect(owner).mint(ownerAddr, distributedAmount);

        communityVault = await CommunityVault.deploy(ionxToken.address);
        communityVaultAddr = communityVault.address;


        const YieldFarm = await ethers.getContractFactory('YieldFarm');
        yieldFarmLP = await YieldFarm.deploy(
            ionxToken.address,
            stakeToken.address,
            staking.address,
            communityVaultAddr,
            startAmountBn,
            deprecationBn,
            NR_OF_EPOCHS
        );

        yieldFarmIonx = await YieldFarm.deploy(
            ionxToken.address,
            ionxToken.address,
            staking.address,
            communityVaultAddr,
            startAmountIonxBn,
            deprecationBn,
            NR_OF_EPOCHS
        );

        // Dispatch to Community Vault
        await ionxToken.connect(owner).transfer(communityVaultAddr, distributedAmountIonx);
        await ionxToken.connect(owner).transfer(communityVaultAddr, distributedAmount);
        await communityVault.connect(deployer).setAllowance(yieldFarmLP.address, distributedAmount);
        await communityVault.connect(deployer).setAllowance(yieldFarmIonx.address, distributedAmountIonx);

   
        // Setup Incentives Resolver
        const IncentivesResolverContract = await ethers.getContractFactory('IncentivesResolver', deployer);
        incentivesResolver  = await IncentivesResolverContract.deploy(ionxToken.address,stakeToken.address,staking.address,yieldFarmIonx.address,yieldFarmLP.address)
        await incentivesResolver.deployed();
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId]);
    })

    describe('General Contract checks', function () {
        it('Should be deployed', async function () {
            expect(staking.address).to.not.equal(0);
            expect(yieldFarmLP.address).to.not.equal(0);
            expect(yieldFarmIonx.address).to.not.equal(0);
            expect(ionxToken.address).to.not.equal(0);
            expect(incentivesResolver.address).to.not.equal(0);
        })
    })

    describe('checker() tests', function () {
        it('Should initialize', async function () {
            
        })
    })




    async function getCurrentUnix () {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false]);
        return parseInt(block.timestamp);
    }

    async function setNextBlockTimestamp (timestamp) {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false]);
        const currentTs = block.timestamp;
        const diff = timestamp - currentTs;
        // console.log(`Increasing by ${diff}`);
        await ethers.provider.send('evm_increaseTime', [diff]);
    }

    async function moveAtStakingEpoch (epoch) {
        await setNextBlockTimestamp(epoch1Start + epochDuration * epoch);
        await ethers.provider.send('evm_mine');
    }

    async function depositUniV2Token (x, u = user) {
        const ua = await u.getAddress();
        await stakeToken.connect(owner).transfer(ua, x);
        await stakeToken.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(stakeToken.address, x);
    }

    async function depositIonxToken (x, u = user) {

        // Minted from Deployer to u address
        const ua = await u.getAddress();

        const balance2 = await ionxToken.balanceOf(ua);
        console.log(`ua Funds:`,`${ethers.utils.formatUnits(balance2)} IONX`);

        const o = await ionxToken.balanceOf(ownerAddr);
        console.log(`Owner Funds:`,`${ethers.utils.formatUnits(o)} IONX`);

        const d = await ionxToken.balanceOf(deployerAddr);
        console.log(`Deployer Funds:`,`${ethers.utils.formatUnits(d)} IONX`);


        const b = await ionxToken.balanceOf(communityVault.address);
        console.log(`Vault Funds:`,`${ethers.utils.formatUnits(b)} IONX`);

        await ionxToken.connect(owner).mint(ua, x);

        const balance3 = await ionxToken.balanceOf(ua);
        console.log(`ua Funds:`,`${ethers.utils.formatUnits(balance3)} IONX`);

        await ionxToken.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(ionxToken.address, x);
    }

    function calculateEpochAmount(epochId) {
        return startAmountBn.sub(deprecationBn.mul(epochId));
    }
})
