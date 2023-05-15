const { expect } = require('chai');
const { deployMockContract } = require('ethereum-waffle');

const {
  ethers,
  getNamedAccounts,
  getChainId,
} = require('hardhat');

const {
  getDeployData,
} = require('../../js-helpers/deploy');

describe('Reward program', function () {

  const basketContractAddressMock = '0x0000000000000000000000000000000000000000'

  let rewardProgram,
    ionx,
    protocolOwnerAddress,
    deployerAddress,
    protocolOwnerSigner,
    deployerSigner,
    chainId,
    leptonMock,
    ionxMock,
    rewardWalletManagerMock,
    leptonData,
    rewardProgramDeployerSigner;

  before(async () => {
    const { deployer, protocolOwner } = await getNamedAccounts();
    protocolOwnerAddress = protocolOwner;
    deployerAddress = deployer;
    protocolOwnerSigner = ethers.provider.getSigner(protocolOwnerAddress);
    deployerSigner = ethers.provider.getSigner(deployerAddress);
  });

  before(async () => {
    chainId = await getChainId();
    const ddIonx = getDeployData('Ionx', chainId);
    const Ionx = await ethers.getContractFactory('Ionx');
    ionx = await Ionx.attach(ddIonx.address);

    // Ionx mock
    ionxMock = await deployMockContract(deployerSigner, ddIonx.abi);
  });

  beforeEach(async function () {
    const ddRewardProgram = getDeployData('RewardProgram');
    const RewardProgram = await ethers.getContractFactory('RewardProgram');
    rewardProgram = RewardProgram.attach(ddRewardProgram.address);

    rewardProgramDeployerSigner = rewardProgram.connect(deployerSigner);

    // mock lepton
    leptonData = getDeployData('Lepton', chainId);
    leptonMock = await deployMockContract(deployerSigner, leptonData.abi);
    rewardProgramDeployerSigner.setRewardNft(leptonMock.address).then(tx => tx.wait());

    // mock wallet manager
    const walletManager = getDeployData('AaveWalletManagerB', chainId);
    rewardWalletManagerMock = await deployMockContract(deployerSigner, walletManager.abi);
  });


  it('Should be deployed', async () =>{
    expect(rewardProgramDeployerSigner.address).to.not.equal(0);
    const rewardData = await rewardProgramDeployerSigner.getProgramData();

    expect(rewardData.rewardToken).to.equal(ionx.address);
  });

  describe('Funds reward pool', () => {
    it('Protocol owner account has balance', async() => {
      const balance = await ionx.balanceOf(protocolOwnerAddress);
      expect(balance).to.gt(0)
    });

    it('Deposits IONX into the reward pool', async () => {
      const fundingAmount = 100;

      // Fund owner of reward program contract aka deployer
      const approveIonxUsageTx = await ionx.connect(protocolOwnerSigner).transfer(deployerAddress, fundingAmount);
      await approveIonxUsageTx.wait();

      // Approve reward program contract usage of deployer ionx tokens
      await ionx.connect(deployerSigner).approve(rewardProgram.address, fundingAmount).then((tx) => tx.wait());

      // Fund reward program
      await rewardProgram.connect(deployerSigner).fundProgram(fundingAmount).then(tx => tx.wait());

      expect(await ionx.balanceOf(rewardProgram.address)).to.equal(fundingAmount);
    });

    it ('Calculates reward with multiplier as 100%', async () => {
      await rewardProgram.connect(deployerSigner).setBaseMultiplier(10000);
      const chargedGeneratedInUsdc = ethers.utils.parseUnits('1', 6);
      const reward = await rewardProgram.calculateBaseReward(chargedGeneratedInUsdc);
      expect(ethers.utils.formatUnits(reward, 6)).to.be.eq('1.0');
    });

    it ('Changes the base reward multiplier', async () => {
      await rewardProgram.connect(deployerSigner).setBaseMultiplier(5000);

      const chargedGeneratedInUsdc = ethers.utils.parseUnits('1', 6);
      const reward = await rewardProgram.calculateBaseReward(chargedGeneratedInUsdc);
      expect(ethers.utils.formatUnits(reward, 6)).to.be.eq('0.5');

      await rewardProgram.connect(deployerSigner).setBaseMultiplier(15000);
      expect(ethers.utils.formatUnits(await rewardProgram.calculateBaseReward(chargedGeneratedInUsdc), 6)).to.be.eq('1.5');

      await rewardProgram.connect(deployerSigner).setBaseMultiplier(10000);
    });
  });

  describe('Leptons staking', async () => {
    it('Registers lepton deposit in reward program', async () => {
      const tokenId = 12;
      const leptonMultiplier = 20000; // x2
      const contractAddress = '0x5d183d790d6b570eaec299be432f0a13a00058a9';

      await leptonMock.mock.getMultiplier.returns(leptonMultiplier);
      // const blockBeforeDeposit = await ethers.provider.getBlock("latest");

      await rewardProgramDeployerSigner.setUniverse(await deployerSigner.getAddress()).then(tx => tx.wait());
      // start reward program with usdc
      await expect(rewardProgramDeployerSigner.registerAssetDeposit(
        contractAddress,
        tokenId,
        'basic.B',
        100
      )).to.emit(rewardProgram, 'AssetDeposit');

      await rewardProgramDeployerSigner.registerNftDeposit(
        contractAddress,
        tokenId,
        leptonMock.address,
        1,
        0
      ).then(tx => tx.wait());

      // const leptonsData = await rewardProgramDeployerSigner.leptonsStake(uuid);

      // expect(leptonsData.multiplier).to.be.eq(leptonMultiplier);
      // expect(blockBeforeDeposit.number).to.be.lessThan(leptonsData.depositBlockNumber.toNumber());

      // const principalForEmptyMultiplier = 100;
      // const emptyMultiplierReward = await rewardProgramDeployerSigner.callStatic.calculateLeptonMultipliedReward(2, principalForEmptyMultiplier);
      // expect(emptyMultiplierReward).to.be.eq(principalForEmptyMultiplier);

      // const emptyRewardMultiplier = await rewardProgramDeployerSigner.callStatic.calculateLeptonMultipliedReward(2, 0);
      // expect(emptyRewardMultiplier).to.be.eq(0);
    });

    it('Verifies simple lepton reward calculation', async () => {
      const principal = 100;
      const uuid = 21;
      const leptonId = 1;
      const leptonMultiplier = 20000; // x2

      await leptonMock.mock.getMultiplier.returns(leptonMultiplier);
      // stake
      await rewardProgramDeployerSigner.stake(uuid, principal).then(tx => tx.wait());

      // deposit lepton
      await rewardProgramDeployerSigner.registerLeptonDeposit(uuid, leptonId).then(tx => tx.wait());

      // calculate reward
     const reward = await rewardProgramDeployerSigner.calculateLeptonMultipliedReward(uuid, principal);

      // Has multiplier but time spent is 0 so reward is multiplied by 1.
      expect(reward).to.be.eq(100);
    });

    it('Checks lepton reward calculation with time spent', async () => {
      const receiverAddress = '0x277BFc4a8dc79a9F194AD4a83468484046FAFD3A'
      const basketTokenId = 32;

      // set reward mock token into reward program.
      const stakingToken = ionxMock.address;
      await rewardProgramDeployerSigner.setRewardToken(stakingToken).then( tx => tx.wait());

      const rewardProgramData = await rewardProgramDeployerSigner.getProgramData();
      expect(rewardProgramData.rewardToken).to.eq(stakingToken);

      const stakeInfoCases = [
        // {
        //   amount: 10,
        //   blocksUntilLeptonDeposit: 0,
        //   blocksUntilLeptonRelease: 100,
        //   blocksUntilCalculation: 0,
        //   leptonStakeMultiplier: 120,
        //   generatedChargedBeforeLeptonRelease: 1000000,
        //   generatedChargeAfterLeptonRelease: 0,
        //   expectedReward: '1196180000000000000',
        // },
        // {
        //   amount: 10,
        //   blocksUntilLeptonDeposit: 0,
        //   blocksUntilLeptonRelease: 100,
        //   blocksUntilCalculation: 0,
        //   leptonStakeMultiplier: 100,
        //   generatedChargedBeforeLeptonRelease: 1000000,
        //   generatedChargeAfterLeptonRelease: 1000000,
        //   expectedReward: '2000000000000000000',
        // },
        // {
        //   amount: 10,
        //   blocksUntilLeptonDeposit: 0,
        //   blocksUntilLeptonRelease: 100,
        //   blocksUntilCalculation: 0,
        //   leptonStakeMultiplier: 200,
        //   generatedChargedBeforeLeptonRelease: 1000000,
        //   generatedChargeAfterLeptonRelease: 0,
        //   expectedReward: '1980900000000000000',
        // },
        {
          amount: 10,
          blocksUntilLeptonDeposit: 0,
          blocksUntilCalculation: 1000,
          leptonStakeMultiplier: 200,
          generatedChargedBeforeLeptonRelease: 0,
          generatedChargeAfterLeptonRelease: 1000000,
          expectedReward: '1998000000000000000',
          description: 'Unstake with deposited lepton inside'
        },
      ];

      for(let i = 0; i < stakeInfoCases.length; i++) {
        await rewardWalletManagerMock.mock.getInterest.returns(0 ,stakeInfoCases[i]?.generatedChargedBeforeLeptonRelease || 1);
        await leptonMock.mock.getMultiplier.returns(stakeInfoCases[i].leptonStakeMultiplier);
        await ionxMock.mock.transfer.returns(true);

        await rewardProgramDeployerSigner.stake(i, stakeInfoCases[i].amount).then(tx => tx.wait());

        await mineBlocks(stakeInfoCases[i].blocksUntilLeptonDeposit);
        await rewardProgramDeployerSigner.registerLeptonDeposit(i, i).then(tx => tx.wait());

        if (stakeInfoCases[i]?.blocksUntilLeptonRelease) {
          await mineBlocks(stakeInfoCases[i].blocksUntilLeptonRelease);

          console.log('hey !!!!', stakeInfoCases[i].blocksUntilLeptonRelease);

          rewardProgramDeployerSigner.setRewardWalletManager(rewardWalletManagerMock.address).then(tx => tx.wait());

          await rewardProgramDeployerSigner.registerLeptonRelease(
            basketContractAddressMock,
            basketTokenId,
            i
          ).then(tx => tx.wait());
          await rewardProgramDeployerSigner.setRewardWalletManager(deployerAddress).then(
            tx => tx.wait()
          );
        }

        await mineBlocks(stakeInfoCases[i].blocksUntilCalculation);

        const reward = await rewardProgramDeployerSigner.callStatic.unstake(
          i,
          receiverAddress,
          stakeInfoCases[i]?.generatedChargeAfterLeptonRelease
        );

        expect(reward).to.be.eq(stakeInfoCases[i].expectedReward);
      }
    });

    it ('Calculates reward with lepton re-staking, resets lepton staking.', async () => {
      const basketTokenId = 32;
      const uuid = 101;
      const amount = 100;
      const leptonId = 36;
      const multiplier = 2;

      await leptonMock.mock.getMultiplier.returns(multiplier);
      await rewardWalletManagerMock.mock.getInterest.returns(0,2);

      await rewardProgramDeployerSigner.stake(uuid, amount).then(tx => tx.wait());
      await rewardProgramDeployerSigner.registerLeptonDeposit(uuid, leptonId).then(tx => tx.wait());

      rewardProgramDeployerSigner.setRewardWalletManager(rewardWalletManagerMock.address).then(tx => tx.wait());
      await rewardProgramDeployerSigner.registerLeptonRelease(
        basketContractAddressMock,
        basketTokenId,
        uuid
      ).then(tx => tx.wait());
      await rewardProgramDeployerSigner.setRewardWalletManager(deployerAddress).then(
        tx => tx.wait()
      );

      await rewardProgramDeployerSigner.registerLeptonDeposit(uuid, leptonId).then(tx => tx.wait());

      await mineBlocks(1000);

      const reward = await rewardProgramDeployerSigner.calculateLeptonMultipliedReward(uuid, amount);
      expect(reward).to.be.eq(200);
    });
  });

});

const mineBlocks = async (numberOfBlocks) => {
  await ethers.provider.send("hardhat_mine", [ ethers.utils.hexValue(numberOfBlocks) ]);
  await ethers.provider.send("evm_mine");
}
