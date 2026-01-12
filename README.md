# MantlePulse

A decentralized and incentivized polls and surveys platform built on Mantle.

## Overview

MantlePulse enables communities to create, participate in, and fund decentralized polls with on-chain transparency. Creators can incentivize participation through token rewards, and voters can earn rewards for contributing to governance decisions.

## Features

- **Decentralized Polls**: Create polls with multiple voting options stored on-chain
- **Token Incentives**: Fund polls with PULSE, MNT, or other supported tokens
- **Multiple Voting Types**: Standard linear voting or quadratic voting (premium feature)
- **Draft Mode**: Save polls as drafts before publishing
- **Poll Management**: Close, pause, resume, and finalize polls
- **Reward Distribution**: Flexible distribution modes for voter rewards
- **Premium Subscriptions**: Access advanced features through subscription or staking

## Project Structure

```
mntlpulse/
├── backend/          # API server
├── contracts/        # Solidity smart contracts
├── frontend/         # Next.js web application
└── subgraph/         # The Graph indexer (disabled until Mantle indexer available)
```

## Smart Contracts

### PollsContract
The main contract for poll creation and management.

**Key Functions:**
- `createPollWithVotingTypeAndPublish()` - Create a poll (published or draft)
- `vote()` - Cast a vote on a poll
- `publishPoll()` - Publish a draft poll
- `closePoll()` - Close voting on a poll
- `finalizePoll()` - Archive a completed poll

**Poll Statuses:**
- `ACTIVE` (0) - Accepting votes and funding
- `CLOSED` (1) - Voting ended, awaiting distribution
- `FOR_CLAIMING` (2) - Ready for reward distribution
- `PAUSED` (3) - Temporarily suspended
- `DRAFT` (4) - Created but not yet published
- `FINALIZED` (5) - All distributions complete

### Deployed Addresses (Mantle Sepolia)

| Contract | Address |
|----------|---------|
| PollsContract (Proxy) | `0xe517e9c476D7F259228C94Dc24B0731E097E9541` |
| PULSE Token | `0xa3713739c39419aA1c6daf349dB4342Be59b9142` |
| Staking Contract | `0x2828b211A6e8c9c4F5736CeB6c67Df1614967d7E` |
| Premium Contract | `0x0D68DC1cBa2c1b663f38604D52B293EDcB96654b` |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm
- A wallet with Mantle Sepolia testnet MNT

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/mntlpulse.git
cd mntlpulse
```

2. Install dependencies for each package:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Contracts
cd ../contracts
npm install
```

3. Set up environment variables:

```bash
# Frontend (.env.local)
cp frontend/.env.example frontend/.env.local

# Backend (.env)
cp backend/.env.example backend/.env

# Contracts (.env)
cp contracts/.env.example contracts/.env
```

### Running the Application

**Frontend:**
```bash
cd frontend
npm run dev
```

**Backend:**
```bash
cd backend
npm run dev
```

### Deploying Contracts

**Deploy to Mantle Sepolia:**
```bash
cd contracts
npm run deploy:sepolia
```

**Upgrade existing contract:**
```bash
npm run upgrade:sepolia
```

## Development

### Smart Contract Development

```bash
cd contracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Architecture

### Poll Lifecycle

1. **Creation**: Creator defines poll question, options, duration, and funding
2. **Draft** (optional): Poll saved but not visible to voters
3. **Active**: Poll accepting votes and funding
4. **Closed**: Voting period ended
5. **For Claiming**: Rewards ready for distribution
6. **Finalized**: All rewards distributed, poll archived

### Voting Types

- **Linear Voting**: One person, one vote (default)
- **Quadratic Voting**: Cost increases quadratically for additional votes (premium)

### Funding Types

- **None**: No rewards for voters
- **Self-Funded**: Creator provides reward pool
- **Community**: Rewards from community treasury

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Mantle Network](https://www.mantle.xyz/)
- [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/)
- [Mantle Sepolia Explorer](https://sepolia.mantlescan.xyz/)
