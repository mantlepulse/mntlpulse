import { ethers } from "hardhat";

/**
 * Script to set the default claim grace period for polls
 *
 * Usage:
 *   npx hardhat run scripts/set-grace-period.ts --network mantleSepolia
 *
 * Environment variables:
 *   PROXY_ADDRESS - The polls contract proxy address
 *   GRACE_PERIOD_DAYS - Grace period in days (default: 30)
 */
async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;
  const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || "30");

  if (!PROXY_ADDRESS) {
    throw new Error("PROXY_ADDRESS not found in .env file.");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Setting default claim grace period with account:", deployer.address);

  // Get contract instance
  const PollsContract = await ethers.getContractFactory("PollsContract");
  const contract = PollsContract.attach(PROXY_ADDRESS);

  // Convert days to seconds
  const gracePeriodSeconds = GRACE_PERIOD_DAYS * 24 * 60 * 60;

  console.log(`\nSetting default claim grace period to ${GRACE_PERIOD_DAYS} days (${gracePeriodSeconds} seconds)...`);

  const tx = await contract.setDefaultClaimGracePeriod(gracePeriodSeconds);
  await tx.wait();
  console.log("Default claim grace period set successfully!");
  console.log("Transaction hash:", tx.hash);

  // Verify setting
  const currentGracePeriod = await contract.getDefaultClaimGracePeriod();
  const currentDays = Number(currentGracePeriod) / (24 * 60 * 60);

  console.log("\n=== GRACE PERIOD SETTINGS ===");
  console.log(`Default Grace Period: ${currentDays} days (${currentGracePeriod} seconds)`);
  console.log("\nThis means:");
  console.log(`- When a poll is closed, the claim deadline will automatically be set to ${currentDays} days from closure`);
  console.log("- After the grace period expires, the creator can withdraw unclaimed funds");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
