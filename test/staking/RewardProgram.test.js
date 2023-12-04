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
  const USDC_STAKING_TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  let rewardProgram,
    ionx,
    protocolOwnerAddress,
    deployerAddress,
    protocolOwnerSigner,
    deployerSigner,
    chainId,
    leptonMock,
    ionxMock,
    usdcMock,
    rewardWalletManagerMock,
    leptonData,
    rewardProgramDeployerSigner,
    universe,
    universeData,
    programData;

  before(async () => {
    const { deployer, protocolOwner } = await getNamedAccounts();
    protocolOwnerAddress = protocolOwner;
    deployerAddress = deployer;
    protocolOwnerSigner = ethers.provider.getSigner(protocolOwnerAddress);
    deployerSigner = ethers.provider.getSigner(deployerAddress);
  });

  beforeEach(async () => {
    chainId = await getChainId();
    const ddIonx = getDeployData('Ionx', chainId);
    const Ionx = await ethers.getContractFactory('Ionx');
    ionx = await Ionx.attach(ddIonx.address);

    // Ionx mock
    ionxMock = await deployMockContract(deployerSigner, ddIonx.abi);

    // mock usdc
    usdcMock = await deployMockContract(deployerSigner, ddIonx.abi);
    await usdcMock.mock.decimals.returns(6);
    await usdcMock.mock.transfer.returns(true);
    await usdcMock.mock.balanceOf.returns(ethers.utils.parseEther('100'));
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

    await rewardProgramDeployerSigner.setUniverse(await deployerSigner.getAddress()).then(tx => tx.wait());
    programData = await rewardProgramDeployerSigner.getProgramData();

    // Instantiate universe
    const Universe= await ethers.getContractFactory('Universe');
    universeData = getDeployData('Universe');
    universe = Universe.attach(universeData.address);
  });

  it('Should be deployed', async () => {
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
      const leptonMultiplier = 200; // x2
      const contractAddress = '0x5d183d790d6b570eaec299be432f0a13a00058a9';

      await leptonMock.mock.getMultiplier.returns(leptonMultiplier);
      const blockBeforeDeposit = await ethers.provider.getBlock("latest");

      // start reward program with usdc
      await expect(rewardProgramDeployerSigner.registerAssetDeposit(
        contractAddress,
        tokenId,
        'basic.B',
        USDC_STAKING_TOKEN,
        100
      )).to.emit(rewardProgram, 'AssetDeposit');

      await expect(rewardProgramDeployerSigner.registerNftDeposit(
        contractAddress,
        tokenId,
        leptonMock.address,
        58,
        0
      )).to.emit(rewardProgram, 'NftDeposit');

      const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [contractAddress, tokenId]);
      const uuidBigNumber = ethers.BigNumber.from(uuid);

      const leptonsData = await rewardProgramDeployerSigner.getNftStake(uuidBigNumber);
      // const assetToken = await rewardProgramDeployerSigner.getAssetStake(uuidBigNumber);

      expect(leptonsData?.multiplier).to.be.eq("200");
      expect(blockBeforeDeposit.number).to.be.lessThan(leptonsData.depositBlockNumber.toNumber());

      await mineBlocks(10000);
      const principalForEmptyMultiplier = 100;
      const emptyMultiplierReward = await rewardProgramDeployerSigner.callStatic.calculateMultipliedReward(uuidBigNumber, principalForEmptyMultiplier);

      expect(emptyMultiplierReward).to.be.eq('199');

      const emptyRewardMultiplier = await rewardProgramDeployerSigner.callStatic.calculateMultipliedReward(uuidBigNumber, 0);
      expect(emptyRewardMultiplier).to.be.eq(0);
    });

    it('Verifies simple lepton reward calculation', async () => {
      const contractAddress = '0x5d183d790d6b570eaec299be432f0a13a00058a7';
      const leptonMultiplier = 200; // x2
      const principal = 1000000;
      const leptonId = 89;
      const tokenId = 6

      const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [contractAddress, tokenId]);
      const uuidBigNumber = ethers.BigNumber.from(uuid);

      await leptonMock.mock.getMultiplier.returns(leptonMultiplier);
      // stake
      await rewardProgramDeployerSigner.registerAssetDeposit(
        contractAddress,
        tokenId,
        'basic.B',
        usdcMock.address,
        100
      ).then(tx => tx.wait());

      // deposit lepton
      await rewardProgramDeployerSigner.registerNftDeposit(
        contractAddress,
        tokenId,
        leptonMock.address,
        leptonId,
        0
      ).then(tx => tx.wait());

      // calculate reward
      const reward = await rewardProgramDeployerSigner.calculateRewardsEarned(
        uuidBigNumber,
        usdcMock.address,
        principal
      );

      // Has multiplier but time spent is 0 so reward is multiplied by 1.
      expect(reward).to.be.eq('1000000000000000000');
    });

    it('Checks lepton reward calculation with time spent', async () => {
      const receiverAddress = '0x277BFc4a8dc79a9F194AD4a83468484046FAFD3A'
      // set reward mock token into reward program.
      const stakingToken = ionxMock.address;
      await rewardProgramDeployerSigner.setRewardToken(stakingToken).then( tx => tx.wait());

      const rewardProgramData = await rewardProgramDeployerSigner.getProgramData();
      expect(rewardProgramData.rewardToken).to.eq(stakingToken);

      const stakeInfoCases = [
        {
          amount: 10,
          blocksUntilLeptonDeposit: 1,
          blocksUntilCalculation: 500,
          leptonStakeMultiplier: 200,
          generatedChargedBeforeLeptonRelease: 1000000,
          generatedChargeAfterLeptonRelease: 1000000,
          blocksUntilLeptonRelease: 500,
          expectedReward: '1499000000000000000',
          tokenId: 42,
          description: 'Lepton deposited half of the reward length'
        },

        {
          amount: 10,
          blocksUntilLeptonDeposit: 1,
          blocksUntilCalculation: 1000,
          leptonStakeMultiplier: 200,
          generatedChargedBeforeLeptonRelease: 1,
          generatedChargeAfterLeptonRelease: 1000000,
          blocksUntilLeptonRelease: 0,
          expectedReward: '1997000000000000000',
          tokenId: 43,
          description: 'Unstake with deposited lepton inside'
        },
        {
          amount: ethers.utils.parseUnits('1.0', 6),
          blocksUntilLeptonDeposit: 0,
          blocksUntilCalculation: 100000,
          leptonStakeMultiplier: 100,
          generatedChargedBeforeLeptonRelease: 0,
          generatedChargeAfterLeptonRelease: ethers.utils.parseUnits('1.0', 6),
          blocksUntilLeptonRelease: 0,
          expectedReward: '1000000000000000000',
          tokenId: 44,
          description: 'Base multiplier 1x, testing returned decimals'
        },
      ];

      for(let i = 0; i < stakeInfoCases.length; i++) {
        await rewardWalletManagerMock.mock.getInterest.returns(0 ,stakeInfoCases[i]?.generatedChargedBeforeLeptonRelease || 1);
        await leptonMock.mock.getMultiplier.returns(stakeInfoCases[i].leptonStakeMultiplier);
        await leptonMock.mock.ownerOf.returns(receiverAddress);
        await leptonMock.mock.isApprovedForAll.returns(true);
        await ionxMock.mock.balanceOf.returns(ethers.utils.parseEther('100'));
        await ionxMock.mock.transfer.returns(true);
        await ionxMock.mock.decimals.returns(6);

        await rewardProgramDeployerSigner.registerAssetDeposit(
          leptonMock.address,
          stakeInfoCases[i].tokenId,
          'generic.B',
          stakingToken,
          stakeInfoCases[i].amount
        ).then(tx => tx.wait());

        if (stakeInfoCases[i]?.blocksUntilLeptonDeposit) {
          await mineBlocks(stakeInfoCases[i].blocksUntilLeptonDeposit);
          await rewardProgramDeployerSigner.registerNftDeposit(
            leptonMock.address,
            stakeInfoCases[i].tokenId,
            leptonMock.address,
            i + stakeInfoCases[i].tokenId,
            0
          ).then(tx => tx.wait());
        }

        if (stakeInfoCases[i]?.blocksUntilLeptonRelease) {
          await mineBlocks(stakeInfoCases[i].blocksUntilLeptonRelease);

          await rewardProgramDeployerSigner.registerNftRelease(
            leptonMock.address,
            stakeInfoCases[i].tokenId,
            leptonMock.address,
            i + stakeInfoCases[i].tokenId,
            0
          ).then(tx => tx.wait());
        }
        await mineBlocks(stakeInfoCases[i].blocksUntilCalculation);

        expect(await rewardProgramDeployerSigner.getClaimableRewards(
          leptonMock.address,
          stakeInfoCases[i].tokenId
        )).to.be.eq(0);

        const reward = await rewardProgramDeployerSigner.callStatic.registerAssetRelease(
          leptonMock.address,
          stakeInfoCases[i].tokenId,
          stakeInfoCases[i]?.generatedChargeAfterLeptonRelease
        );

        await rewardProgramDeployerSigner.registerAssetRelease(
          leptonMock.address,
          stakeInfoCases[i].tokenId,
          stakeInfoCases[i]?.generatedChargeAfterLeptonRelease
        );

        expect(await rewardProgramDeployerSigner.getClaimableRewards(
          leptonMock.address,
          stakeInfoCases[i].tokenId
        )).to.be.eq(0);

        expect(reward).to.be.eq(stakeInfoCases[i].expectedReward);
      }
    });

    it('Closes nft stake struck after all leptons are released', async () => {
      const contractAddress = '0x5d183d790d6b570eaec299be432f0a13a00058a2';
      const tokenId = 3;

      await rewardProgramDeployerSigner.registerAssetDeposit(
        contractAddress,
        tokenId,
        'basic.B',
        usdcMock.address,
        100
      ).then(tx => tx.wait());

      await leptonMock.mock.getMultiplier.returns(200);
      await rewardProgramDeployerSigner.registerNftDeposit(
        contractAddress,
        tokenId,
        leptonMock.address,
        4, //lepton id
        0
      ).then(tx => tx.wait());

      await leptonMock.mock.getMultiplier.returns(220);
      await rewardProgramDeployerSigner.registerNftDeposit(
        contractAddress,
        tokenId,
        leptonMock.address,
        5, //lepton id
        0
      ).then(tx => tx.wait());

      await leptonMock.mock.getMultiplier.returns(200);
      await rewardProgramDeployerSigner.registerNftRelease(
        contractAddress,
        tokenId,
        leptonMock.address,
        4, //lepton id
        0
      ).then(tx => tx.wait());

      await leptonMock.mock.getMultiplier.returns(220);
      await rewardProgramDeployerSigner.registerNftRelease(
        contractAddress,
        tokenId,
        leptonMock.address,
        5, //lepton id
        0
      ).then(tx => tx.wait());

      const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [contractAddress, tokenId]);
      const uuidBigNumber = ethers.BigNumber.from(uuid);
      const nftStake = await rewardProgramDeployerSigner.getNftStake(uuidBigNumber);

      expect(nftStake.multiplier).to.be.eq(220);
      expect(nftStake.releaseBlockNumber).to.be.gt(0);
    });
  });

  describe('_calculateTotalMultiplier', () => {
    const leptonDepositCases = [
      {
        description: 'Lepton deposit length 4',
        leptonDepositMultipliers: [120, 130, 140, 150],
        expectedTotalMultiplier: '270'
      },
      {
        description: 'Lepton deposit length 5',
        leptonDepositMultipliers: [120, 130, 140, 150, 160],
        expectedTotalMultiplier: '290'
      },
      {
        description: 'Lepton deposit length 6',
        leptonDepositMultipliers: [120, 130, 140, 150, 160, 170],
        expectedTotalMultiplier: '1000'
      },
      {
        description: 'Lepton deposit length 6',
        leptonDepositMultipliers: [120, 130, 140, 150, 160, 170],
        expectedTotalMultiplier: '1000'
      }
    ];

    for (let i = 0; i < leptonDepositCases.length; i++) {
      it(`${leptonDepositCases[i].description}`, async () => {
        const leptonMultipliers = leptonDepositCases[i]?.leptonDepositMultipliers;
        const contractAddress = '0x5d183d790d6b570eaec299be432f0a13a00058a8';
        const tokenId = 32 + i;

        await rewardProgramDeployerSigner.registerAssetDeposit(
          contractAddress,
          tokenId,
          'basic.B',
          USDC_STAKING_TOKEN,
          100
          ).then(tx => tx.wait());

          for(let z = 0; z < leptonMultipliers.length; z++) {
            await leptonMock.mock.getMultiplier.returns(leptonMultipliers[z]);
            await rewardProgramDeployerSigner.registerNftDeposit(
              contractAddress,
              tokenId,
              leptonMock.address,
              z,
              0
            ).then(tx => tx.wait());
          }

        const uuid = ethers.utils.solidityKeccak256(['address', 'uint256'], [contractAddress, tokenId]);
        const uuidBigNumber = ethers.BigNumber.from(uuid);
        const nftStake = await rewardProgramDeployerSigner.getNftStake(uuidBigNumber);

        expect(nftStake.multiplier).to.be.eq(leptonDepositCases[i].expectedTotalMultiplier);
      });
    }
  });

  describe('Universe set up', async() => {
    it('Sets a reward program in the universe', async () => {
      await universe.setRewardProgram(
        rewardProgram.address,
        ionxMock.address,
        programData.multiplierNft
      ).then(tx => tx.wait());

      const rewardProgramSet = await universe.getRewardProgram(ionxMock.address);
      expect(rewardProgramSet).to.be.eq(rewardProgram.address);

      await universe.removeRewardProgram(
        ionxMock.address,
        programData.multiplierNft
      ).then(tx => tx.wait());

      const rewardProgramRemoved = await universe.getRewardProgram(ionxMock.address);
      expect(rewardProgramRemoved).to.be.eq('0x0000000000000000000000000000000000000000');
    });

    it ('Sets up multiple staking assets ', async() => {
      // Set universe with IONX as asset deposit
      await universe.setRewardProgram(
        rewardProgram.address,
        ionxMock.address,
        programData.multiplierNft
      ).then(tx => tx.wait());

      await universe.setRewardProgram(
        rewardProgram.address,
        USDC_STAKING_TOKEN,
        programData.multiplierNft
      ).then(tx => tx.wait());

      const rewardProgramIonx = await universe.getRewardProgram(USDC_STAKING_TOKEN);
      expect(rewardProgramIonx).to.be.eq(rewardProgram.address);

      const rewardProgramUSDc = await universe.getRewardProgram(USDC_STAKING_TOKEN);
      expect(rewardProgramUSDc).to.be.eq(rewardProgram.address);

      // Set universe with USDC

      // Both should resolve the same reward program address
    });
  });
});

const mineBlocks = async (numberOfBlocks) => {
  await ethers.provider.send("hardhat_mine", [ ethers.utils.hexValue(numberOfBlocks) ]);
  await ethers.provider.send("evm_mine");
}
