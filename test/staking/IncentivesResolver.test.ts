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

        distributedAmount = getLiquidityDistributionAmount(chainId);
        distributedAmountIonx = getIonxDistributionAmount(chainId);

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
        it('No actions from users', async function () {
            let [canExec, payload] = await incentivesResolver.checker();
            expect(canExec).to.be.equal(false);
            await moveAtAbsoluteEpoch(1);

            console.log(`EPCH:  `,await staking.getCurrentEpoch(),payload);
            console.log(`STK epoch 0 init:`,await staking.epochIsInitialized(ionxToken.address, 0));

            [canExec, payload] = await incentivesResolver.checker();
            expect(canExec).to.be.equal(false);

            await moveAtAbsoluteEpoch(2);

            // No action for 2 stk epochs, n-1 not initialized, impossible
            // to deposit
            // await depositIonxToken(100) // Would revert.
            
            [canExec, payload] = await incentivesResolver.checker();
            console.log(`EPCH:  `,await staking.getCurrentEpoch(),payload);
            expect(canExec).to.be.equal(true);

           // expect(payload).to.be.equal("0x3da9dea600000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001");
            // Let's execute the payload.
            [canExec, payload] = await incentivesResolver.checker();
            const returnData = await ethers.provider.call({
                to: incentivesResolver.address,
                data: payload // 
            });
            
            console.log(`Call resolved: ${returnData}`);
            await incentivesResolver.doEpochInit(BN.from(2),false, false, true, true); // works
            // await incentivesResolver.retroInit(1,ionxToken.address); // works

            await fastForwardBlocks(1); // Must be resolved now
            console.log(`STK epoch 0 init:`,await staking.epochIsInitialized(ionxToken.address, 0));

            console.log(`STK epoch 1 init:`,await staking.epochIsInitialized(ionxToken.address, 1));

            [canExec, payload] = await incentivesResolver.checker();
            console.log(`EPCH : `,await staking.getCurrentEpoch(),payload);
            expect(canExec).to.be.equal(false);
         
            await depositIonxToken(100); // Should succeed.

            // await moveAtAbsoluteEpoch(3);
            // [canExec, payload] = await incentivesResolver.checker();
            // console.log(`EPCH:  `,await staking.getCurrentEpoch(),payload);
            // expect(canExec).to.be.equal(true);
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

    async function moveAtAbsoluteEpoch (epoch) {
        let timestamp = epoch1Start + epochDuration * epoch;
        if (epoch <=  0) timestamp == epoch1Start - 1;
        await setNextBlockTimestamp(epoch1Start + epochDuration *(epoch-1));
        await ethers.provider.send('evm_mine');
    }

    async function fastForwardBlocks (blocks) {
        for (let index = 0; index < blocks; index++) {
          await ethers.provider.send("evm_mine", [])
        }
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
