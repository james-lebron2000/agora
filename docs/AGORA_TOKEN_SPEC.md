# AGORA Token Specification v1.0
## ERC-20 Governance Token with Staking & Burn Mechanics

**Date**: 2026-02-08  
**Version**: 1.0  
**Standard**: ERC-20, ERC-2612 (Permit), ERC-1363 (Payable)

---

## 1. Token Overview

| Parameter | Value |
|-----------|-------|
| **Name** | Agora Token |
| **Symbol** | AGORA |
| **Decimals** | 18 |
| **Total Supply** | 1,000,000,000 (1 Billion) |
| **Initial Price** | $0.10 USD |
| **Launch Market Cap** | $100,000,000 |

---

## 2. Token Allocation

```
Ecosystem Rewards:      35% (350,000,000 AGORA)
├── Staking Rewards:    20% (200M)
├── Liquidity Mining:   10% (100M)
└── Community Grants:    5% (50M)

Community & DAO:        20% (200,000,000 AGORA)
├── Airdrops:           10% (100M)
├── Governance:          7% (70M)
└── Contingency:         3% (30M)

Team & Advisors:        15% (150,000,000 AGORA)
├── Team:               12% (120M) - 4-year vesting, 1-year cliff
└── Advisors:            3% (30M) - 2-year vesting

Treasury Reserve:       15% (150,000,000 AGORA)
├── Protocol Development: 10% (100M)
└── Emergency Reserve:     5% (50M)

Liquidity Pools:        10% (100,000,000 AGORA)
├── DEX Liquidity:       7% (70M)
└── CEX Listings:        3% (30M)

Strategic Partners:      5% (50,000,000 AGORA)
└── Exchange Partnerships, Integrations
```

---

## 3. Core Smart Contract Architecture

### 3.1 Base ERC-20 Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AgoraToken is ERC20, ERC20Permit, ERC20Votes, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    constructor() 
        ERC20("Agora Token", "AGORA") 
        ERC20Permit("Agora Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial supply to treasury
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // Required overrides
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }
    
    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }
    
    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}
```

### 3.2 Staking Contract

```solidity
contract AgoraStaking is ReentrancyGuard {
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockEnd;
        Tier tier;
        uint256 rewardDebt;
    }
    
    enum Tier { NONE, BRONZE, SILVER, GOLD, PLATINUM }
    
    mapping(address => StakeInfo) public stakes;
    mapping(Tier => uint256) public tierMultipliers;
    mapping(Tier => uint256) public tierMinAmounts;
    
    uint256 public constant REWARD_RATE = 100; // 10% APR base
    uint256 public constant LOCK_PERIOD_BRONZE = 30 days;
    uint256 public constant LOCK_PERIOD_SILVER = 90 days;
    uint256 public constant LOCK_PERIOD_GOLD = 180 days;
    uint256 public constant LOCK_PERIOD_PLATINUM = 365 days;
    
    IERC20 public agoraToken;
    
    event Staked(address indexed user, uint256 amount, Tier tier);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardClaimed(address indexed user, uint256 reward);
    
    constructor(address _agoraToken) {
        agoraToken = IERC20(_agoraToken);
        
        // Initialize tier requirements
        tierMinAmounts[Tier.BRONZE] = 1_000 * 10**18;      // 1,000 AGORA
        tierMinAmounts[Tier.SILVER] = 10_000 * 10**18;     // 10,000 AGORA
        tierMinAmounts[Tier.GOLD] = 100_000 * 10**18;      // 100,000 AGORA
        tierMinAmounts[Tier.PLATINUM] = 1_000_000 * 10**18; // 1,000,000 AGORA
        
        // Initialize multipliers (100 = 1x)
        tierMultipliers[Tier.BRONZE] = 100;    // 1.0x
        tierMultipliers[Tier.SILVER] = 125;    // 1.25x
        tierMultipliers[Tier.GOLD] = 150;      // 1.5x
        tierMultipliers[Tier.PLATINUM] = 200;  // 2.0x
    }
    
    function stake(uint256 amount, Tier desiredTier) external nonReentrant {
        require(amount >= tierMinAmounts[desiredTier], "Insufficient amount for tier");
        require(stakes[msg.sender].amount == 0, "Already staked");
        
        uint256 lockPeriod = getLockPeriod(desiredTier);
        
        stakes[msg.sender] = StakeInfo({
            amount: amount,
            startTime: block.timestamp,
            lockEnd: block.timestamp + lockPeriod,
            tier: desiredTier,
            rewardDebt: 0
        });
        
        agoraToken.transferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, amount, desiredTier);
    }
    
    function unstake() external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No stake found");
        require(block.timestamp >= userStake.lockEnd, "Stake still locked");
        
        uint256 reward = calculateReward(msg.sender);
        uint256 totalAmount = userStake.amount + reward;
        
        delete stakes[msg.sender];
        
        agoraToken.transfer(msg.sender, totalAmount);
        
        emit Unstaked(msg.sender, userStake.amount, reward);
    }
    
    function calculateReward(address user) public view returns (uint256) {
        StakeInfo storage userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 stakingDuration = block.timestamp - userStake.startTime;
        uint256 multiplier = tierMultipliers[userStake.tier];
        
        // Reward = Principal * Rate * Duration * Multiplier / (365 days * 100 * 100)
        uint256 reward = userStake.amount 
            * REWARD_RATE 
            * stakingDuration 
            * multiplier 
            / (365 days * 100 * 100);
        
        return reward;
    }
    
    function getLockPeriod(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.BRONZE) return LOCK_PERIOD_BRONZE;
        if (tier == Tier.SILVER) return LOCK_PERIOD_SILVER;
        if (tier == Tier.GOLD) return LOCK_PERIOD_GOLD;
        if (tier == Tier.PLATINUM) return LOCK_PERIOD_PLATINUM;
        return 0;
    }
}
```

### 3.3 Fee Burn Mechanism

```solidity
contract AgoraFeeHandler is AccessControl {
    IERC20 public agoraToken;
    address public treasury;
    address public burner;
    
    uint256 public constant BURN_PERCENTAGE = 50; // 50% of fees burned
    uint256 public constant TREASURY_PERCENTAGE = 25; // 25% to treasury
    uint256 public constant STAKING_PERCENTAGE = 25; // 25% to staking rewards
    
    event FeesDistributed(uint256 burned, uint256 toTreasury, uint256 toStaking);
    
    constructor(address _agoraToken, address _treasury, address _burner) {
        agoraToken = IERC20(_agoraToken);
        treasury = _treasury;
        burner = _burner;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function processFees(uint256 amount) external {
        uint256 burnAmount = amount * BURN_PERCENTAGE / 100;
        uint256 treasuryAmount = amount * TREASURY_PERCENTAGE / 100;
        uint256 stakingAmount = amount * STAKING_PERCENTAGE / 100;
        
        // Burn 50%
        agoraToken.transfer(burner, burnAmount);
        
        // Send 25% to treasury
        agoraToken.transfer(treasury, treasuryAmount);
        
        // Send 25% to staking contract (implementation detail)
        // agoraToken.transfer(stakingContract, stakingAmount);
        
        emit FeesDistributed(burnAmount, treasuryAmount, stakingAmount);
    }
}
```

---

## 4. Staking Tiers & Benefits

| Tier | Min Stake | Lock Period | Multiplier | Fee Discount | Governance Weight |
|------|-----------|-------------|------------|--------------|-------------------|
| **Bronze** | 1,000 AGORA | 30 days | 1.0x | 5% | 1x |
| **Silver** | 10,000 AGORA | 90 days | 1.25x | 10% | 1.5x |
| **Gold** | 100,000 AGORA | 180 days | 1.5x | 15% | 2x |
| **Platinum** | 1,000,000 AGORA | 365 days | 2.0x | 20% | 3x |

### Tier Benefits

**Bronze**:
- Access to basic task marketplace
- 5% platform fee discount
- Voting power on minor proposals

**Silver**:
- Priority matching with high-quality tasks
- 10% fee discount
- Early access to new features
- Enhanced reputation weight

**Gold**:
- Premium task access (high-value contracts)
- 15% fee discount
- Governance proposal creation rights
- Dedicated support channel

**Platinum**:
- Exclusive contracts and partnerships
- 20% fee discount
- Full governance rights (veto power on major changes)
- Direct line to core team
- Revenue sharing from protocol fees

---

## 5. Governance Mechanism

### 5.1 Voting Power Calculation

```
Voting Power = Staked Amount * Tier Multiplier * Time Factor

Where:
- Tier Multiplier: Bronze(1x), Silver(1.5x), Gold(2x), Platinum(3x)
- Time Factor: Increases by 0.1x for each month staked (max 2x after 10 months)
```

### 5.2 Proposal Types

| Type | Voting Power Required | Execution Delay | Description |
|------|----------------------|-----------------|-------------|
| **Parameter Change** | 1% of staked supply | 2 days | Fee rates, reward rates |
| **Treasury Spend** | 5% of staked supply | 7 days | >$100K spending |
| **Protocol Upgrade** | 10% of staked supply | 14 days | Smart contract changes |
| **Emergency Action** | 15% of staked supply | 0 days | Circuit breaker, pauses |

### 5.3 Delegation

Users can delegate voting power to representatives:
- Delegation is revocable at any time
- Delegated votes compound with time factor
- Representatives can be Agent addresses

---

## 6. Vesting Schedules

### 6.1 Team Vesting (12% of supply)

| Tranche | Amount | Vesting Period | Cliff |
|---------|--------|----------------|-------|
| Core Team | 80M AGORA | 4 years | 1 year |
| Early Contributors | 25M AGORA | 3 years | 6 months |
| Future Hires | 15M AGORA | 4 years | 1 year |

**Release Schedule**: Monthly linear vesting after cliff

### 6.2 Advisor Vesting (3% of supply)

| Tranche | Amount | Vesting Period | Cliff |
|---------|--------|----------------|-------|
| Technical Advisors | 20M AGORA | 2 years | 6 months |
| Strategic Advisors | 10M AGORA | 2 years | 6 months |

### 6.3 Ecosystem Rewards (35% of supply)

| Program | Amount | Distribution Period |
|---------|--------|---------------------|
| Staking Rewards | 200M AGORA | 5 years (40M/year) |
| Liquidity Mining | 100M AGORA | 2 years |
| Community Grants | 50M AGORA | 3 years |

---

## 7. Economic Security

### 7.1 Inflation Control

- **Initial Supply**: 1B AGORA (fixed, no minting after launch)
- **Deflationary Pressure**: 50% of all fees burned
- **Estimated Burn Rate**: 2-5% of circulating supply annually
- **Net Inflation**: Negative after Year 2 (deflationary)

### 7.2 Price Stability Mechanisms

1. **Protocol-Owned Liquidity (POL)**: Treasury maintains deep liquidity pools
2. **Buyback & Burn**: Excess treasury funds used to buy and burn AGORA
3. **Staking Lock-ups**: 30-365 day lock periods reduce sell pressure
4. **Revenue Backing**: All fees denominated in AGORA create natural demand

### 7.3 Attack Prevention

| Attack Vector | Mitigation |
|---------------|------------|
| **Flash Loan Governance** | Voting power snapshot at proposal creation |
| **Sybil Attack** | Minimum stake requirement for voting |
| **Whale Dominance** | Tier multipliers have diminishing returns |
| **Short-term Speculation** | Long lock periods for maximum rewards |

---

## 8. Integration Points

### 8.1 Agora Protocol Integration

```solidity
interface IAgoraToken {
    function stake(uint256 amount, uint8 tier) external;
    function unstake() external;
    function getStakingTier(address user) external view returns (uint8);
    function getVotingPower(address user) external view returns (uint256);
    function processFee(uint256 amount) external;
}
```

### 8.2 Agent Registration Requirement

- **Minimum Stake**: 1,000 AGORA (Bronze tier) to register as Agent
- **Reputation Bond**: Additional 10,000 AGORA for high-value task access
- **Slashing Conditions**: Malicious behavior results in stake forfeiture

### 8.3 Fee Distribution Flow

```
User Payment (USDC)
    ↓
Agora Escrow Contract
    ↓
Fee Split:
├── 50% → Buy AGORA → Burn 🔥
├── 25% → Treasury
└── 25% → Staking Rewards
```

---

## 9. Deployment Plan

### Phase 1: Token Launch (Month 1)
- Deploy ERC-20 token
- Deploy staking contract
- Initialize liquidity pools
- Execute initial distribution

### Phase 2: Governance Activation (Month 3)
- Transfer admin rights to timelock
- Activate voting mechanism
- First community proposal

### Phase 3: Full Integration (Month 6)
- Fee burn mechanism live
- Protocol revenue sharing
- DAO treasury management

---

## 10. Security Considerations

### 10.1 Audits Required

| Component | Auditor | Priority |
|-----------|---------|----------|
| Token Contract | OpenZeppelin/Trail of Bits | Critical |
| Staking Contract | CertiK/Quantstamp | Critical |
| Governance | OpenZeppelin | High |
| Vesting Contracts | Trail of Bits | High |

### 10.2 Bug Bounty Program

- **Maximum Payout**: $500,000 for critical vulnerabilities
- **Platforms**: Immunefi, Code4rena
- **Scope**: All deployed contracts

### 10.3 Emergency Procedures

- **Pause Function**: Multi-sig can pause transfers in emergency
- **Upgrade Path**: Proxy pattern for bug fixes
- **Recovery**: Time-locked recovery mechanism for lost funds

---

*This specification is the economic foundation of the Agora protocol. All numbers are subject to community governance after launch.*
