# Agora Protocol Smart Contracts

Production-ready Solidity smart contracts for the Agora Protocol - a comprehensive token, staking, and escrow system.

## 📋 Overview

| Contract | Description | Key Features |
|----------|-------------|--------------|
| `AgoraToken.sol` | ERC-20 Governance Token | Mintable, Burnable, Pausable, Permit, Votes |
| `AgoraStaking.sol` | 4-Tier Staking System | Bronze/Silver/Gold/Platinum tiers with time-locked rewards |
| `AgoraEscrow.sol` | Payment Escrow with Fees | Multi-token support, milestones, dispute resolution |

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AgoraToken    │────▶│  AgoraStaking   │     │  AgoraEscrow    │
│   (ERC-20 +     │     │   (4-Tier       │     │ (Payment        │
│   Governance)   │     │   Staking)      │     │   Escrow)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  OpenZeppelin   │     │  OpenZeppelin   │     │  OpenZeppelin   │
│  ERC-20 Votes   │     │  ReentrancyGuard│     │  ReentrancyGuard│
│  AccessControl  │     │  Pausable       │     │  Pausable       │
│  ERC-20 Permit  │     │  AccessControl  │     │  AccessControl  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- Hardhat
- OpenZeppelin Contracts v5

### Installation

```bash
cd contracts
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run coverage
```

## 📊 Contract Details

### AgoraToken

**Features:**
- **ERC-20 Standard**: Full ERC-20 compatibility
- **ERC-20 Permit**: Gasless approvals via signatures
- **ERC-20 Votes**: On-chain governance with delegation and checkpoints
- **Access Control**: Role-based permissions (MINTER, PAUSER, BURNER)
- **Pausable**: Emergency pause functionality
- **Burnable**: Token burning with role-based permissions

**Tokenomics:**
- Name: Agora Token
- Symbol: AGORA
- Decimals: 18
- Max Supply: 100,000,000 AGORA

### AgoraStaking

**4-Tier System:**

| Tier | Lock Period | APY | Min Stake |
|------|-------------|-----|-----------|
| Bronze | 30 days | 5% | 100 AGORA |
| Silver | 90 days | 8% | 500 AGORA |
| Gold | 180 days | 12% | 2,000 AGORA |
| Platinum | 365 days | 18% | 5,000 AGORA |

**Features:**
- Time-locked staking periods
- APY-based reward calculation
- Multiple stakes per tier
- Emergency withdrawal mode
- Claim rewards without unstaking
- Configurable tier parameters

### AgoraEscrow

**Features:**
- **Multi-Token Support**: ETH and ERC-20 tokens
- **Milestone Payments**: Milestone-based release schedules
- **Dispute Resolution**: Arbitrator-mediated disputes
- **Auto-Release**: Automatic release after timeout (30 days default)
- **Platform Fees**: Configurable up to 10%
- **Pausable**: Emergency pause functionality

**Fee Structure:**
- Platform Fee: 2.5% (configurable, max 10%)
- Fee Collector: Configurable address

## 📝 Deployment

### Local Development

```bash
# Start local node
npm run node

# Deploy to localhost
npm run deploy:localhost
```

### Testnet (Sepolia)

1. Create `.env` file:
```
PRIVATE_KEY=your_private_key
SEPOLIA_RPC=https://rpc.sepolia.org
ETHERSCAN_API_KEY=your_etherscan_key
```

2. Deploy:
```bash
npm run deploy:testnet
```

### Mainnet

```bash
npm run deploy -- --network mainnet
```

## 🧪 Testing

Comprehensive test suite covering:

- ✅ Unit tests for all functions
- ✅ Integration tests
- ✅ Access control validation
- ✅ Edge cases and error conditions
- ✅ Reentrancy protection
- ✅ Gas optimization verification

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/AgoraToken.test.js
npx hardhat test test/AgoraStaking.test.js
npx hardhat test test/AgoraEscrow.test.js
```

## 🔒 Security

### Audited Patterns

- ReentrancyGuard for all external calls
- Checks-Effects-Interactions pattern
- Role-based access control
- Pausable emergency stops
- SafeERC20 for token transfers

### Access Control Roles

**AgoraToken:**
- `DEFAULT_ADMIN_ROLE`: Full admin control
- `MINTER_ROLE`: Token minting
- `PAUSER_ROLE`: Pause/unpause
- `BURNER_ROLE`: Force burn tokens

**AgoraStaking:**
- `DEFAULT_ADMIN_ROLE`: Tier management, pausing
- `REWARD_MANAGER_ROLE`: Reward deposits
- `EMERGENCY_ROLE`: Emergency mode toggle

**AgoraEscrow:**
- `DEFAULT_ADMIN_ROLE`: Contract configuration
- `PLATFORM_ADMIN_ROLE`: Fee and timeout settings
- `ARBITRATOR_ROLE`: Dispute resolution

## 📜 License

MIT License - see LICENSE file for details

## 🔗 Dependencies

- OpenZeppelin Contracts v5.0.2
- Hardhat v2.22.0
- Hardhat Toolbox v5.0.0

## 📞 Support

For questions or issues, please refer to the contract documentation in the source files.
