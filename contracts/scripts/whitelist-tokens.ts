import { ethers, network } from "hardhat";

// Token addresses to whitelist
const TOKENS_TO_WHITELIST = {
  mantleSepolia: {
    PULSE: "0xa3713739c39419aA1c6daf349dB4342Be59b9142", // PulsePoll Token on Mantle Sepolia
  },
  mantle: {
    PULSE: "", // PulsePoll Token on Mantle Mainnet (deploy first)
    USDC: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", // Mantle Mainnet USDC
  },
};

// PollsContract addresses
const POLLS_CONTRACT_ADDRESSES = {
  mantleSepolia: "0xe517e9c476D7F259228C94Dc24B0731E097E9541",
  mantle: "", // Deploy first
};

async function main() {
  console.log(`Whitelisting tokens on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get the PollsContract address for current network
  const pollsContractAddress =
    POLLS_CONTRACT_ADDRESSES[network.name as keyof typeof POLLS_CONTRACT_ADDRESSES];

  if (!pollsContractAddress) {
    throw new Error(`No PollsContract address configured for network: ${network.name}`);
  }

  console.log("\nPollsContract address:", pollsContractAddress);

  // Get tokens for current network
  const tokensToWhitelist =
    TOKENS_TO_WHITELIST[network.name as keyof typeof TOKENS_TO_WHITELIST];

  if (!tokensToWhitelist) {
    throw new Error(`No tokens configured for network: ${network.name}`);
  }

  // Get contract instance
  const pollsContract = await ethers.getContractAt("PollsContract", pollsContractAddress);

  console.log("\n=== WHITELISTING TOKENS ===");

  // Whitelist each token
  for (const [tokenName, tokenAddress] of Object.entries(tokensToWhitelist)) {
    if (!tokenAddress) {
      console.log(`\n❌ ${tokenName}: No address configured, skipping...`);
      continue;
    }

    console.log(`\n📝 Whitelisting ${tokenName} (${tokenAddress})...`);

    try {
      // Check if already whitelisted
      const isWhitelisted = await pollsContract.whitelistedTokens(tokenAddress);

      if (isWhitelisted) {
        console.log(`✅ ${tokenName} is already whitelisted`);
        continue;
      }

      // Whitelist the token
      const tx = await pollsContract.whitelistToken(tokenAddress, true);
      console.log(`   Transaction hash: ${tx.hash}`);

      await tx.wait();
      console.log(`✅ ${tokenName} whitelisted successfully!`);
    } catch (error: any) {
      console.error(`❌ Failed to whitelist ${tokenName}:`, error.message);
    }
  }

  console.log("\n=== VERIFICATION ===");

  // Verify all tokens are whitelisted
  for (const [tokenName, tokenAddress] of Object.entries(tokensToWhitelist)) {
    if (!tokenAddress) continue;

    const isWhitelisted = await pollsContract.whitelistedTokens(tokenAddress);
    console.log(`${tokenName} (${tokenAddress}): ${isWhitelisted ? "✅ Whitelisted" : "❌ Not Whitelisted"}`);
  }

  console.log("\n✨ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
