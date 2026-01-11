# BasePuls3 Contracts

A comprehensive polling smart contract system built for Base Sepolia and Base Mainnet, featuring funding capabilities with native ETH and whitelisted ERC20 tokens.

## Features

- **Poll Creation**: Create polls with customizable questions, options, and duration
- **Secure Voting**: One vote per address with option validation
- **Multi-token Funding**: Support for ETH and whitelisted ERC20 token funding
- **Access Control**: Owner-managed token whitelisting and poll management
- **Fund Management**: Secure withdrawal system for poll creators and contract owner
- **View Functions**: Comprehensive query functions for poll data and user interactions

## Smart Contract Architecture

### PollsContract.sol

The main contract implementing the polling system with the following key features:

- **Poll Management**: Create, vote on, and close polls
- **Funding System**: Accept ETH and whitelisted ERC20 tokens as funding
- **Access Control**: OpenZeppelin's Ownable for administrative functions
- **Security**: ReentrancyGuard protection and comprehensive input validation

## Setup

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd basepuls3-contracts
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`:
```bash
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

## Usage

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy to Base Sepolia

```bash
npm run deploy:sepolia
```

### Deploy to Base Mainnet

```bash
npm run deploy:mainnet
```

### Verify Contracts

```bash
# For Sepolia
npm run verify:sepolia <CONTRACT_ADDRESS>

# For Mainnet
npm run verify:mainnet <CONTRACT_ADDRESS>
```

## Contract Interface

### Core Functions

#### Poll Management
- `createPoll(string question, string[] options, uint256 duration)`: Create a new poll
- `vote(uint256 pollId, uint256 optionIndex)`: Vote on a poll
- `closePoll(uint256 pollId)`: Close a poll (creator or owner only)

#### Funding
- `fundPollWithETH(uint256 pollId)`: Fund a poll with ETH
- `fundPollWithToken(uint256 pollId, address token, uint256 amount)`: Fund with ERC20 tokens
- `withdrawFunds(uint256 pollId, address recipient)`: Withdraw poll funds

#### Administration
- `whitelistToken(address token, bool status)`: Whitelist/delist ERC20 tokens

#### View Functions
- `getPoll(uint256 pollId)`: Get poll details
- `getActivePolls()`: Get all active poll IDs
- `hasUserVoted(uint256 pollId, address user)`: Check if user has voted
- `getUserFunding(uint256 pollId, address user)`: Get user's funding amount

## Network Configuration

### Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org

### Base Mainnet
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org

## Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Access Control**: Ownable pattern for administrative functions
- **Input Validation**: Comprehensive validation for all user inputs
- **Safe Token Transfers**: Using OpenZeppelin's SafeERC20 library
- **Time-based Controls**: Poll duration limits and end time enforcement

## Testing

The test suite covers:
- Contract deployment and initialization
- Poll creation with various scenarios
- Voting mechanisms and restrictions
- Funding with ETH and token validation
- Administrative functions and access control
- View functions and data retrieval

Run tests with:
```bash
npm test
```

## Gas Optimization

The contract is optimized for gas efficiency:
- Efficient storage layouts
- Minimal external calls
- Batch operations where possible
- Solidity compiler optimization enabled

## Frontend Integration

This contract is designed to work with the frontend application located at `../basepuls3-app`. The contract provides comprehensive view functions and events for easy integration.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Support

For questions or support, please open an issue in the GitHub repository.