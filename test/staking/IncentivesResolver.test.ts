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
        it('only deposit at 2', async function () {
            let [canExec, payload] = await incentivesResolver.checker();
            expect(canExec).to.be.equal(false);
            await moveAtAbsoluteEpoch(1);

            console.log(`EPCH:  `,await staking.getCurrentEpoch());

            let stake0state = await staking.epochIsInitialized(ionxToken.address, 0);
            let stake1state = await staking.epochIsInitialized(ionxToken.address, 1);

            console.log(`STK epoch 0 init:`,stake0state);
            console.log(`STK epoch 1 init:`,stake1state);
            
            expect(stake0state).to.equal(false);
            expect(stake1state).to.equal(false);


            // Should trigger same behavior than:
            // await incentivesResolver.doEpochInit(BN.from(1),false, false, true, true); // works
            // await incentivesResolver.retroInit(1,ionxToken.address); // works

            [canExec, payload] = await checkGelatoExecution();

            console.log(`STK epoch 0 init:`,await staking.epochIsInitialized(ionxToken.address, 0));
            console.log(`STK epoch 1 init:`,await staking.epochIsInitialized(ionxToken.address, 1));

            expect(canExec).to.be.equal(true);

            stake0state = await staking.epochIsInitialized(ionxToken.address, 0);
            stake1state = await staking.epochIsInitialized(ionxToken.address, 1);
            
            expect(stake0state).to.equal(true);
            expect(stake1state).to.equal(false);

            await moveAtAbsoluteEpoch(2);
            console.log(`EPCH:  `, await staking.getCurrentEpoch());

            [canExec, payload] = await checkGelatoExecution();
            console.log(`EPCH:  `,await staking.getCurrentEpoch());
            expect(canExec).to.be.equal(true);
         
            await fastForwardBlocks(1); // Must be resolved now

            stake0state = await staking.epochIsInitialized(ionxToken.address, 0);
            stake1state = await staking.epochIsInitialized(ionxToken.address, 1);
            
            expect(stake0state).to.equal(true);
            expect(stake1state).to.equal(true);

            [canExec, payload] = await checkGelatoExecution();
            console.log(`EPCH : `,await staking.getCurrentEpoch());
            expect(canExec).to.be.equal(false);
         
            await depositIonxToken(100); // Should succeed.
        })
        it('Deposit at 1 harvest 4 withdraw 6', async function () {

            let [canExec, payload] = await checkGelatoExecution();
            expect(canExec).to.be.equal(false);
            await moveAtAbsoluteEpoch(1);
            console.log(`EPCH: Moved at 1`);

            [canExec, payload] = await checkGelatoExecution();

 
            await depositIonxToken(100); // Should succeed.
            console.log(`Deposited at 1`);

            await moveAtAbsoluteEpoch(2);
            console.log(`EPCH: Moved at 2`);
            [canExec, payload] = await checkGelatoExecution();

            await moveAtAbsoluteEpoch(3);
            console.log(`EPCH: Moved at 3`);
            [canExec, payload] = await checkGelatoExecution();

            await moveAtAbsoluteEpoch(4);
            console.log(`EPCH: Moved at 4`);
            [canExec, payload] = await checkGelatoExecution();


            console.log(`STK epoch 0 init  :`,await staking.epochIsInitialized(ionxToken.address, 0));
            console.log(`STK epoch 1 init :`,await staking.epochIsInitialized(ionxToken.address, 1));
            console.log(`STK epoch 2 init :`,await staking.epochIsInitialized(ionxToken.address, 2));
            console.log(`STK epoch 3 init :`,await staking.epochIsInitialized(ionxToken.address, 3));
            console.log('---');
            console.log(`FRM IONX epoch:`,await yieldFarmIonx.lastInitializedEpoch());

            // Possible to mass harvest
            await yieldFarmIonx.connect(user).massHarvest();

            const balanceUser = await ionxToken.balanceOf(await user.getAddress());
            console.log(`After harvesting epoch [Epoch-${await staking.getCurrentEpoch()}], user balance: ${formatUnits(balanceUser)} IONX`);
            expect(balanceUser).to.be.gt(0);


            await moveAtAbsoluteEpoch(5);
            console.log(`EPCH: Moved at 5`);
            [canExec, payload] = await checkGelatoExecution();

            await moveAtAbsoluteEpoch(6);
            console.log(`EPCH: Moved at 6`);
            [canExec, payload] = await checkGelatoExecution();


            // Should be able to withdraw
            await staking.connect(user).withdraw(ionxToken.address, 100);

            await fastForwardBlocks(1); // Must be resolved now


            [canExec, payload] = await incentivesResolver.checker();
            expect(canExec).to.be.equal(false);
         
        })
        it('No exec needed if users activity on previous epoch', async function () {

            let [canExec, payload] = await checkGelatoExecution();
            expect(canExec).to.be.equal(false);
            await moveAtAbsoluteEpoch(1);
            console.log(`EPCH: Moved at 1`);

            [canExec, payload] = await checkGelatoExecution();
            expect(canExec).to.be.equal(true);


            await moveAtAbsoluteEpoch(2);
            console.log(`EPCH: Moved at 2`);

            [canExec, payload] = await checkGelatoExecution();
            expect(canExec).to.be.equal(true);


            // 2 Deposits + 2 Harvests
            await depositIonxToken(amount);
            await depositUniV2Token(amount);
            console.log(`Deposited at 2`);

            // await yieldFarmIonx.connect(user).massHarvest();
            // await yieldFarmLP.connect(user).massHarvest();

                
      
            await moveAtAbsoluteEpoch(3);
            console.log(`EPCH: Moved at 3`);

            console.log(`FRM IONX epoch:`,await yieldFarmIonx.lastInitializedEpoch(),' / ', await yieldFarmIonx.getCurrentEpoch());
            console.log(`FRM LP epoch:`,await yieldFarmLP.lastInitializedEpoch(),' / ', await yieldFarmLP.getCurrentEpoch());
            
            expect(canExec).to.be.equal(true);


            [canExec, payload] = await checkGelatoExecution();
            console.log('---');
            console.log(`FRM IONX epoch:`,await yieldFarmIonx.lastInitializedEpoch(),' / ', await yieldFarmIonx.getCurrentEpoch());
            console.log(`FRM LP epoch:`,await yieldFarmLP.lastInitializedEpoch(),' / ', await yieldFarmLP.getCurrentEpoch());


            // 2 Deposits + 2 Harvests
            await depositIonxToken(amount);
            await depositUniV2Token(amount);
            console.log(`Deposited at 3`);

            // Possible to mass harvest ionx
            await yieldFarmIonx.connect(user).massHarvest();

            let balanceUser = await ionxToken.balanceOf(await user.getAddress());
            console.log(`After harvesting epoch [Epoch-${await staking.getCurrentEpoch()}], user balance: ${formatUnits(balanceUser)} IONX`);
            expect(balanceUser).to.be.gt(0);

            // Possible to mass harvest LP
            await yieldFarmLP.connect(user).massHarvest();
            let balanceUser2 = await ionxToken.balanceOf(await user.getAddress());
            console.log(`After LP harvesting epoch [Epoch-${await staking.getCurrentEpoch()}], user balance: ${formatUnits(balanceUser2)} IONX`);
            expect(balanceUser2).to.be.gt(balanceUser);

            // Everything was done at previous epoch, Gelato
            // has no reason to trigger
            await moveAtAbsoluteEpoch(4);
            console.log(`EPCH: Moved at 4`);
            [canExec, payload] = await checkGelatoExecution();
            expect(canExec).to.be.equal(false);         
        })
    })


    async function checkGelatoExecution() {
        const [canExec, payload] = await incentivesResolver.checker();
            console.log(`[Gelato] canExec`,canExec,`Payload: ${payload}`);
            if (canExec) {
                await deployer.sendTransaction({
                    to: incentivesResolver.address,
                    data: payload
                });
            }
            return [canExec, payload];
    }


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
        // Minted from Deployer to u address
        const ua = await u.getAddress();

        const balance2 = await stakeToken.balanceOf(ua);
        console.log(`ua Funds:`,`${ethers.utils.formatUnits(balance2)} LP TOKEN`);

        const o = await stakeToken.balanceOf(ownerAddr);
        console.log(`Owner Funds:`,`${ethers.utils.formatUnits(o)} LP TOKEN`);

        const d = await stakeToken.balanceOf(deployerAddr);
        console.log(`Deployer Funds:`,`${ethers.utils.formatUnits(d)} LP TOKEN`);


        const b = await stakeToken.balanceOf(communityVault.address);
        console.log(`Vault Funds:`,`${ethers.utils.formatUnits(b)} LP TOKEN`);

        await stakeToken.connect(owner).mint(ua, BN.from(x));

        const balance3 = await stakeToken.balanceOf(ua);
        console.log(`ua Funds:`,`${ethers.utils.formatUnits(balance3)} LP TOKEN`);

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
