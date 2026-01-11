import { ethers, network } from "hardhat";

// Token addresses by network
const TOKEN_ADDRESSES = {
  baseSepolia: {
    ETH: '0x0000000000000000000000000000000000000000',
    PULSE: '0x19821658D5798976152146d1c1882047670B898c',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  base: {
    ETH: '0x0000000000000000000000000000000000000000',
    PULSE: '0x1b684A60309b0916C77834d62d117d306171FDFE',
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  },
};

// FundingType enum (must match contract)
enum FundingType {
  NONE = 0,
  SELF = 1,
  COMMUNITY = 2
}

// Parse token from poll title metadata
// Format: "Poll Title|TOKEN:SYMBOL"
function parseTokenFromTitle(title: string, networkName: string): string {
  const tokenAddresses = TOKEN_ADDRESSES[networkName as keyof typeof TOKEN_ADDRESSES];

  if (!tokenAddresses) {
    console.warn(`Unknown network: ${networkName}, defaulting to ETH`);
    return '0x0000000000000000000000000000000000000000';
  }

  // Check if title contains token metadata
  const tokenMatch = title.match(/\|TOKEN:(\w+)/);

  if (tokenMatch) {
    const tokenSymbol = tokenMatch[1];
    const tokenAddress = tokenAddresses[tokenSymbol as keyof typeof tokenAddresses];

    if (tokenAddress) {
      console.log(`  Found token metadata: ${tokenSymbol} -> ${tokenAddress}`);
      return tokenAddress;
    } else {
      console.warn(`  Unknown token symbol: ${tokenSymbol}, defaulting to ETH`);
      return tokenAddresses.ETH;
    }
  }

  // No metadata found, default to ETH
  console.log(`  No token metadata found, defaulting to ETH`);
  return tokenAddresses.ETH;
}

// Parse funding type from poll title metadata
// Format: "Poll Title|FUNDING:TYPE"
// Default: COMMUNITY
function parseFundingTypeFromTitle(title: string): FundingType {
  // Check if title contains funding type metadata
  const fundingMatch = title.match(/\|FUNDING:(\w+)/);

  if (fundingMatch) {
    const fundingTypeStr = fundingMatch[1].toUpperCase();

    if (fundingTypeStr === 'SELF') {
      console.log(`  Found funding metadata: SELF`);
      return FundingType.SELF;
    }
    if (fundingTypeStr === 'NONE') {
      console.log(`  Found funding metadata: NONE`);
      return FundingType.NONE;
    }
    if (fundingTypeStr === 'COMMUNITY') {
      console.log(`  Found funding metadata: COMMUNITY`);
      return FundingType.COMMUNITY;
    }
  }

  // Default to COMMUNITY for all existing polls
  console.log(`  No funding metadata found, defaulting to COMMUNITY`);
  return FundingType.COMMUNITY;
}

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    throw new Error("PROXY_ADDRESS not found in .env file. Please set it to your deployed proxy address.");
  }

  console.log("=== Migration: Set Funding Fields for Existing Polls ===");
  console.log("Network:", network.name);
  console.log("Proxy address:", PROXY_ADDRESS);

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Migrating with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get the contract instance
  const PollsContract = await ethers.getContractAt("PollsContract", PROXY_ADDRESS);

  // Get total number of polls
  const nextPollId = await PollsContract.nextPollId();
  console.log(`Total polls to migrate: ${nextPollId}\n`);

  if (nextPollId === 0n) {
    console.log("No polls to migrate.");
    return;
  }

  // Migrate each poll
  for (let i = 0; i < Number(nextPollId); i++) {
    try {
      console.log(`Migrating poll ${i}...`);

      // Get poll data
      const pollData = await PollsContract.getPoll(i);
      const question = pollData[1]; // question is at index 1
      const fundingToken = pollData[9]; // fundingToken is at index 9
      const fundingType = pollData[10]; // fundingType is at index 10

      // Check if already migrated
      const tokenAlreadySet = fundingToken !== '0x0000000000000000000000000000000000000000';
      const typeAlreadySet = fundingType !== 0; // Assuming 0 (NONE) means not set for migration purposes

      if (tokenAlreadySet && typeAlreadySet) {
        console.log(`  Poll ${i} already migrated (token: ${fundingToken}, type: ${fundingType})`);
        console.log(`  Skipping...\n`);
        continue;
      }

      // Parse token and funding type from title
      const tokenAddress = parseTokenFromTitle(question, network.name);
      const fundingTypeValue = parseFundingTypeFromTitle(question);

      // Set funding token if not already set
      if (!tokenAlreadySet) {
        console.log(`  Setting fundingToken to: ${tokenAddress}`);
        const tokenTx = await PollsContract.setFundingToken(i, tokenAddress);
        await tokenTx.wait();
        console.log(`  ✓ Funding token set (tx: ${tokenTx.hash})`);
      }

      // Set funding type if not already set
      if (!typeAlreadySet) {
        console.log(`  Setting fundingType to: ${FundingType[fundingTypeValue]} (${fundingTypeValue})`);
        const typeTx = await PollsContract.setFundingType(i, fundingTypeValue);
        await typeTx.wait();
        console.log(`  ✓ Funding type set (tx: ${typeTx.hash})`);
      }

      console.log(`  ✓ Poll ${i} migrated successfully\n`);

    } catch (error: any) {
      console.error(`  ✗ Error migrating poll ${i}:`, error.message);
      console.log(`  Continuing with next poll...\n`);
    }
  }

  console.log("=== Migration Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
