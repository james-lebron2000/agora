const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AgoraEscrow', function () {
  let AgoraToken;
  let agoraToken;
  let AgoraEscrow;
  let agoraEscrow;
  let owner;
  let payer;
  let payee;
  let arbitrator;
  let feeCollector;

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const PLATFORM_FEE_BPS = 250; // 2.5%

  beforeEach(async function () {
    [owner, payer, payee, arbitrator, feeCollector] = await ethers.getSigners();

    // Deploy token
    AgoraToken = await ethers.getContractFactory('AgoraToken');
    agoraToken = await AgoraToken.deploy(owner.address, ethers.parseEther('10000000'));
    await agoraToken.waitForDeployment();

    // Deploy escrow
    AgoraEscrow = await ethers.getContractFactory('AgoraEscrow');
    agoraEscrow = await AgoraEscrow.deploy(
      feeCollector.address,
      PLATFORM_FEE_BPS,
      owner.address
    );
    await agoraEscrow.waitForDeployment();

    // Fund payer
    await agoraToken.transfer(payer.address, ethers.parseEther('10000'));
    await agoraToken.connect(payer).approve(await agoraEscrow.getAddress(), ethers.parseEther('10000'));
  });

  describe('Deployment', function () {
    it('Should set correct fee collector', async function () {
      expect(await agoraEscrow.feeCollector()).to.equal(feeCollector.address);
    });

    it('Should set correct platform fee', async function () {
      expect(await agoraEscrow.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });

    it('Should set correct default timeout', async function () {
      expect(await agoraEscrow.defaultTimeout()).to.equal(30 * 24 * 60 * 60); // 30 days
    });
  });

  describe('Agreement Creation', function () {
    it('Should create a new agreement', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('agreement1'));
      
      await expect(
        agoraEscrow.connect(payer).createAgreement(
          agreementId,
          payee.address,
          await agoraToken.getAddress(),
          false, // not using milestones
          [],
          [],
          'Simple agreement'
        )
      )
        .to.emit(agoraEscrow, 'AgreementCreated')
        .withArgs(agreementId, payer.address, payee.address, await agoraToken.getAddress(), 0);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.payer).to.equal(payer.address);
      expect(agreement.payee).to.equal(payee.address);
      expect(agreement.status).to.equal(0); // PENDING
    });

    it('Should create agreement with milestones', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('milestone_agreement'));
      const milestoneAmounts = [ethers.parseEther('100'), ethers.parseEther('200')];
      const milestoneDescriptions = ['First milestone', 'Second milestone'];

      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        true,
        milestoneAmounts,
        milestoneDescriptions,
        'Milestone agreement'
      );

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.useMilestones).to.be.true;
      expect(agreement.totalAmount).to.equal(ethers.parseEther('300'));

      const milestones = await agoraEscrow.getMilestones(agreementId);
      expect(milestones.length).to.equal(2);
      expect(milestones[0].amount).to.equal(ethers.parseEther('100'));
    });

    it('Should reject duplicate agreement IDs', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('duplicate'));
      
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'First agreement'
      );

      await expect(
        agoraEscrow.connect(payer).createAgreement(
          agreementId,
          payee.address,
          await agoraToken.getAddress(),
          false,
          [],
          [],
          'Duplicate agreement'
        )
      ).to.be.revertedWithCustomError(agoraEscrow, 'AgreementExists');
    });

    it('Should reject zero address payee', async function () {
      await expect(
        agoraEscrow.connect(payer).createAgreement(
          ethers.keccak256(ethers.toUtf8Bytes('test')),
          ZERO_ADDRESS,
          await agoraToken.getAddress(),
          false,
          [],
          [],
          'Test'
        )
      ).to.be.revertedWithCustomError(agoraEscrow, 'InvalidAddress');
    });

    it('Should reject self as payee', async function () {
      await expect(
        agoraEscrow.connect(payer).createAgreement(
          ethers.keccak256(ethers.toUtf8Bytes('test')),
          payer.address,
          await agoraToken.getAddress(),
          false,
          [],
          [],
          'Test'
        )
      ).to.be.revertedWithCustomError(agoraEscrow, 'InvalidAddress');
    });

    it('Should store user agreements', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('user_agreement'));
      
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'Test'
      );

      const payerAgreements = await agoraEscrow.getUserAgreements(payer.address);
      const payeeAgreements = await agoraEscrow.getUserAgreements(payee.address);

      expect(payerAgreements).to.include(agreementId);
      expect(payeeAgreements).to.include(agreementId);
    });
  });

  describe('ETH Payments', function () {
    let agreementId;
    const depositAmount = ethers.parseEther('1');

    beforeEach(async function () {
      agreementId = ethers.keccak256(ethers.toUtf8Bytes('eth_agreement'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        ZERO_ADDRESS, // ETH
        false,
        [],
        [],
        'ETH agreement'
      );
    });

    it('Should deposit ETH payment', async function () {
      await expect(
        agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount, { value: depositAmount })
      )
        .to.emit(agoraEscrow, 'PaymentDeposited')
        .withArgs(agreementId, payer.address, depositAmount);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.status).to.equal(1); // FUNDED
      expect(agreement.totalAmount).to.equal(depositAmount);
    });

    it('Should reject incorrect ETH amount', async function () {
      await expect(
        agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount, { value: depositAmount - BigInt(1) })
      ).to.be.revertedWithCustomError(agoraEscrow, 'InvalidAmount');
    });

    it('Should allow full release with fee deduction', async function () {
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount, { value: depositAmount });

      const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);
      const payeeBalanceBefore = await ethers.provider.getBalance(payee.address);

      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);

      const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);
      const payeeBalanceAfter = await ethers.provider.getBalance(payee.address);

      const expectedFee = (depositAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      const expectedPayee = depositAmount - expectedFee;

      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
      expect(payeeBalanceAfter - payeeBalanceBefore).to.equal(expectedPayee);
    });
  });

  describe('ERC-20 Payments', function () {
    let agreementId;
    const depositAmount = ethers.parseEther('1000');

    beforeEach(async function () {
      agreementId = ethers.keccak256(ethers.toUtf8Bytes('erc20_agreement'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'ERC20 agreement'
      );
    });

    it('Should deposit ERC-20 payment', async function () {
      await expect(
        agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount)
      )
        .to.emit(agoraEscrow, 'PaymentDeposited')
        .withArgs(agreementId, payer.address, depositAmount);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.status).to.equal(1); // FUNDED
      expect(agreement.totalAmount).to.equal(depositAmount);
    });

    it('Should allow full release with fee deduction', async function () {
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount);

      const feeCollectorBalanceBefore = await agoraToken.balanceOf(feeCollector.address);
      const payeeBalanceBefore = await agoraToken.balanceOf(payee.address);

      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);

      const feeCollectorBalanceAfter = await agoraToken.balanceOf(feeCollector.address);
      const payeeBalanceAfter = await agoraToken.balanceOf(payee.address);

      const expectedFee = (depositAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      const expectedPayee = depositAmount - expectedFee;

      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
      expect(payeeBalanceAfter - payeeBalanceBefore).to.equal(expectedPayee);
    });

    it('Should update agreement status to RELEASED after full release', async function () {
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount);
      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.status).to.equal(3); // RELEASED
      expect(agreement.remainingAmount).to.equal(0);
    });
  });

  describe('Milestone Payments', function () {
    let agreementId;
    const milestoneAmounts = [ethers.parseEther('100'), ethers.parseEther('200')];

    beforeEach(async function () {
      agreementId = ethers.keccak256(ethers.toUtf8Bytes('milestone_payment'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        true,
        milestoneAmounts,
        ['Milestone 1', 'Milestone 2'],
        'Milestone project'
      );

      const totalAmount = milestoneAmounts[0] + milestoneAmounts[1];
      await agoraEscrow.connect(payer).depositPayment(agreementId, totalAmount);
    });

    it('Should complete milestone', async function () {
      await expect(agoraEscrow.connect(payer).completeMilestone(agreementId, 0))
        .to.emit(agoraEscrow, 'MilestoneCompleted')
        .withArgs(agreementId, 0);

      const milestones = await agoraEscrow.getMilestones(agreementId);
      expect(milestones[0].completed).to.be.true;
    });

    it('Should reject milestone release if not completed', async function () {
      await expect(
        agoraEscrow.connect(payer).releaseFunds(agreementId, 0)
      ).to.be.revertedWithCustomError(agoraEscrow, 'MilestoneNotCompleted');
    });

    it('Should release funds for completed milestone', async function () {
      await agoraEscrow.connect(payer).completeMilestone(agreementId, 0);
      
      const payeeBalanceBefore = await agoraToken.balanceOf(payee.address);
      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);
      const payeeBalanceAfter = await agoraToken.balanceOf(payee.address);

      const expectedFee = (milestoneAmounts[0] * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      expect(payeeBalanceAfter - payeeBalanceBefore).to.equal(milestoneAmounts[0] - expectedFee);
    });

    it('Should track milestone release status', async function () {
      await agoraEscrow.connect(payer).completeMilestone(agreementId, 0);
      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);

      const milestones = await agoraEscrow.getMilestones(agreementId);
      expect(milestones[0].released).to.be.true;
    });

    it('Should not allow double release of milestone', async function () {
      await agoraEscrow.connect(payer).completeMilestone(agreementId, 0);
      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);

      await expect(
        agoraEscrow.connect(payer).releaseFunds(agreementId, 0)
      ).to.be.revertedWithCustomError(agoraEscrow, 'InvalidStatus');
    });
  });

  describe('Dispute Resolution', function () {
    let agreementId;
    const depositAmount = ethers.parseEther('1000');

    beforeEach(async function () {
      agreementId = ethers.keccak256(ethers.toUtf8Bytes('dispute_agreement'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'Dispute test'
      );
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount);
    });

    it('Should allow payer to raise dispute', async function () {
      await expect(agoraEscrow.connect(payer).raiseDispute(agreementId))
        .to.emit(agoraEscrow, 'DisputeRaised')
        .withArgs(agreementId, payer.address);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.status).to.equal(2); // DISPUTED
    });

    it('Should allow payee to raise dispute', async function () {
      await expect(agoraEscrow.connect(payee).raiseDispute(agreementId))
        .to.emit(agoraEscrow, 'DisputeRaised')
        .withArgs(agreementId, payee.address);
    });

    it('Should reject dispute from unauthorized party', async function () {
      await expect(
        agoraEscrow.connect(arbitrator).raiseDispute(agreementId)
      ).to.be.revertedWithCustomError(agoraEscrow, 'NotAuthorized');
    });

    it('Should allow arbitrator to resolve dispute', async function () {
      await agoraEscrow.connect(payer).raiseDispute(agreementId);

      const payerBalanceBefore = await agoraToken.balanceOf(payer.address);
      const payeeBalanceBefore = await agoraToken.balanceOf(payee.address);

      // 50% refund to payer, 50% to payee
      await expect(agoraEscrow.connect(owner).resolveDispute(agreementId, 5000))
        .to.emit(agoraEscrow, 'DisputeResolved');

      const payerBalanceAfter = await agoraToken.balanceOf(payer.address);
      const payeeBalanceAfter = await agoraToken.balanceOf(payee.address);

      expect(payerBalanceAfter - payerBalanceBefore).to.equal(depositAmount / BigInt(2));
      expect(payeeBalanceAfter - payeeBalanceBefore).to.be.gt(0);
    });

    it('Should reject resolve from non-arbitrator', async function () {
      await agoraEscrow.connect(payer).raiseDispute(agreementId);

      await expect(
        agoraEscrow.connect(payer).resolveDispute(agreementId, 5000)
      ).to.be.reverted;
    });

    it('Should reject invalid refund percentage', async function () {
      await agoraEscrow.connect(payer).raiseDispute(agreementId);

      await expect(
        agoraEscrow.connect(owner).resolveDispute(agreementId, 10001)
      ).to.be.revertedWithCustomError(agoraEscrow, 'InvalidAmount');
    });
  });

  describe('Cancellation', function () {
    it('Should allow cancellation of unfunded agreement', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('cancel_unfunded'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'To be cancelled'
      );

      await expect(agoraEscrow.connect(payer).cancelAgreement(agreementId))
        .to.emit(agoraEscrow, 'AgreementCancelled')
        .withArgs(agreementId);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.status).to.equal(5); // CANCELLED
    });

    it('Should allow cancellation and refund of funded agreement', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('cancel_funded'));
      const depositAmount = ethers.parseEther('1000');

      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'To be cancelled'
      );
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount);

      const payerBalanceBefore = await agoraToken.balanceOf(payer.address);
      await agoraEscrow.connect(payer).cancelAgreement(agreementId);
      const payerBalanceAfter = await agoraToken.balanceOf(payer.address);

      expect(payerBalanceAfter - payerBalanceBefore).to.equal(depositAmount);

      const agreement = await agoraEscrow.getAgreement(agreementId);
      expect(agreement.status).to.equal(5); // CANCELLED
    });

    it('Should reject cancellation by payee', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('cancel_by_payee'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'Test'
      );

      await expect(
        agoraEscrow.connect(payee).cancelAgreement(agreementId)
      ).to.be.reverted;
    });
  });

  describe('Auto Release', function () {
    let agreementId;
    const depositAmount = ethers.parseEther('1000');

    beforeEach(async function () {
      agreementId = ethers.keccak256(ethers.toUtf8Bytes('auto_release'));
      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'Auto release test'
      );
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount);
    });

    it('Should not allow auto-release before timeout', async function () {
      await expect(
        agoraEscrow.autoRelease(agreementId)
      ).to.be.revertedWithCustomError(agoraEscrow, 'TimeoutNotReached');
    });

    it('Should allow auto-release after timeout', async function () {
      // Fast forward 30 days
      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine');

      const payeeBalanceBefore = await agoraToken.balanceOf(payee.address);
      await agoraEscrow.autoRelease(agreementId);
      const payeeBalanceAfter = await agoraToken.balanceOf(payee.address);

      const expectedFee = (depositAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      expect(payeeBalanceAfter - payeeBalanceBefore).to.equal(depositAmount - expectedFee);
    });

    it('Should report canAutoRelease correctly', async function () {
      expect(await agoraEscrow.canAutoRelease(agreementId)).to.be.false;

      await ethers.provider.send('evm_increaseTime', [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine');

      expect(await agoraEscrow.canAutoRelease(agreementId)).to.be.true;
    });
  });

  describe('Admin Functions', function () {
    it('Should allow admin to update platform fee', async function () {
      const newFee = 500; // 5%
      await expect(agoraEscrow.connect(owner).setPlatformFee(newFee))
        .to.emit(agoraEscrow, 'PlatformFeeUpdated')
        .withArgs(newFee);

      expect(await agoraEscrow.platformFeeBps()).to.equal(newFee);
    });

    it('Should reject fee above maximum', async function () {
      await expect(
        agoraEscrow.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWithCustomError(agoraEscrow, 'FeeTooHigh');
    });

    it('Should allow admin to update fee collector', async function () {
      const newCollector = arbitrator.address;
      await expect(agoraEscrow.connect(owner).setFeeCollector(newCollector))
        .to.emit(agoraEscrow, 'FeeCollectorUpdated')
        .withArgs(newCollector);

      expect(await agoraEscrow.feeCollector()).to.equal(newCollector);
    });

    it('Should allow admin to update timeout', async function () {
      const newTimeout = 14 * 24 * 60 * 60; // 14 days
      await expect(agoraEscrow.connect(owner).setDefaultTimeout(newTimeout))
        .to.emit(agoraEscrow, 'TimeoutUpdated')
        .withArgs(newTimeout);

      expect(await agoraEscrow.defaultTimeout()).to.equal(newTimeout);
    });

    it('Should allow admin to pause', async function () {
      await agoraEscrow.connect(owner).pause();
      expect(await agoraEscrow.paused()).to.be.true;
    });

    it('Should allow admin to unpause', async function () {
      await agoraEscrow.connect(owner).pause();
      await agoraEscrow.connect(owner).unpause();
      expect(await agoraEscrow.paused()).to.be.false;
    });

    it('Should prevent operations when paused', async function () {
      await agoraEscrow.connect(owner).pause();

      await expect(
        agoraEscrow.connect(payer).createAgreement(
          ethers.keccak256(ethers.toUtf8Bytes('paused')),
          payee.address,
          await agoraToken.getAddress(),
          false,
          [],
          [],
          'Test'
        )
      ).to.be.revertedWith('EnforcedPause');
    });
  });

  describe('View Functions', function () {
    it('Should return correct total agreements count', async function () {
      expect(await agoraEscrow.getTotalAgreements()).to.equal(0);

      await agoraEscrow.connect(payer).createAgreement(
        ethers.keccak256(ethers.toUtf8Bytes('view_test')),
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'Test'
      );

      expect(await agoraEscrow.getTotalAgreements()).to.equal(1);
    });

    it('Should track total fees collected', async function () {
      const agreementId = ethers.keccak256(ethers.toUtf8Bytes('fee_tracking'));
      const depositAmount = ethers.parseEther('1000');

      await agoraEscrow.connect(payer).createAgreement(
        agreementId,
        payee.address,
        await agoraToken.getAddress(),
        false,
        [],
        [],
        'Fee tracking'
      );
      await agoraEscrow.connect(payer).depositPayment(agreementId, depositAmount);
      await agoraEscrow.connect(payer).releaseFunds(agreementId, 0);

      const expectedFee = (depositAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      expect(await agoraEscrow.totalFeesCollected()).to.equal(expectedFee);
    });
  });
});
