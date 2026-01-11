import { ethers, network } from "hardhat";

// Token addresses to whitelist
const TOKENS_TO_WHITELIST = {
  baseSepolia: {
    PULSE: "0x19821658D5798976152146d1c1882047670B898c", // Our custom token
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  },
  base: {
    PULSE: "0x1b684A60309b0916C77834d62d117d306171FDFE", // PulsePoll Token on Base Mainnet
    USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base Mainnet USDC
  },
};

// PollsContract addresses
const POLLS_CONTRACT_ADDRESSES = {
  baseSepolia: "0xdfb6881ad34F26D57c3146d335848EDba21dFb6f",
  base: "0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B",
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
