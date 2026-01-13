# BasePulse (SideShift Pulse)

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
| **basepulse-app** | Next.js frontend application (this repo) | [GitHub](https://github.com/sideshiftai/basepulse-app) |
| **basepulse-api** | Express.js backend API server | [GitHub](https://github.com/sideshiftai/basepulse-api) |
| **basepulse-contract** | Solidity smart contracts | [GitHub](https://github.com/sideshiftai/basepulse-contract) |
| **basepulse-subgraph** | The Graph protocol subgraph | [GitHub](https://github.com/sideshiftai/basepulse-subgraph) |
| **basepulse-cron** | Scheduled jobs and background tasks | [GitHub](https://github.com/sideshiftai/basepulse-cron) |
| **basepulse-bridge** | Cross-chain bridge utilities | [GitHub](https://github.com/sideshiftai/basepulse-bridge) |
| **basepulse-ido** | Token IDO platform | [GitHub](https://github.com/sideshiftai/basepulse-ido) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│        basepulse-app - React + wagmi + TanStack Query       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express.js)                       │
│                      basepulse-api                           │
└───────┬─────────────────────────────────────┬───────────────┘
        │                                     │
        ▼                                     ▼
┌────────────────┐    ┌─────────────────────────────────────┐
│   PostgreSQL   │    │         Blockchain Layer             │
│   (Drizzle)    │    │  basepulse-contract (Base Network)   │
└────────────────┘    └─────────────────────────────────────┘
                                    │
                                    ▼
                      ┌─────────────────────────┐
                      │   basepulse-subgraph    │
                      │   (The Graph Protocol)  │
                      └─────────────────────────┘
```

## Tech Stack

### Frontend (basepulse-app)
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Web3:** wagmi + viem
- **State:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod

### Backend (basepulse-api)
- **Runtime:** Node.js + Express.js
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Blockchain:** Viem

### Smart Contracts (basepulse-contract)
- **Language:** Solidity ^0.8.20
- **Framework:** Hardhat
- **Pattern:** UUPS Upgradeable

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Wallet with Base Sepolia ETH

### Installation

```bash
# Clone the repository
git clone https://github.com/sideshiftai/basepulse-app.git
cd basepulse-app

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
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_POLLS_CONTRACT_BASE_SEPOLIA=0xa3713739c39419aA1c6daf349dB4342Be59b9142

# WalletConnect
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

## Contract Addresses

### Base Mainnet (Chain ID: 8453)
| Contract | Type | Address |
|----------|------|---------|
| PollsContract | Proxy | `0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B` |
| PULSE Token | ERC20 | `0x1b684A60309b0916C77834d62d117d306171FDFE` |
| StakingContract | Proxy | `0xC84377d58747423E1a07505512Adf99A90F86051` |
| PremiumContract | Proxy | `0x69353b25FdAE19d5Bb40D173193AFa34f02da97A` |
| DirectTokenSale | Standard | `0xba6Ae648738969A66e7Fc014fc871E41827e7734` |

### Base Sepolia Testnet (Chain ID: 84532)
| Contract | Type | Address |
|----------|------|---------|
| PollsContract | Proxy | `0xdfb6881ad34F26D57c3146d335848EDba21dFb6f` |
| PULSE Token | ERC20 | `0x19821658D5798976152146d1c1882047670B898c` |
| StakingContract | Proxy | `0xAc8BA012138c9e8bEdF7BbbeD408105EB195Daaf` |
| PremiumContract | Proxy | `0xDC6E8482A3292BEd6e86b73B6a39abD60076165F` |
| DirectTokenSale | Standard | `0x434d0fDd72AA670a229294E93D0933Ea685802fd` |

> See [WAVE3_FINAL.md](./WAVE3_FINAL.md) for complete contract addresses including implementations.

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
basepulse-app/
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

- **Demo Site:** https://sspulse.vercel.app/
- **Demo IDO:** https://baseido.vercel.app/
- **API:** https://basepulse-api.onrender.com

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Contributors

- SideShift AI Team

---

*Built for the Akindo WaveHack Hackathon*
