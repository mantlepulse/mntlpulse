import { ethers, network } from "hardhat";

async function main() {
  console.log(`Verifying token whitelist on ${network.name}...`);

  const pollsContractAddress =
    network.name === "baseSepolia"
      ? "0xdfb6881ad34F26D57c3146d335848EDba21dFb6f"
      : "0x347523632Ae55D6Da81Da0799f9bd5b3FDd54C6B";

  const pollsContract = await ethers.getContractAt("PollsContract", pollsContractAddress);

  const tokens = network.name === "baseSepolia"
    ? {
        PULSE: "0x19821658D5798976152146d1c1882047670B898c",
        USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      }
    : {
        PULSE: "0x1b684A60309b0916C77834d62d117d306171FDFE",
        USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      };

  console.log("\n=== VERIFICATION ===");
  console.log(`Contract: ${pollsContractAddress}`);
  console.log();

  for (const [name, address] of Object.entries(tokens)) {
    const isWhitelisted = await pollsContract.whitelistedTokens(address);
    console.log(`${name} (${address}): ${isWhitelisted ? "✅ Whitelisted" : "❌ Not Whitelisted"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
