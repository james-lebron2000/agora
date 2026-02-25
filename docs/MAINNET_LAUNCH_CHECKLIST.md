# Mainnet Launch Checklist
## Agora Protocol Production Deployment

**Date**: 2026-02-08  
**Version**: 1.0  
**Status**: ⏳ Pre-launch Phase

---

## Phase 1: Smart Contract Deployment (Day 1-3)

### 1.1 Pre-Deployment Checklist

- [ ] **Audit Completion**
  - [ ] OpenZeppelin audit report received
  - [ ] Trail of Bits audit report received
  - [ ] Critical vulnerabilities resolved
  - [ ] Final audit commit hash: `________________`

- [ ] **Testnet Verification**
  - [ ] Base Sepolia deployment successful
  - [ ] All functions tested on testnet
  - [ ] 100+ test transactions processed
  - [ ] No critical bugs in 7-day test period

- [ ] **Multi-Sig Configuration**
  - [ ] Gnosis Safe created (3-of-5 threshold)
  - [ ] Signers identified and verified:
    - [ ] Signer 1: `0x...`
    - [ ] Signer 2: `0x...`
    - [ ] Signer 3: `0x...`
    - [ ] Signer 4: `0x...`
    - [ ] Signer 5: `0x...`
  - [ ] Hardware wallets confirmed
  - [ ] Backup procedures documented

### 1.2 Token Contract Deployment

```bash
# Deploy AgoraToken
npx hardhat run scripts/deploy-token.ts --network base_mainnet

# Expected Output:
# AgoraToken deployed to: 0x.................................
# Transaction hash: 0x.................................
# Gas used: 2,847,293
```

- [ ] Token contract deployed
- [ ] Etherscan verification submitted
- [ ] Contract ownership transferred to multi-sig
- [ ] Initial supply minted to treasury

### 1.3 Staking Contract Deployment

```bash
# Deploy AgoraStaking
npx hardhat run scripts/deploy-staking.ts --network base_mainnet

# Expected Output:
# AgoraStaking deployed to: 0x.................................
# Reward pool initialized
```

- [ ] Staking contract deployed
- [ ] Reward parameters configured
- [ ] Tier multipliers verified
- [ ] Etherscan verification complete

### 1.4 Escrow Contract Deployment

- [ ] AgoraEscrow deployed
- [ ] Fee handler configured (50% burn, 25% treasury, 25% rewards)
- [ ] Treasury address set
- [ ] Emergency pause function tested

---

## Phase 2: Liquidity & Market Making (Day 4-7)

### 2.1 DEX Liquidity Pools

| Pool | Initial Liquidity | Ratio | Status |
|------|------------------|-------|--------|
| AGORA/USDC (Base) | $500K | 50/50 | [ ] |
| AGORA/ETH (Base) | $300K | 50/50 | [ ] |
| AGORA/USDC (Aerodrome) | $200K | 50/50 | [ ] |

- [ ] LP tokens minted
- [ ] LP positions locked (6 months minimum)
- [ ] Trading fees set (0.3%)

### 2.2 CEX Listings Preparation

- [ ] Coinbase listing application submitted
- [ ] Binance listing application submitted
- [ ] Kraken listing application submitted
- [ ] Market maker agreements signed
- [ ] Price oracle integration complete

---

## Phase 3: Security & Monitoring (Day 8-14)

### 3.1 Bug Bounty Program Launch

- [ ] Immunefi program live
- [ ] $500K bounty pool funded
- [ ] Scope clearly defined
- [ ] Response team on standby (24/7)

### 3.2 Insurance Fund Activation

- [ ] $10M insurance fund capitalized
- [ ] Nexus Mutual coverage purchased
- [ ] Risk parameters configured
- [ ] Claims process tested

### 3.3 Monitoring Setup

- [ ] Tenderly alerts configured
- [ ] Forta bots deployed
- [ ] Telegram/Discord alerts active
- [ ] On-call rotation established

---

## Phase 4: Community & Governance (Day 15-30)

### 4.1 Token Distribution

| Category | Amount | Status |
|----------|--------|--------|
| Airdrop Round 1 | 50M AGORA | [ ] |
| Staking Rewards | 20M AGORA | [ ] |
| Developer Grants | 10M AGORA | [ ] |
| Team Vesting | Started | [ ] |

### 4.2 DAO Launch

- [ ] Snapshot space created
- [ ] Governance forum launched
- [ ] First proposal drafted
- [ ] Voting period: 7 days
- [ ] Execution delay: 2 days

---

## Emergency Procedures

### Circuit Breaker Activation

**Trigger Conditions**:
- Token price drops >50% in 24h
- Smart contract vulnerability detected
- Oracle manipulation suspected

**Actions**:
1. Multi-sig emergency pause
2. Announce in all channels
3. Investigate root cause
4. Prepare fix or mitigation
5. Community vote on restart

### Contact Information

| Role | Contact | Response Time |
|------|---------|---------------|
| Tech Lead | @pisa | 24/7 |
| Security | @security | 24/7 |
| Community | @community | Business hours |

---

## Sign-Off

**Deployment Approved By**:
- [ ] Technical Lead: _________________ Date: _______
- [ ] Security Lead: _________________ Date: _______
- [ ] Legal Counsel: _________________ Date: _______
- [ ] Treasury Signer 1: _________________ Date: _______
- [ ] Treasury Signer 2: _________________ Date: _______

**Launch Authorization**: ⏳ PENDING

---

*This checklist must be completed before mainnet launch. No exceptions.*
