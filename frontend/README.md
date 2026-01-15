# Mantle Pulse (SideShift Pulse)

A decentralized polling platform built on Mantle blockchain with integrated cryptocurrency conversion via SideShift.ai. Create polls, engage communities through gamified quests, and distribute rewards transparently on-chain.

## Features

- **On-chain Polls** - Create and vote on polls stored on Mantle blockchain
- **Cross-chain Funding** - Fund polls with 100+ cryptocurrencies via SideShift integration
- **Quadratic Voting** - Fair voting mechanism preventing whale dominance
- **Creator Quests** - Gamification system with PULSE token rewards
- **Tiered Memberships** - Bronze, Silver, Gold, Platinum tiers with different privileges
- **Premium Subscriptions** - Enhanced features via PULSE token subscriptions
- **Staking** - Stake PULSE tokens to unlock premium features
- **AI-Assisted Poll Creation** - Natural language poll creation

## Related Repositories

| Repository | Description | Link |
|------------|-------------|------|
| **mntlpulse-app** | Next.js frontend application (this repo) | [GitHub](https://github.com/sideshiftai/mntlpulse-app) |
| **mntlpulse-api** | Express.js backend API server | [GitHub](https://github.com/sideshiftai/mntlpulse-api) |
| **mntlpulse-contract** | Solidity smart contracts | [GitHub](https://github.com/sideshiftai/mntlpulse-contract) |
| **mntlpulse-subgraph** | The Graph protocol subgraph | [GitHub](https://github.com/sideshiftai/mntlpulse-subgraph) |
| **mntlpulse-cron** | Scheduled jobs and background tasks | [GitHub](https://github.com/sideshiftai/mntlpulse-cron) |
| **mntlpulse-bridge** | Cross-chain bridge utilities | [GitHub](https://github.com/sideshiftai/mntlpulse-bridge) |
| **mntlpulse-ido** | Token IDO platform | [GitHub](https://github.com/sideshiftai/mntlpulse-ido) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│        mntlpulse-app - React + wagmi + TanStack Query       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express.js)                       │
│                      mntlpulse-api                           │
└───────┬─────────────────────────────────────┬───────────────┘
        │                                     │
        ▼                                     ▼
┌────────────────┐    ┌─────────────────────────────────────┐
│   PostgreSQL   │    │         Blockchain Layer             │
│   (Drizzle)    │    │  mntlpulse-contract (Mantle Network) │
└────────────────┘    └─────────────────────────────────────┘
                                    │
                                    ▼
                      ┌─────────────────────────┐
                      │   mntlpulse-subgraph    │
                      │   (The Graph Protocol)  │
                      └─────────────────────────┘
```

## Tech Stack

### Frontend (mntlpulse-app)
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Web3:** wagmi + viem
- **State:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod

### Backend (mntlpulse-api)
- **Runtime:** Node.js + Express.js
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Blockchain:** Viem

### Smart Contracts (mntlpulse-contract)
- **Language:** Solidity ^0.8.20
- **Framework:** Hardhat
- **Pattern:** UUPS Upgradeable

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Wallet with Mantle Sepolia MNT

### Installation

```bash
# Clone the repository
git clone https://github.com/mantlepulse/mntlpulse.git
cd mntlpulse/frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Blockchain
NEXT_PUBLIC_CHAIN_ID=5003
NEXT_PUBLIC_POLLS_CONTRACT_MANTLE_SEPOLIA=0xe517e9c476D7F259228C94Dc24B0731E097E9541

# WalletConnect
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

## Contract Addresses

### Mantle Mainnet (Chain ID: 5000)
| Contract | Type | Address |
|----------|------|---------|
| PollsContract | Proxy | *Not deployed yet* |
| PULSE Token | ERC20 | *Not deployed yet* |
| StakingContract | Proxy | *Not deployed yet* |
| PremiumContract | Proxy | *Not deployed yet* |
| DirectTokenSale | Standard | *Not deployed yet* |

### Mantle Sepolia Testnet (Chain ID: 5003)
| Contract | Type | Address |
|----------|------|---------|
| PollsContract | Proxy | `0xe517e9c476D7F259228C94Dc24B0731E097E9541` |
| PULSE Token | ERC20 | `0xa3713739c39419aA1c6daf349dB4342Be59b9142` |
| StakingContract | Proxy | `0x2828b211A6e8c9c4F5736CeB6c67Df1614967d7E` |
| PremiumContract | Proxy | `0x0D68DC1cBa2c1b663f38604D52B293EDcB96654b` |
| DirectTokenSale | Standard | `0x1036eC70B447346d555d85D611cd3e7f6B2ECb9A` |

## Documentation

### Feature Documentation

| Document | Description |
|----------|-------------|
| [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md) | Smart contract integration guide |
| [SIDESHIFT_USAGE.md](./SIDESHIFT_USAGE.md) | SideShift component integration examples |
| [SIDESHIFTAI.md](./SIDESHIFTAI.md) | Complete SideShift AI integration documentation |
| [FRONTEND_INTEGRATION_COMPLETE.md](./FRONTEND_INTEGRATION_COMPLETE.md) | Frontend integration status |

### Wave Development Summaries

| Document | Description |
|----------|-------------|
| [WAVE2_ROADMAP.md](./WAVE2_ROADMAP.md) | Wave 2: Analytics, preferences, event listener |
| [WAVE3_SUMMARY.md](./WAVE3_SUMMARY.md) | Wave 3: Creator quests, seasons, memberships |
| [WAVE3_SUMMARY_part2.md](./WAVE3_SUMMARY_part2.md) | Wave 3 Part 2: Quadratic voting, premium, staking |
| [WAVE3_DEMO.md](./WAVE3_DEMO.md) | Demo video script and key features |
| [WAVE3_FINAL.md](./WAVE3_FINAL.md) | Wave 3 Final: Complete submission with all contract addresses |
| [WAVE3_diff_logs.md](./WAVE3_diff_logs.md) | Wave 3 Git commit logs across all repositories |

### Feature Guides

| Document | Description |
|----------|-------------|
| [ANNOUNCEMENTS_FEATURE.md](./ANNOUNCEMENTS_FEATURE.md) | Platform-wide announcement system |
| [PREFERENCES_FEATURE.md](./PREFERENCES_FEATURE.md) | User preference and auto-claim settings |
| [SIDESHIFT_DEMO_GUIDE.md](./SIDESHIFT_DEMO_GUIDE.md) | SideShift demo walkthrough |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_FIX_SUMMARY.md](./DEPLOYMENT_FIX_SUMMARY.md) | Vercel deployment fixes |
| [VERCEL_DEPLOYMENT_TROUBLESHOOTING.md](./VERCEL_DEPLOYMENT_TROUBLESHOOTING.md) | Deployment troubleshooting guide |
| [docs/MULTI_NETWORK_BALANCE.md](./docs/MULTI_NETWORK_BALANCE.md) | Multi-network balance retrieval |

## Project Structure

```
mntlpulse-app/
├── app/                    # Next.js pages (App Router)
│   ├── dapp/              # Main dApp pages
│   ├── creator/           # Creator dashboard
│   ├── participant/       # Participant pages
│   ├── admin/             # Admin pages
│   └── settings/          # User settings
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── sideshift/        # SideShift integration
│   ├── creator/          # Creator-specific components
│   ├── participant/      # Participant components
│   └── preferences/      # User preferences
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configs
│   ├── api/              # API clients
│   ├── contracts/        # Contract utilities
│   └── utils/            # Helper functions
├── contexts/              # React contexts
├── styles/                # Global styles
└── types/                 # TypeScript types
```

## Key Features

### SideShift Integration
- Fund polls with 100+ cryptocurrencies
- Claim rewards in preferred token
- Real-time shift monitoring
- Multi-network balance display

### Creator Quests
- Participation quests (vote on X polls)
- Engagement goals (first N voters)
- 11 predefined templates
- PULSE token rewards

### Seasons/Tournaments
- Time-bound competition periods
- PULSE token pool distribution
- Leaderboard rankings
- Auto status management

### Membership Tiers
| Tier | Daily Votes | Max Season Points |
|------|-------------|-------------------|
| Bronze | 3 | 1,000 |
| Silver | 6 | 5,000 |
| Gold | 9 | 15,000 |
| Platinum | 12 | 50,000 |

### Quadratic Voting
- Cost formula: n² PULSE tokens for n votes
- Available to Premium/Staked users
- Prevents vote buying and whale dominance

## Scripts

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Production build
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

## Live URLs

- **Demo Site:** https://mntlpulse.vercel.app/
- **Subgraph:** https://subgraph-api.mantle.xyz (Ormi's 0xGraph)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Contributors

- Mantle Pulse Team

---

*A decentralized and incentivized polls platform built on Mantle*
