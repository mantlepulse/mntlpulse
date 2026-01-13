import { ethers, network } from "hardhat";

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    throw new Error("PROXY_ADDRESS not found in .env file.");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Setting platform fee with account:", deployer.address);

  // Get contract instance
  const PollsContract = await ethers.getContractFactory("PollsContract");
  const contract = PollsContract.attach(PROXY_ADDRESS);

  // Set platform fee to 5% (500 basis points)
  const PLATFORM_FEE = 500; // 5%
  console.log(`Setting platform fee to ${PLATFORM_FEE / 100}%...`);

  const feeTx = await contract.setPlatformFee(PLATFORM_FEE);
  await feeTx.wait();
  console.log("Platform fee set successfully!");

  // Set treasury address to deployer (can be changed later)
  const TREASURY_ADDRESS = deployer.address;
  console.log(`Setting platform treasury to: ${TREASURY_ADDRESS}...`);

  const treasuryTx = await contract.setPlatformTreasury(TREASURY_ADDRESS);
  await treasuryTx.wait();
  console.log("Platform treasury set successfully!");

  // Verify settings
  const currentFee = await contract.platformFeePercent();
  const currentTreasury = await contract.platformTreasury();

  console.log("\n=== PLATFORM FEE SETTINGS ===");
  console.log(`Platform Fee: ${Number(currentFee) / 100}%`);
  console.log(`Platform Treasury: ${currentTreasury}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
