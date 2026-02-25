// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import {Pausable} from '@openzeppelin/contracts/security/Pausable.sol';
import {AccessControl} from '@openzeppelin/contracts/access/AccessControl.sol';

/**
 * @title AgoraEscrow
 * @dev Payment escrow system with fees and dispute resolution
 * Features:
 * - Multi-token support (ETH + ERC-20)
 * - Configurable platform fee (max 10%)
 * - Milestone-based payments
 * - Dispute resolution with arbitrator
 * - Auto-release after timeout
 * - Pausable for emergencies
 */
contract AgoraEscrow is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    /// @notice Platform admin role
    bytes32 public constant PLATFORM_ADMIN_ROLE = keccak256('PLATFORM_ADMIN_ROLE');
    
    /// @notice Arbitrator role for dispute resolution
    bytes32 public constant ARBITRATOR_ROLE = keccak256('ARBITRATOR_ROLE');
    
    /// @notice Address for collecting platform fees
    address public feeCollector;
    
    /// @notice Platform fee in basis points (100 = 1%, max 1000 = 10%)
    uint256 public platformFeeBps;
    
    /// @notice Maximum platform fee allowed
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000;
    
    /// @notice Default auto-release timeout (30 days)
    uint256 public defaultTimeout = 30 days;

    /// @notice Escrow status enum
    enum Status {
        PENDING,        // Awaiting payment or milestone completion
        FUNDED,         // Payment deposited
        DISPUTED,       // Under dispute resolution
        RELEASED,       // Payment released to payee
        REFUNDED,       // Payment refunded to payer
        CANCELLED       // Cancelled by mutual consent
    }

    /// @notice Milestone structure for milestone-based payments
    struct Milestone {
        uint256 amount;         // Amount for this milestone
        bool completed;         // Whether milestone is completed
        bool released;          // Whether funds released
        string description;     // Milestone description
    }

    /// @notice Escrow agreement structure
    struct Agreement {
        address payer;              // Who pays
        address payee;              // Who receives payment
        address token;              // Token address (0x0 for ETH)
        uint256 totalAmount;        // Total amount locked
        uint256 remainingAmount;    // Amount still in escrow
        uint256 feeAmount;          // Platform fee deducted
        uint256 createdAt;          // Creation timestamp
        uint256 releaseTimeout;     // Timestamp for auto-release
        Status status;              // Current status
        bool useMilestones;         // Whether using milestone payments
        Milestone[] milestones;     // Milestone details
        string description;         // Agreement description
    }

    /// @notice Mapping of agreement ID to Agreement
    mapping(bytes32 => Agreement) public agreements;
    
    /// @notice All agreement IDs
    bytes32[] public agreementIds;
    
    /// @notice User's agreements: user => agreement IDs
    mapping(address => bytes32[]) public userAgreements;
    
    /// @notice User statistics
    struct UserStats {
        uint256 totalVolume;        // Total volume as payer
        uint256 completedDeals;     // Number of completed agreements
        uint256 disputedDeals;      // Number of disputed agreements
    }
    
    mapping(address => UserStats) public userStats;

    /// @notice Total fees collected
    uint256 public totalFeesCollected;

    /// @notice Events
    event AgreementCreated(
        bytes32 indexed agreementId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 totalAmount
    );
    event PaymentDeposited(bytes32 indexed agreementId, address indexed depositor, uint256 amount);
    event MilestoneCompleted(bytes32 indexed agreementId, uint256 milestoneIndex);
    event FundsReleased(
        bytes32 indexed agreementId,
        address indexed payee,
        uint256 amount,
        uint256 fee
    );
    event RefundIssued(bytes32 indexed agreementId, address indexed payer, uint256 amount);
    event DisputeRaised(bytes32 indexed agreementId, address indexed raisedBy);
    event DisputeResolved(
        bytes32 indexed agreementId,
        address indexed payerRefund,
        address indexed payeeRelease,
        uint256 refundAmount,
        uint256 releaseAmount
    );
    event AgreementCancelled(bytes32 indexed agreementId);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event FeeCollectorUpdated(address newCollector);
    event TimeoutUpdated(uint256 newTimeout);

    /// @notice Errors
    error InvalidAmount();
    error InvalidAddress();
    error InvalidAgreement();
    error InvalidStatus();
    error NotAuthorized();
    error TransferFailed();
    error InsufficientBalance();
    error TimeoutNotReached();
    error MilestoneNotCompleted();
    error InvalidMilestoneIndex();
    error FeeTooHigh();
    error AgreementExists();

    /**
     * @dev Constructor
     * @param _feeCollector Address to collect platform fees
     * @param _platformFeeBps Platform fee in basis points
     * @param admin Admin address
     */
    constructor(
        address _feeCollector,
        uint256 _platformFeeBps,
        address admin
    ) {
        if (_feeCollector == address(0)) revert InvalidAddress();
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        if (admin == address(0)) revert InvalidAddress();

        feeCollector = _feeCollector;
        platformFeeBps = _platformFeeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PLATFORM_ADMIN_ROLE, admin);
        _grantRole(ARBITRATOR_ROLE, admin);
    }

    /**
     * @dev Create a new escrow agreement
     * @param agreementId Unique identifier for the agreement
     * @param payee Address to receive payment
     * @param token Token address (address(0) for ETH)
     * @param useMilestones Whether to use milestone-based payments
     * @param milestonesAmounts Array of milestone amounts (empty if not using milestones)
     * @param milestonesDescriptions Array of milestone descriptions
     * @param description Agreement description
     */
    function createAgreement(
        bytes32 agreementId,
        address payee,
        address token,
        bool useMilestones,
        uint256[] calldata milestonesAmounts,
        string[] calldata milestonesDescriptions,
        string calldata description
    ) external whenNotPaused returns (bytes32) {
        if (payee == address(0) || payee == msg.sender) revert InvalidAddress();
        if (agreements[agreementId].payer != address(0)) revert AgreementExists();
        
        // Validate milestones
        if (useMilestones) {
            if (milestonesAmounts.length == 0 || 
                milestonesAmounts.length != milestonesDescriptions.length) {
                revert InvalidAmount();
            }
        }

        Agreement storage agreement = agreements[agreementId];
        agreement.payer = msg.sender;
        agreement.payee = payee;
        agreement.token = token;
        agreement.status = Status.PENDING;
        agreement.useMilestones = useMilestones;
        agreement.createdAt = block.timestamp;
        agreement.description = description;

        // Initialize milestones if using them
        if (useMilestones) {
            uint256 totalMilestoneAmount;
            for (uint256 i = 0; i < milestonesAmounts.length; i++) {
                agreement.milestones.push(Milestone({
                    amount: milestonesAmounts[i],
                    completed: false,
                    released: false,
                    description: milestonesDescriptions[i]
                }));
                totalMilestoneAmount += milestonesAmounts[i];
            }
            agreement.totalAmount = totalMilestoneAmount;
            agreement.remainingAmount = totalMilestoneAmount;
        }

        agreementIds.push(agreementId);
        userAgreements[msg.sender].push(agreementId);
        userAgreements[payee].push(agreementId);

        emit AgreementCreated(agreementId, msg.sender, payee, token, agreement.totalAmount);

        return agreementId;
    }

    /**
     * @dev Deposit payment for an agreement
     * @param agreementId The agreement ID
     * @param amount Amount to deposit (ignored if milestones used, use 0 for ETH)
     */
    function depositPayment(
        bytes32 agreementId,
        uint256 amount
    ) external payable nonReentrant whenNotPaused {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (agreement.status != Status.PENDING) revert InvalidStatus();
        if (msg.sender != agreement.payer) revert NotAuthorized();

        uint256 depositAmount;

        if (agreement.token == address(0)) {
            // ETH deposit
            depositAmount = msg.value;
            if (agreement.useMilestones) {
                if (depositAmount != agreement.totalAmount) revert InvalidAmount();
            } else {
                if (depositAmount != amount) revert InvalidAmount();
                agreement.totalAmount = amount;
                agreement.remainingAmount = amount;
            }
        } else {
            // ERC-20 deposit
            if (msg.value > 0) revert InvalidAmount();
            if (agreement.useMilestones) {
                depositAmount = agreement.totalAmount;
            } else {
                depositAmount = amount;
                agreement.totalAmount = amount;
                agreement.remainingAmount = amount;
            }
            
            IERC20(agreement.token).safeTransferFrom(
                msg.sender,
                address(this),
                depositAmount
            );
        }

        agreement.status = Status.FUNDED;
        agreement.releaseTimeout = block.timestamp + defaultTimeout;

        emit PaymentDeposited(agreementId, msg.sender, depositAmount);
    }

    /**
     * @dev Mark a milestone as completed (by payer)
     * @param agreementId The agreement ID
     * @param milestoneIndex Index of the milestone
     */
    function completeMilestone(
        bytes32 agreementId,
        uint256 milestoneIndex
    ) external whenNotPaused {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (msg.sender != agreement.payer) revert NotAuthorized();
        if (agreement.status != Status.FUNDED) revert InvalidStatus();
        if (!agreement.useMilestones) revert InvalidAgreement();
        if (milestoneIndex >= agreement.milestones.length) revert InvalidMilestoneIndex();

        Milestone storage milestone = agreement.milestones[milestoneIndex];
        if (milestone.completed) revert InvalidStatus();

        milestone.completed = true;

        emit MilestoneCompleted(agreementId, milestoneIndex);
    }

    /**
     * @dev Release funds for completed milestone or full agreement
     * @param agreementId The agreement ID
     * @param milestoneIndex Index of milestone to release (ignored if not using milestones, use type(uint256).max for all)
     */
    function releaseFunds(
        bytes32 agreementId,
        uint256 milestoneIndex
    ) external nonReentrant whenNotPaused {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (msg.sender != agreement.payer) revert NotAuthorized();
        if (agreement.status != Status.FUNDED) revert InvalidStatus();

        uint256 releaseAmount;
        uint256 feeAmount;

        if (agreement.useMilestones) {
            if (milestoneIndex >= agreement.milestones.length) revert InvalidMilestoneIndex();
            
            Milestone storage milestone = agreement.milestones[milestoneIndex];
            if (!milestone.completed) revert MilestoneNotCompleted();
            if (milestone.released) revert InvalidStatus();

            releaseAmount = milestone.amount;
            milestone.released = true;
        } else {
            releaseAmount = agreement.remainingAmount;
        }

        // Calculate fee
        feeAmount = (releaseAmount * platformFeeBps) / 10000;
        uint256 payeeAmount = releaseAmount - feeAmount;

        // Update state before transfer
        agreement.remainingAmount -= releaseAmount;
        agreement.feeAmount += feeAmount;
        totalFeesCollected += feeAmount;

        if (agreement.remainingAmount == 0) {
            agreement.status = Status.RELEASED;
            userStats[agreement.payer].completedDeals++;
        }

        // Transfer fee to collector
        _transferToken(agreement.token, feeCollector, feeAmount);

        // Transfer to payee
        _transferToken(agreement.token, agreement.payee, payeeAmount);

        emit FundsReleased(agreementId, agreement.payee, payeeAmount, feeAmount);
    }

    /**
     * @dev Raise a dispute
     * @param agreementId The agreement ID
     */
    function raiseDispute(bytes32 agreementId) external whenNotPaused {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (agreement.status != Status.FUNDED) revert InvalidStatus();
        if (msg.sender != agreement.payer && msg.sender != agreement.payee) {
            revert NotAuthorized();
        }

        agreement.status = Status.DISPUTED;
        userStats[msg.sender].disputedDeals++;

        emit DisputeRaised(agreementId, msg.sender);
    }

    /**
     * @dev Resolve a dispute (arbitrator only)
     * @param agreementId The agreement ID
     * @param refundPercent Percentage to refund to payer (0-10000, where 10000 = 100%)
     */
    function resolveDispute(
        bytes32 agreementId,
        uint256 refundPercent
    ) external nonReentrant onlyRole(ARBITRATOR_ROLE) {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (agreement.status != Status.DISPUTED) revert InvalidStatus();
        if (refundPercent > 10000) revert InvalidAmount();

        uint256 totalRemaining = agreement.remainingAmount;
        uint256 refundAmount = (totalRemaining * refundPercent) / 10000;
        uint256 releaseAmount = totalRemaining - refundAmount;
        uint256 feeAmount = (totalRemaining * platformFeeBps) / 10000;

        agreement.status = Status.RELEASED;
        agreement.remainingAmount = 0;
        agreement.feeAmount += feeAmount;
        totalFeesCollected += feeAmount;

        // Deduct fee from release amount only
        uint256 actualRelease = releaseAmount > feeAmount ? releaseAmount - feeAmount : 0;

        // Transfer refund to payer
        if (refundAmount > 0) {
            _transferToken(agreement.token, agreement.payer, refundAmount);
        }

        // Transfer to payee
        if (actualRelease > 0) {
            _transferToken(agreement.token, agreement.payee, actualRelease);
        }

        // Transfer fee to collector
        if (feeAmount > 0) {
            _transferToken(agreement.token, feeCollector, feeAmount);
        }

        emit DisputeResolved(
            agreementId,
            agreement.payer,
            agreement.payee,
            refundAmount,
            actualRelease
        );
    }

    /**
     * @dev Cancel agreement by mutual consent
     * @param agreementId The agreement ID
     */
    function cancelAgreement(bytes32 agreementId) external nonReentrant whenNotPaused {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (agreement.status != Status.PENDING && agreement.status != Status.FUNDED) {
            revert InvalidStatus();
        }
        
        // Both parties must agree to cancel
        if (agreement.status == Status.FUNDED) {
            // For now, only payer can cancel if funded (can be extended to require both signatures)
            if (msg.sender != agreement.payer) revert NotAuthorized();
            
            // Refund remaining amount
            uint256 refundAmount = agreement.remainingAmount;
            agreement.remainingAmount = 0;
            
            _transferToken(agreement.token, agreement.payer, refundAmount);
            emit RefundIssued(agreementId, agreement.payer, refundAmount);
        }

        agreement.status = Status.CANCELLED;

        emit AgreementCancelled(agreementId);
    }

    /**
     * @dev Auto-release funds after timeout (anyone can call)
     * @param agreementId The agreement ID
     */
    function autoRelease(bytes32 agreementId) external nonReentrant whenNotPaused {
        Agreement storage agreement = agreements[agreementId];
        
        if (agreement.payer == address(0)) revert InvalidAgreement();
        if (agreement.status != Status.FUNDED) revert InvalidStatus();
        if (block.timestamp < agreement.releaseTimeout) revert TimeoutNotReached();

        uint256 releaseAmount = agreement.remainingAmount;
        uint256 feeAmount = (releaseAmount * platformFeeBps) / 10000;
        uint256 payeeAmount = releaseAmount - feeAmount;

        agreement.status = Status.RELEASED;
        agreement.remainingAmount = 0;
        agreement.feeAmount += feeAmount;
        totalFeesCollected += feeAmount;

        // Transfer fee
        _transferToken(agreement.token, feeCollector, feeAmount);

        // Transfer to payee
        _transferToken(agreement.token, agreement.payee, payeeAmount);

        emit FundsReleased(agreementId, agreement.payee, payeeAmount, feeAmount);
    }

    /**
     * @dev Internal function to transfer tokens or ETH
     */
    function _transferToken(
        address token,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0) return;

        if (token == address(0)) {
            // ETH transfer
            (bool success, ) = payable(to).call{value: amount}('');
            if (!success) revert TransferFailed();
        } else {
            // ERC-20 transfer
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @dev Update platform fee (admin only)
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyRole(PLATFORM_ADMIN_ROLE) {
        if (newFeeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    /**
     * @dev Update fee collector address (admin only)
     * @param newCollector New fee collector address
     */
    function setFeeCollector(address newCollector) external onlyRole(PLATFORM_ADMIN_ROLE) {
        if (newCollector == address(0)) revert InvalidAddress();
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }

    /**
     * @dev Update default timeout (admin only)
     * @param newTimeout New timeout in seconds
     */
    function setDefaultTimeout(uint256 newTimeout) external onlyRole(PLATFORM_ADMIN_ROLE) {
        defaultTimeout = newTimeout;
        emit TimeoutUpdated(newTimeout);
    }

    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Get agreement details
     */
    function getAgreement(bytes32 agreementId) external view returns (Agreement memory) {
        return agreements[agreementId];
    }

    /**
     * @dev Get user's agreements
     */
    function getUserAgreements(address user) external view returns (bytes32[] memory) {
        return userAgreements[user];
    }

    /**
     * @dev Get total number of agreements
     */
    function getTotalAgreements() external view returns (uint256) {
        return agreementIds.length;
    }

    /**
     * @dev Get agreement milestones
     */
    function getMilestones(bytes32 agreementId) external view returns (Milestone[] memory) {
        return agreements[agreementId].milestones;
    }

    /**
     * @dev Check if can auto-release
     */
    function canAutoRelease(bytes32 agreementId) external view returns (bool) {
        Agreement memory agreement = agreements[agreementId];
        return agreement.status == Status.FUNDED && 
               block.timestamp >= agreement.releaseTimeout;
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
