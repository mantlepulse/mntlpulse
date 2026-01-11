# Mainnet Deployment Plan - Wave 3 Contracts

## Overview

This plan covers deploying the new Wave 3 contracts (StakingContract, PremiumSubscription) to Base Mainnet and configuring them with the existing PollsContract.

---

## Current Mainnet State

| Contract | Address | Status |
|----------|---------|--------|
| PollsContract (Proxy) | `0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B` | ✅ Deployed |
| PulsePollToken | `0x1b684A60309b0916C77834d62d117d306171FDFE` | ✅ Deployed |
| StakingContract | Not deployed | ❌ Needs deployment |
| PremiumSubscription | Not deployed | ❌ Needs deployment |

---

## Prerequisites

### 1. Environment Variables (basepulse-contract/.env)

```bash
# Required
PRIVATE_KEY=<your_deployer_private_key_without_0x>
BASESCAN_API_KEY=<your_basescan_api_key>

# Optional (defaults work fine)
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

### 2. Deployer Wallet Requirements

- **ETH Balance**: At least 0.01 ETH for gas fees
- **Address**: Same deployer that deployed PollsContract (owner permissions needed)
- Deployer: `0x5F565baE36bd373797afc1682a627Cc05CC28600`

### 3. Verify Deployer Balance

```bash
cd /Users/east/workspace/sideshift/basepulse-contract
npx hardhat run scripts/check-balance.ts --network base
```

---

## Deployment Steps

### Step 1: Compile Contracts

```bash
cd /Users/east/workspace/sideshift/basepulse-contract
npx hardhat compile
```

### Step 2: Upgrade PollsContract (Required for QV Support)

The mainnet PollsContract needs to be upgraded to support:
- Quadratic Voting (`buyVotes`, `VotingType`)
- Premium integration (`setPremiumContract`, `setPulseToken`)

```bash
# Set the proxy address in .env
echo "PROXY_ADDRESS=0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B" >> .env

# Run upgrade
npx hardhat run scripts/upgrade.ts --network base
```

**Expected Output:**
- New implementation address
- Proxy address remains: `0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B`

### Step 3: Deploy StakingContract

```bash
npx hardhat run scripts/deploy-staking.ts --network base
```

**Expected Output:**
- Proxy address (save this!)
- Implementation address

**What it does:**
- Deploys StakingContract with UUPS proxy
- Uses PulsePollToken from deployments/base.json
- Sets minimum stake: 10,000 PULSE
- Saves deployment info to deployments/base.json

### Step 4: Deploy PremiumSubscription

```bash
npx hardhat run scripts/deploy-premium.ts --network base
```

**Expected Output:**
- Proxy address (save this!)
- Implementation address

**What it does:**
- Deploys PremiumSubscription with UUPS proxy
- Links to PulsePollToken and StakingContract
- Sets tier prices: Monthly=1000, Annual=10000, Lifetime=50000 PULSE
- Saves deployment info to deployments/base.json

### Step 5: Setup Contract Connections

```bash
npx hardhat run scripts/setup-premium-contracts.ts --network base
```

**What it does:**
1. Sets PremiumContract on PollsContract (enables premium checks)
2. Sets PremiumContract on StakingContract (bidirectional link)
3. Whitelists PULSE token on PollsContract (for QV voting)
4. Sets PULSE token address on PollsContract

### Step 6: Verify Contracts on BaseScan

```bash
# Get implementation addresses from deployments/base.json
npx hardhat verify --network base <NEW_POLLS_IMPLEMENTATION_ADDRESS>
npx hardhat verify --network base <STAKING_IMPLEMENTATION_ADDRESS>
npx hardhat verify --network base <PREMIUM_IMPLEMENTATION_ADDRESS>
```

---

## Post-Deployment: Update Frontend

### Step 7: Update Environment Variables

Edit `/Users/east/workspace/sideshift/basepulse-app/.env.local`:

```bash
# Update these with the NEW deployed proxy addresses:

# Base Mainnet (chainId: 8453)
NEXT_PUBLIC_STAKING_CONTRACT_BASE=<NEW_STAKING_PROXY_ADDRESS>
NEXT_PUBLIC_PREMIUM_CONTRACT_BASE=<NEW_PREMIUM_PROXY_ADDRESS>

# These should already be set:
NEXT_PUBLIC_POLLS_CONTRACT_BASE=0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B
NEXT_PUBLIC_PULSE_TOKEN_BASE_MAINNET=0x1b684A60309b0916C77834d62d117d306171FDFE
```

### Step 8: Update API Environment (if needed)

Edit `/Users/east/workspace/sideshift/basepulse-api/.env`:

```bash
# Add if not present:
STAKING_CONTRACT_BASE=<NEW_STAKING_PROXY_ADDRESS>
PREMIUM_CONTRACT_BASE=<NEW_PREMIUM_PROXY_ADDRESS>
```

### Step 9: Rebuild and Deploy Frontend

```bash
cd /Users/east/workspace/sideshift/basepulse-app
npm run build
# Deploy to hosting (Vercel, etc.)
```

---

## Verification Checklist

After deployment, verify everything works:

### On-Chain Verification

```bash
# Run this to check all connections are set correctly
npx hardhat run scripts/setup-premium-contracts.ts --network base
```

Look for:
- [x] PollsContract.premiumContract matches PremiumSubscription proxy
- [x] StakingContract.premiumContract matches PremiumSubscription proxy
- [x] PULSE token whitelisted on PollsContract
- [x] PULSE token set on PollsContract

### Frontend Verification

1. **Staking Page**: Can stake PULSE tokens
2. **Premium Page**: Can subscribe with PULSE
3. **Poll Creation**: Quadratic voting option available for premium users
4. **Voting**: Can buy votes on QV polls

---

## Quick Reference Commands

```bash
# Navigate to contract directory
cd /Users/east/workspace/sideshift/basepulse-contract

# Full deployment sequence (run in order)
npx hardhat compile

# Step 2: Upgrade PollsContract for QV support
PROXY_ADDRESS=0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B npx hardhat run scripts/upgrade.ts --network base

# Step 3: Deploy StakingContract
npx hardhat run scripts/deploy-staking.ts --network base

# Step 4: Deploy PremiumSubscription
npx hardhat run scripts/deploy-premium.ts --network base

# Step 5: Setup all connections
npx hardhat run scripts/setup-premium-contracts.ts --network base

# Step 6: Verify contracts (use addresses from deployments/base.json)
npx hardhat verify --network base <IMPLEMENTATION_ADDRESS>
```

---

## Rollback Plan

If something goes wrong:

1. **Frontend**: Revert environment variables to zero addresses
2. **Contracts**: Contracts are immutable but proxy admin can upgrade
3. **PollsContract**: Can call `setPremiumContract(address(0))` to disable premium checks

---

## Expected Final State (deployments/base.json)

```json
{
  "PollsContract": {
    "proxy": "0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B",
    "implementation": "...",
    ...
  },
  "PulsePollToken": {
    "address": "0x1b684A60309b0916C77834d62d117d306171FDFE",
    ...
  },
  "StakingContract": {
    "proxy": "<NEW_ADDRESS>",
    "implementation": "<NEW_ADDRESS>",
    ...
  },
  "PremiumSubscription": {
    "proxy": "<NEW_ADDRESS>",
    "implementation": "<NEW_ADDRESS>",
    ...
  }
}
```

---

## Estimated Gas Costs

| Transaction | Estimated Gas | Estimated Cost (at 0.001 gwei) |
|-------------|---------------|-------------------------------|
| Upgrade PollsContract | ~1,500,000 | ~0.0015 ETH |
| Deploy StakingContract | ~2,000,000 | ~0.002 ETH |
| Deploy PremiumSubscription | ~2,500,000 | ~0.0025 ETH |
| Setup connections (4 txs) | ~400,000 | ~0.0004 ETH |
| **Total** | ~6,400,000 | **~0.0065 ETH** |

---

## Support

If you encounter issues:

1. Check deployer has enough ETH
2. Verify PRIVATE_KEY is correct (no 0x prefix)
3. Check RPC URL is working
4. Review error messages in console output
