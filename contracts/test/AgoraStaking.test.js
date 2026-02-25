const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AgoraStaking', function () {
  let AgoraToken;
  let agoraToken;
  let AgoraStaking;
  let agoraStaking;
  let owner;
  let staker1;
  let staker2;
  let rewardManager;

  const TIER = {
    BRONZE: 0,
    SILVER: 1,
    GOLD: 2,
    PLATINUM: 3,
  };

  beforeEach(async function () {
    [owner, staker1, staker2, rewardManager] = await ethers.getSigners();

    // Deploy token
    AgoraToken = await ethers.getContractFactory('AgoraToken');
    agoraToken = await AgoraToken.deploy(
      owner.address,
      ethers.parseEther('10000000') // 10M tokens
    );
    await agoraToken.waitForDeployment();

    // Deploy staking contract
    AgoraStaking = await ethers.getContractFactory('AgoraStaking');
    agoraStaking = await AgoraStaking.deploy(
      await agoraToken.getAddress(),
      await agoraToken.getAddress(),
      owner.address
    );
    await agoraStaking.waitForDeployment();

    // Setup reward pool
    await agoraToken.approve(
      await agoraStaking.getAddress(),
      ethers.parseEther('1000000')
    );
    await agoraStaking.depositRewards(ethers.parseEther('1000000'));

    // Distribute tokens to stakers
    await agoraToken.transfer(staker1.address, ethers.parseEther('100000'));
    await agoraToken.transfer(staker2.address, ethers.parseEther('100000'));
  });

  describe('Deployment', function () {
    it('Should set correct token addresses', async function () {
      expect(await agoraStaking.stakingToken()).to.equal(await agoraToken.getAddress());
      expect(await agoraStaking.rewardToken()).to.equal(await agoraToken.getAddress());
    });

    it('Should initialize tiers correctly', async function () {
      const bronze = await agoraStaking.tiers(TIER.BRONZE);
      expect(bronze.lockPeriod).to.equal(30 * 24 * 60 * 60); // 30 days
      expect(bronze.rewardRate).to.equal(500); // 5%
      expect(bronze.minStake).to.equal(ethers.parseEther('100'));

      const silver = await agoraStaking.tiers(TIER.SILVER);
      expect(silver.lockPeriod).to.equal(90 * 24 * 60 * 60); // 90 days
      expect(silver.rewardRate).to.equal(800); // 8%
      expect(silver.minStake).to.equal(ethers.parseEther('500'));

      const gold = await agoraStaking.tiers(TIER.GOLD);
      expect(gold.lockPeriod).to.equal(180 * 24 * 60 * 60); // 180 days
      expect(gold.rewardRate).to.equal(1200); // 12%
      expect(gold.minStake).to.equal(ethers.parseEther('2000'));

      const platinum = await agoraStaking.tiers(TIER.PLATINUM);
      expect(platinum.lockPeriod).to.equal(365 * 24 * 60 * 60); // 365 days
      expect(platinum.rewardRate).to.equal(1800); // 18%
      expect(platinum.minStake).to.equal(ethers.parseEther('5000'));
    });

    it('Should have correct initial reward pool', async function () {
      expect(await agoraStaking.getAvailableRewards()).to.equal(ethers.parseEther('1000000'));
    });
  });

  describe('Staking', function () {
    it('Should allow staking in Bronze tier', async function () {
      const stakeAmount = ethers.parseEther('500');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);

      await expect(agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount))
        .to.emit(agoraStaking, 'Staked')
        .withArgs(staker1.address, TIER.BRONZE, stakeAmount, 0);

      const stakes = await agoraStaking.getUserStakes(staker1.address, TIER.BRONZE);
      expect(stakes.length).to.equal(1);
      expect(stakes[0].amount).to.equal(stakeAmount);
      expect(stakes[0].active).to.be.true;
    });

    it('Should reject stake below minimum', async function () {
      const stakeAmount = ethers.parseEther('50'); // Below Bronze min (100)
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);

      await expect(
        agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount)
      ).to.be.revertedWithCustomError(agoraStaking, 'InvalidAmount');
    });

    it('Should reject zero amount stake', async function () {
      await expect(
        agoraStaking.connect(staker1).stake(TIER.BRONZE, 0)
      ).to.be.revertedWithCustomError(agoraStaking, 'InvalidAmount');
    });

    it('Should allow multiple stakes per tier', async function () {
      const stakeAmount = ethers.parseEther('500');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount * BigInt(2));

      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);

      const stakes = await agoraStaking.getUserStakes(staker1.address, TIER.BRONZE);
      expect(stakes.length).to.equal(2);
    });

    it('Should update tier total staked', async function () {
      const stakeAmount = ethers.parseEther('500');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);

      const tierBefore = await agoraStaking.tiers(TIER.BRONZE);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
      const tierAfter = await agoraStaking.tiers(TIER.BRONZE);

      expect(tierAfter.totalStaked - tierBefore.totalStaked).to.equal(stakeAmount);
    });

    it('Should reject staking when paused', async function () {
      await agoraStaking.pause();
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), ethers.parseEther('500'));

      await expect(
        agoraStaking.connect(staker1).stake(TIER.BRONZE, ethers.parseEther('500'))
      ).to.be.revertedWith('EnforcedPause');
    });
  });

  describe('Rewards Calculation', function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther('1000');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
    });

    it('Should calculate rewards correctly after time passes', async function () {
      // Fast forward 30 days
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      const rewards = await agoraStaking.calculatePendingRewards(staker1.address, TIER.BRONZE, 0);
      expect(rewards).to.be.gt(0);

      // Expected: (1000 * 0.05 * 30/365) = ~4.1 tokens
      const expectedRewards = (ethers.parseEther('1000') * BigInt(500) * BigInt(30 * 24 * 60 * 60)) / 
                              (BigInt(365 * 24 * 60 * 60) * BigInt(10000));
      expect(rewards).to.be.closeTo(expectedRewards, ethers.parseEther('0.1'));
    });

    it('Should return zero rewards for new stake', async function () {
      const rewards = await agoraStaking.calculatePendingRewards(staker1.address, TIER.BRONZE, 0);
      // Small amount might exist due to block timestamp
      expect(rewards).to.be.lt(ethers.parseEther('0.001'));
    });
  });

  describe('Claiming Rewards', function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther('1000');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
    });

    it('Should allow claiming rewards', async function () {
      // Fast forward 30 days
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      const balanceBefore = await agoraToken.balanceOf(staker1.address);
      await agoraStaking.connect(staker1).claimRewards(TIER.BRONZE, 0);
      const balanceAfter = await agoraToken.balanceOf(staker1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it('Should revert if no rewards to claim', async function () {
      await expect(
        agoraStaking.connect(staker1).claimRewards(TIER.BRONZE, 0)
      ).to.be.revertedWithCustomError(agoraStaking, 'InvalidAmount');
    });

    it('Should revert for inactive stake', async function () {
      // Fast forward past lock period
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Unstake first
      await agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0);

      await expect(
        agoraStaking.connect(staker1).claimRewards(TIER.BRONZE, 0)
      ).to.be.revertedWithCustomError(agoraStaking, 'NoActiveStake');
    });
  });

  describe('Unstaking', function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther('1000');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
    });

    it('Should reject unstake before lock period', async function () {
      await expect(
        agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0)
      ).to.be.revertedWithCustomError(agoraStaking, 'StakeLocked');
    });

    it('Should allow unstake after lock period with rewards', async function () {
      // Fast forward 30 days
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      const balanceBefore = await agoraToken.balanceOf(staker1.address);
      
      await expect(agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0))
        .to.emit(agoraStaking, 'Unstaked');

      const balanceAfter = await agoraToken.balanceOf(staker1.address);
      // Should receive original stake + rewards
      expect(balanceAfter - balanceBefore).to.be.gt(ethers.parseEther('1000'));
    });

    it('Should mark stake as inactive after unstake', async function () {
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0);

      const stakes = await agoraStaking.getUserStakes(staker1.address, TIER.BRONZE);
      expect(stakes[0].active).to.be.false;
    });

    it('Should reject unstake of inactive stake', async function () {
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0);

      await expect(
        agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0)
      ).to.be.revertedWithCustomError(agoraStaking, 'NoActiveStake');
    });

    it('Should reject unstake in emergency mode', async function () {
      await agoraStaking.toggleEmergencyMode();
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await expect(
        agoraStaking.connect(staker1).unstake(TIER.BRONZE, 0)
      ).to.be.revertedWithCustomError(agoraStaking, 'EmergencyModeActive');
    });
  });

  describe('Emergency Withdraw', function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther('1000');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
    });

    it('Should allow emergency withdraw in emergency mode', async function () {
      await agoraStaking.toggleEmergencyMode();

      const balanceBefore = await agoraToken.balanceOf(staker1.address);
      await agoraStaking.connect(staker1).emergencyWithdraw(TIER.BRONZE, 0);
      const balanceAfter = await agoraToken.balanceOf(staker1.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther('1000'));
    });

    it('Should not give rewards on emergency withdraw', async function () {
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');

      await agoraStaking.toggleEmergencyMode();

      const balanceBefore = await agoraToken.balanceOf(staker1.address);
      await agoraStaking.connect(staker1).emergencyWithdraw(TIER.BRONZE, 0);
      const balanceAfter = await agoraToken.balanceOf(staker1.address);

      // Should only get original stake back
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther('1000'));
    });

    it('Should allow admin emergency withdraw without emergency mode', async function () {
      await agoraStaking.connect(staker1).emergencyWithdraw(TIER.BRONZE, 0);
      
      const stakes = await agoraStaking.getUserStakes(staker1.address, TIER.BRONZE);
      expect(stakes[0].active).to.be.false;
    });
  });

  describe('Admin Functions', function () {
    it('Should allow admin to update tier', async function () {
      await agoraStaking.updateTier(TIER.BRONZE, 60 * 24 * 60 * 60, 600, ethers.parseEther('200'));
      
      const tier = await agoraStaking.tiers(TIER.BRONZE);
      expect(tier.lockPeriod).to.equal(60 * 24 * 60 * 60);
      expect(tier.rewardRate).to.equal(600);
      expect(tier.minStake).to.equal(ethers.parseEther('200'));
    });

    it('Should allow admin to pause', async function () {
      await agoraStaking.pause();
      expect(await agoraStaking.paused()).to.be.true;
    });

    it('Should allow admin to unpause', async function () {
      await agoraStaking.pause();
      await agoraStaking.unpause();
      expect(await agoraStaking.paused()).to.be.false;
    });

    it('Should allow reward manager to deposit rewards', async function () {
      const additionalRewards = ethers.parseEther('100000');
      await agoraToken.approve(await agoraStaking.getAddress(), additionalRewards);
      
      await expect(agoraStaking.depositRewards(additionalRewards))
        .to.emit(agoraStaking, 'RewardsDeposited')
        .withArgs(owner.address, additionalRewards);
    });

    it('Should allow emergency role to toggle emergency mode', async function () {
      await agoraStaking.toggleEmergencyMode();
      expect(await agoraStaking.emergencyMode()).to.be.true;

      await agoraStaking.toggleEmergencyMode();
      expect(await agoraStaking.emergencyMode()).to.be.false;
    });

    it('Should allow admin to rescue tokens', async function () {
      // Deploy a mock token and send to staking contract
      const MockToken = await ethers.getContractFactory('AgoraToken');
      const mockToken = await MockToken.deploy(owner.address, ethers.parseEther('1000'));
      await mockToken.waitForDeployment();
      
      await mockToken.transfer(await agoraStaking.getAddress(), ethers.parseEther('100'));
      
      await agoraStaking.rescueTokens(
        await mockToken.getAddress(),
        owner.address,
        ethers.parseEther('100')
      );
      
      expect(await mockToken.balanceOf(owner.address)).to.equal(ethers.parseEther('1000'));
    });
  });

  describe('View Functions', function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther('1000');
      await agoraToken.connect(staker1).approve(await agoraStaking.getAddress(), stakeAmount);
      await agoraStaking.connect(staker1).stake(TIER.BRONZE, stakeAmount);
    });

    it('Should return correct user stake count', async function () {
      const count = await agoraStaking.getUserStakeCount(staker1.address, TIER.BRONZE);
      expect(count).to.equal(1);
    });

    it('Should return correct tier info', async function () {
      const info = await agoraStaking.getTierInfo(TIER.BRONZE);
      expect(info.rewardRate).to.equal(500);
    });

    it('Should return correct total staked', async function () {
      const total = await agoraStaking.getTotalStaked();
      expect(total).to.equal(ethers.parseEther('1000'));
    });
  });
});
