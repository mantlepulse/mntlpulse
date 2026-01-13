# MntlPulse Subgraph

Subgraph for the MntlPulse on-chain polling protocol on Mantle network. This subgraph indexes all polling events, votes, fundings, and distributions from the PollsContract smart contract.

Deployed on [Ormi's 0xGraph](https://subgraph.mantle.xyz/) - the Mantle-recommended indexing solution with sub-30ms query latency.

## Overview

MntlPulse is a decentralized polling platform that allows users to:
- Create polls with customizable options and duration
- Vote on active polls (linear or quadratic voting)
- Fund polls with MNT or whitelisted ERC20 tokens
- Distribute rewards to voters based on configurable modes

This subgraph provides a GraphQL API to query all on-chain data efficiently.

## Deployed Networks

### Mantle Mainnet
- **Contract Address**: TBD
- **Start Block**: TBD
- **Subgraph Endpoint**: `https://subgraph.mantle.xyz/subgraphs/name/mntlpulse-mainnet`

### Mantle Sepolia (Testnet)
- **Contract Address**: `0xe517e9c476D7F259228C94Dc24B0731E097E9541`
- **Start Block**: 33200000
- **Subgraph Endpoint**: `https://subgraph.mantle.xyz/subgraphs/name/mntlpulse-sepolia`

## Development

### Prerequisites

- Node.js >= 18
- npm or yarn
- Graph CLI: `npm install -g @graphprotocol/graph-cli`
- Ormi account and API key from https://subgraph.mantle.xyz/

### Installation

```bash
# Install dependencies
npm install

# Set your Ormi API key
export ORMI_DEPLOY_KEY=your_api_key_here
```

### Build & Deploy to 0xGraph

```bash
# Generate types from schema and ABI
npm run codegen

# Build the subgraph (compile AssemblyScript to WASM)
npm run build

# Deploy to Mantle Sepolia (testnet)
npm run deploy:mantle-sepolia

# Deploy to Mantle Mainnet
npm run deploy:mantle
```

### Local Development

```bash
# Start local Graph Node (requires Docker)
docker-compose up

# Create local subgraph
npm run create:local

# Deploy to local node
npm run deploy:local
```

## Example Queries

### Get Recent Polls with Voters

```graphql
{
  polls(
    first: 10
    orderBy: createdAt
    orderDirection: desc
    where: { isActive: true }
  ) {
    id
    pollId
    question
    options
    votes
    endTime
    creator {
      id
    }
    pollVotes {
      voter {
        id
        address
      }
      optionIndex
      timestamp
    }
    voteCount
    voterCount
  }
}
```

### Get All Voters for a Specific Poll

```graphql
query GetPollVoters($pollId: BigInt!) {
  votes(where: { poll: $pollId }) {
    voter {
      id
      address
    }
    optionIndex
    timestamp
    transactionHash
  }
}
```

### Get User Statistics

```graphql
{
  user(id: "0xUserAddress") {
    totalVotes
    totalFunded
    totalRewards
    pollsCreatedCount
    pollsParticipated
    votes {
      poll {
        question
      }
      optionIndex
      timestamp
    }
  }
}
```

### Get Global Platform Statistics

```graphql
{
  globalStats(id: "global") {
    totalPolls
    totalVotes
    totalFunding
    totalDistributions
    totalUsers
    totalVoters
    totalFunders
  }
}
```

## Schema

### Core Entities

- **Poll**: On-chain poll with properties and relationships
- **Vote**: Immutable record of a vote (contains voter address)
- **VotePurchase**: Quadratic voting purchase record
- **Funding**: Immutable funding record
- **Distribution**: Fund distribution record (withdrawn/distributed/claimed)
- **User**: Aggregated user statistics
- **Token**: Token info with whitelist status

### Statistics Entities

- **GlobalStats**: Platform-wide totals
- **DailyStats**: Time-series daily data
- **TokenStats**: Per-token metrics
- **QuadraticVotingStats**: QV-specific metrics

## Project Structure

```
mntlpulse-subgraph/
├── abis/
│   └── PollsContract.json          # Contract ABI
├── src/
│   ├── mapping.ts                  # Event handlers
│   └── helpers/
│       ├── constants.ts            # Constants
│       ├── poll.ts                 # Poll helpers
│       ├── user.ts                 # User helpers
│       ├── token.ts                # Token helpers
│       └── stats.ts                # Statistics helpers
├── schema.graphql                  # GraphQL schema
├── subgraph.yaml                   # Subgraph manifest
├── networks.json                   # Network configs
├── package.json
└── .env.example                    # Environment variables template
```

## Key Features

### Voter Address Indexing
Voter addresses are captured from `Voted` and `VotesBought` events and stored in the subgraph - NOT on-chain. This allows efficient retrieval of all voters for a poll without contract storage costs.

### Multi-Token Support
The subgraph tracks funding and distributions for multiple tokens (MNT and whitelisted ERC20s).

### Quadratic Voting Support
Full support for quadratic voting polls via `VotePurchase` entities.

### Distribution Modes
Three distribution modes are tracked:
- **MANUAL_PULL**: Creator withdraws all funds
- **MANUAL_PUSH**: Creator distributes to multiple recipients
- **AUTOMATED**: System auto-distributes when poll ends

## Troubleshooting

### Subgraph Fails to Sync

Check Ormi dashboard for errors. Common issues:
- Incorrect start block (before contract deployment)
- Mismatched ABI (update after contract upgrade)

### Missing Events

Ensure:
- Contract address is correct (proxy address, not implementation)
- All events are defined in subgraph.yaml

### Build Errors

```bash
# Clean and rebuild
npm run codegen
npm run build
```

## Resources

- [Ormi 0xGraph Docs](https://docs.ormilabs.com/subgraphs/overview)
- [Mantle + Ormi Integration](https://www.mantle.xyz/blog/developers/subgraph-indexing-with-ormis-0xgraph)
- [The Graph Docs](https://thegraph.com/docs/)
- [Mantle Network Docs](https://docs.mantle.xyz/)

## License

MIT
