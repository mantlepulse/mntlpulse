import { ethers } from "hardhat";

async function main() {
  const PROXY_ADDRESS = "0xe517e9c476D7F259228C94Dc24B0731E097E9541";

  const [deployer] = await ethers.getSigners();
  console.log("Setting grace period with account:", deployer.address);

  const contract = await ethers.getContractAt("PollsContract", PROXY_ADDRESS);

  // Set to 1 hour (3600 seconds)
  const gracePeriod = 3600;
  console.log(`\nSetting grace period to 1 hour (${gracePeriod} seconds)...`);

  const tx = await contract.setDefaultClaimGracePeriod(gracePeriod);
  await tx.wait();
  console.log("Transaction hash:", tx.hash);

  const current = await contract.getDefaultClaimGracePeriod();
  console.log("\n=== GRACE PERIOD SET ===");
  console.log(`Grace Period: ${current} seconds (${Number(current) / 3600} hours)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
