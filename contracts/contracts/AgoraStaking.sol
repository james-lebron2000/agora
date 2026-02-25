// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import {Pausable} from '@openzeppelin/contracts/security/Pausable.sol';
import {AccessControl} from '@openzeppelin/contracts/access/AccessControl.sol';
import {Math} from '@openzeppelin/contracts/utils/math/Math.sol';

/**
 * @title AgoraStaking
 * @dev 4-Tier Staking System with time-locked rewards
 * Tiers:
 * - Bronze (30 days): 5% APY, min 100 tokens
 * - Silver (90 days): 8% APY, min 500 tokens
 * - Gold (180 days): 12% APY, min 2000 tokens
 * - Platinum (365 days): 18% APY, min 5000 tokens
 */
contract AgoraStaking is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /// @notice Staking token contract
    IERC20 public immutable stakingToken;
    
    /// @notice Reward token contract (can be same as stakingToken)
    IERC20 public immutable rewardToken;
    
    /// @notice Admin role for managing rewards
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256('REWARD_MANAGER_ROLE');
    
    /// @notice Emergency role for emergency withdrawals
    bytes32 public constant EMERGENCY_ROLE = keccak256('EMERGENCY_ROLE');

    /// @notice Staking tiers configuration
    struct Tier {
        uint256 lockPeriod;      // Lock period in seconds
        uint256 rewardRate;      // Annual reward rate (basis points, 10000 = 100%)
        uint256 minStake;        // Minimum stake amount
        uint256 totalStaked;     // Total tokens staked in this tier
    }

    /// @notice Stake information per user and tier
    struct Stake {
        uint256 amount;          // Staked amount
        uint256 startTime;       // Staking start timestamp
        uint256 endTime;         // When stake can be withdrawn
        uint256 rewardDebt;      // Accumulated reward debt
        uint256 lastClaimTime;   // Last reward claim timestamp
        bool active;             // Whether stake is still active
    }

    /// @notice Tier levels enum
    enum TierLevel { BRONZE, SILVER, GOLD, PLATINUM }

    /// @notice Tier configurations (indexed by TierLevel)
    mapping(TierLevel => Tier) public tiers;
    
    /// @notice User stakes: user => tier => stake array
    mapping(address => mapping(TierLevel => Stake[])) public userStakes;
    
    /// @notice Total rewards allocated to the contract
    uint256 public totalRewardPool;
    
    /// @notice Total rewards distributed
    uint256 public totalRewardsDistributed;
    
    /// @notice Emergency mode flag
    bool public emergencyMode;

    /// @notice Seconds per year for APY calculation
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    
    /// @notice Basis points denominator
    uint256 private constant BPS_DENOMINATOR = 10000;

    /// @notice Events
    event TierConfigured(TierLevel indexed tier, uint256 lockPeriod, uint256 rewardRate, uint256 minStake);
    event Staked(address indexed user, TierLevel indexed tier, uint256 amount, uint256 stakeIndex);
    event Unstaked(address indexed user, TierLevel indexed tier, uint256 amount, uint256 stakeIndex);
    event RewardsClaimed(address indexed user, TierLevel indexed tier, uint256 amount, uint256 stakeIndex);
    event RewardsDeposited(address indexed depositor, uint256 amount);
    event EmergencyWithdraw(address indexed user, TierLevel indexed tier, uint256 amount);
    event EmergencyModeToggled(bool enabled);

    /// @notice Errors
    error InvalidAmount();
    error InvalidTier();
    error StakeLocked();
    error InsufficientRewards();
    error NoActiveStake();
    error EmergencyModeActive();
    error TransferFailed();

    /**
     * @dev Constructor initializes the contract with token addresses
     * @param _stakingToken Address of the token to be staked
     * @param _rewardToken Address of the token used for rewards
     * @param admin Address to receive admin roles
     */
    constructor(
        address _stakingToken,
        address _rewardToken,
        address admin
    ) {
        require(_stakingToken != address(0), 'AgoraStaking: zero staking token');
        require(_rewardToken != address(0), 'AgoraStaking: zero reward token');
        require(admin != address(0), 'AgoraStaking: zero admin');

        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REWARD_MANAGER_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);

        // Initialize tiers
        _initializeTiers();
    }

    /**
     * @dev Initialize default tier configurations
     */
    function _initializeTiers() internal {
        // Bronze: 30 days, 5% APY, min 100 tokens
        tiers[TierLevel.BRONZE] = Tier({
            lockPeriod: 30 days,
            rewardRate: 500,     // 5%
            minStake: 100 * 10 ** 18,
            totalStaked: 0
        });

        // Silver: 90 days, 8% APY, min 500 tokens
        tiers[TierLevel.SILVER] = Tier({
            lockPeriod: 90 days,
            rewardRate: 800,     // 8%
            minStake: 500 * 10 ** 18,
            totalStaked: 0
        });

        // Gold: 180 days, 12% APY, min 2000 tokens
        tiers[TierLevel.GOLD] = Tier({
            lockPeriod: 180 days,
            rewardRate: 1200,    // 12%
            minStake: 2000 * 10 ** 18,
            totalStaked: 0
        });

        // Platinum: 365 days, 18% APY, min 5000 tokens
        tiers[TierLevel.PLATINUM] = Tier({
            lockPeriod: 365 days,
            rewardRate: 1800,    // 18%
            minStake: 5000 * 10 ** 18,
            totalStaked: 0
        });
    }

    /**
     * @dev Update tier configuration (only admin)
     * @param tier The tier level to update
     * @param lockPeriod New lock period in seconds
     * @param rewardRate New reward rate in basis points
     * @param minStake New minimum stake amount
     */
    function updateTier(
        TierLevel tier,
        uint256 lockPeriod,
        uint256 rewardRate,
        uint256 minStake
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tiers[tier].lockPeriod = lockPeriod;
        tiers[tier].rewardRate = rewardRate;
        tiers[tier].minStake = minStake;

        emit TierConfigured(tier, lockPeriod, rewardRate, minStake);
    }

    /**
     * @dev Stake tokens in a specific tier
     * @param tier The tier level to stake in
     * @param amount Amount of tokens to stake
     */
    function stake(
        TierLevel tier,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        Tier storage tierConfig = tiers[tier];
        if (amount < tierConfig.minStake) revert InvalidAmount();

        // Transfer tokens from user
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create stake
        Stake memory newStake = Stake({
            amount: amount,
            startTime: block.timestamp,
            endTime: block.timestamp + tierConfig.lockPeriod,
            rewardDebt: 0,
            lastClaimTime: block.timestamp,
            active: true
        });

        uint256 stakeIndex = userStakes[msg.sender][tier].length;
        userStakes[msg.sender][tier].push(newStake);

        // Update tier total
        tierConfig.totalStaked += amount;

        emit Staked(msg.sender, tier, amount, stakeIndex);
    }

    /**
     * @dev Unstake tokens after lock period and claim rewards
     * @param tier The tier level to unstake from
     * @param stakeIndex The index of the specific stake
     */
    function unstake(
        TierLevel tier,
        uint256 stakeIndex
    ) external nonReentrant whenNotPaused {
        if (emergencyMode) revert EmergencyModeActive();

        Stake storage userStake = userStakes[msg.sender][tier][stakeIndex];
        
        if (!userStake.active) revert NoActiveStake();
        if (block.timestamp < userStake.endTime) revert StakeLocked();

        uint256 amount = userStake.amount;
        uint256 pendingRewards = calculatePendingRewards(msg.sender, tier, stakeIndex);

        // Mark as inactive before transfers (reentrancy protection)
        userStake.active = false;

        // Update tier total
        tiers[tier].totalStaked -= amount;

        // Transfer staked tokens back
        stakingToken.safeTransfer(msg.sender, amount);

        // Transfer rewards if any
        if (pendingRewards > 0) {
            _distributeRewards(msg.sender, pendingRewards);
        }

        emit Unstaked(msg.sender, tier, amount, stakeIndex);
    }

    /**
     * @dev Claim rewards without unstaking
     * @param tier The tier level
     * @param stakeIndex The index of the specific stake
     */
    function claimRewards(
        TierLevel tier,
        uint256 stakeIndex
    ) external nonReentrant whenNotPaused {
        Stake storage userStake = userStakes[msg.sender][tier][stakeIndex];
        
        if (!userStake.active) revert NoActiveStake();

        uint256 pendingRewards = calculatePendingRewards(msg.sender, tier, stakeIndex);
        if (pendingRewards == 0) revert InvalidAmount();

        userStake.lastClaimTime = block.timestamp;
        userStake.rewardDebt += pendingRewards;

        _distributeRewards(msg.sender, pendingRewards);

        emit RewardsClaimed(msg.sender, tier, pendingRewards, stakeIndex);
    }

    /**
     * @dev Internal function to distribute rewards
     */
    function _distributeRewards(address user, uint256 amount) internal {
        if (amount > rewardToken.balanceOf(address(this))) {
            revert InsufficientRewards();
        }
        
        totalRewardsDistributed += amount;
        rewardToken.safeTransfer(user, amount);
    }

    /**
     * @dev Calculate pending rewards for a stake
     * Formula: (amount * rewardRate * timeElapsed) / (SECONDS_PER_YEAR * BPS_DENOMINATOR)
     */
    function calculatePendingRewards(
        address user,
        TierLevel tier,
        uint256 stakeIndex
    ) public view returns (uint256) {
        Stake memory userStake = userStakes[user][tier][stakeIndex];
        
        if (!userStake.active) return 0;

        uint256 timeElapsed = block.timestamp - userStake.lastClaimTime;
        uint256 rewardRate = tiers[tier].rewardRate;

        // Calculate: (amount * rewardRate * timeElapsed) / (SECONDS_PER_YEAR * 10000)
        uint256 rewards = (userStake.amount * rewardRate * timeElapsed) / 
                         (SECONDS_PER_YEAR * BPS_DENOMINATOR);

        return rewards;
    }

    /**
     * @dev Get all stakes for a user in a specific tier
     */
    function getUserStakes(
        address user,
        TierLevel tier
    ) external view returns (Stake[] memory) {
        return userStakes[user][tier];
    }

    /**
     * @dev Get total number of stakes for a user in a tier
     */
    function getUserStakeCount(
        address user,
        TierLevel tier
    ) external view returns (uint256) {
        return userStakes[user][tier].length;
    }

    /**
     * @dev Deposit reward tokens to the contract
     */
    function depositRewards(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        totalRewardPool += amount;

        emit RewardsDeposited(msg.sender, amount);
    }

    /**
     * @dev Emergency withdraw (bypasses lock period, no rewards)
     * @param tier The tier level
     * @param stakeIndex The index of the stake
     */
    function emergencyWithdraw(
        TierLevel tier,
        uint256 stakeIndex
    ) external nonReentrant {
        if (!emergencyMode && !hasRole(EMERGENCY_ROLE, msg.sender)) {
            revert InvalidTier();
        }

        Stake storage userStake = userStakes[msg.sender][tier][stakeIndex];
        
        if (!userStake.active) revert NoActiveStake();

        uint256 amount = userStake.amount;
        userStake.active = false;
        tiers[tier].totalStaked -= amount;

        stakingToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, tier, amount);
    }

    /**
     * @dev Toggle emergency mode
     */
    function toggleEmergencyMode() external onlyRole(EMERGENCY_ROLE) {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Get tier info
     */
    function getTierInfo(TierLevel tier) external view returns (Tier memory) {
        return tiers[tier];
    }

    /**
     * @dev Calculate total staked across all tiers
     */
    function getTotalStaked() external view returns (uint256 total) {
        total = tiers[TierLevel.BRONZE].totalStaked +
                tiers[TierLevel.SILVER].totalStaked +
                tiers[TierLevel.GOLD].totalStaked +
                tiers[TierLevel.PLATINUM].totalStaked;
    }

    /**
     * @dev Get available rewards in the contract
     */
    function getAvailableRewards() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    /**
     * @dev Rescue tokens accidentally sent to contract (except staking/reward tokens)
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(stakingToken), 'Cannot rescue staking token');
        require(token != address(rewardToken), 'Cannot rescue reward token');
        require(to != address(0), 'Zero address');
        
        IERC20(token).safeTransfer(to, amount);
    }
}
