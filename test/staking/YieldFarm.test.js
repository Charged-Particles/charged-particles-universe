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

const {
    toWei,
    toBN,
    bn,
    tokensBN,
  } = require('../../js-helpers/utils');

describe('YieldFarm Pool', function () {
    let yieldFarmLP, yieldFarmIonx;
    let staking;
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

        staking = await Staking.deploy((await getCurrentUnix()) + 1000, epochDuration);
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

   })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId]);
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(staking.address).to.not.equal(0);
            expect(yieldFarmLP.address).to.not.equal(0);
            expect(yieldFarmIonx.address).to.not.equal(0);
            expect(ionxToken.address).to.not.equal(0);
        })

        it('Get epoch PoolSize and distribute tokens', async function () {
            await depositUniV2Token(amount)
            await moveAtEpoch(3)
            const totalAmount = amount

            expect(await yieldFarmLP.getPoolSize(1)).to.equal(totalAmount)
            expect(await yieldFarmLP.getEpochStake(userAddr, 1)).to.equal(totalAmount)
            expect(await ionxToken.allowance(communityVaultAddr, yieldFarmLP.address)).to.equal(distributedAmount)
            expect(await yieldFarmLP.getCurrentEpoch()).to.equal(2) // epoch on yield is staking - 1

            await yieldFarmLP.connect(user).harvest(1)
            const epochAmount = calculateEpochAmount(1)
            expect(await ionxToken.balanceOf(userAddr)).to.equal(epochAmount)
        })
    })

    describe('Contract Tests', function () {
        it('User harvest and mass Harvest', async function () {
            let epochAmount
            await depositUniV2Token(amount)
            const totalAmount = amount
            // initialize epochs meanwhile
            await moveAtEpoch(9)
            expect(await yieldFarmLP.getPoolSize(1)).to.equal(amount)

            expect(await yieldFarmLP.lastInitializedEpoch()).to.equal(0) // no epoch initialized
            await expect(yieldFarmLP.harvest(10)).to.be.revertedWith('YLD:E-306');
            await expect(yieldFarmLP.harvest(3)).to.be.revertedWith('YLD:E-204');
            await (await yieldFarmLP.connect(user).harvest(1)).wait()
            epochAmount = calculateEpochAmount(1)

            expect(await ionxToken.balanceOf(userAddr)).to.equal(
                amount.mul(epochAmount).div(totalAmount),
            )
            expect(await yieldFarmLP.connect(user).userLastEpochIdHarvested()).to.equal(1)
            expect(await yieldFarmLP.lastInitializedEpoch()).to.equal(1) // epoch 1 has been initialized

            await (await yieldFarmLP.connect(user).massHarvest()).wait()
            let totalDistributedAmount = ethers.BigNumber.from(0);
            for(var i=1; i<=7; i++){
                epochAmount = calculateEpochAmount(i)
                totalDistributedAmount = totalDistributedAmount.add(amount.mul(epochAmount).div(totalAmount))
            }
            expect(await ionxToken.balanceOf(userAddr)).to.equal(totalDistributedAmount)
            expect(await yieldFarmLP.connect(user).userLastEpochIdHarvested()).to.equal(7)
            expect(await yieldFarmLP.lastInitializedEpoch()).to.equal(7) // epoch 7 has been initialized
        });
        it('Have nothing to harvest', async function () {
            await depositUniV2Token(amount)
            await moveAtEpoch(30)
            expect(await yieldFarmLP.getPoolSize(1)).to.equal(amount)
            await yieldFarmLP.connect(deployer).harvest(1)
            expect(await ionxToken.balanceOf(await deployer.getAddress())).to.equal(0)
            await yieldFarmLP.connect(deployer).massHarvest()
            expect(await ionxToken.balanceOf(await deployer.getAddress())).to.equal(0)
        })
        it('harvest maximum epochs', async function () {
            await depositUniV2Token(amount)
            const totalAmount = amount;
            await moveAtEpoch(300);

            expect(await yieldFarmLP.getPoolSize(1)).to.equal(totalAmount);
            await (await yieldFarmLP.connect(user).massHarvest()).wait();

            const received = await ionxToken.balanceOf(userAddr);

            expect(await yieldFarmLP.lastInitializedEpoch()).to.equal(NR_OF_EPOCHS);

            expect(await yieldFarmLP.getPoolSize(NR_OF_EPOCHS)).to.equal(totalAmount);

            expect(await ionxToken.balanceOf(userAddr)).to.equal(distributedAmount.sub(deprecationBn.mul(NR_OF_EPOCHS)));
        })

        it('gives epochid = 0 for previous epochs', async function () {
            await moveAtEpoch(-2)
            expect(await yieldFarmLP.getCurrentEpoch()).to.equal(0)
        })
        it('it should return 0 if no deposit in an epoch', async function () {
            await moveAtEpoch(3)
            await yieldFarmLP.connect(user).harvest(1)
            expect(await ionxToken.balanceOf(await user.getAddress())).to.equal(0)
        });
    });
    // describe('Multiple Staking', function () {
    //     it.only('it supports multi tokens in the staking contract', async function () {
    //         await depositUniV2Token(amount);
    //         await depositIonxToken(amount, user2);
    //         await moveAtEpoch(3);
    //         await yieldFarmLP.connect(user).harvest(1);
    //         expect(await ionxToken.balanceOf(await user.getAddress())).to.equal(0);
    //     });
    //     it('it supports calling manualEpochInit', async function () {

    //     });
    // });


    describe('Events', function () {
        it('Harvest emits Harvest', async function () {
            await depositUniV2Token(amount)
            await moveAtEpoch(9)

            await expect(yieldFarmLP.connect(user).harvest(1))
                .to.emit(yieldFarmLP, 'Harvest')
        })

        it('MassHarvest emits MassHarvest', async function () {
            await depositUniV2Token(amount)
            await moveAtEpoch(9)

            await expect(yieldFarmLP.connect(user).massHarvest())
                .to.emit(yieldFarmLP, 'MassHarvest')
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
        await ethers.provider.send('evm_increaseTime', [diff]);
    }

    async function moveAtEpoch (epoch) {
        await setNextBlockTimestamp((await getCurrentUnix()) + epochDuration * epoch);
        await ethers.provider.send('evm_mine');
    }

    async function depositUniV2Token (x, u = user) {
        const ua = await u.getAddress();
        await stakeToken.connect(owner).transfer(ua, x);
        await stakeToken.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(stakeToken.address, x);
    }

    async function depositIonxToken (x, u = user) {
        const ua = await u.getAddress();

        const balance2 = await ionxToken.balanceOf(ua);
        console.log(`ua Funds:`,`${ethers.utils.formatUnits(balance2)} IONX`);

        const b = await ionxToken.balanceOf(ownerAddr);
        console.log(`Owner Funds:`,`${ethers.utils.formatUnits(b)} IONX`);

        await ionxToken.connect(owner).transfer(ua, x);
        await ionxToken.connect(u).approve(staking.address, x);
        return await staking.connect(u).deposit(ionxToken.address, x);
    }

    function calculateEpochAmount(epochId) {
        return startAmountBn.sub(deprecationBn.mul(epochId));
    }
})
