import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Setting Quadratic Voting Treasury address...");

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Using account:", deployer.address);

  // New treasury address
  const newTreasury = "0x59eaAEb8118856EaEB6D37433247C581e2951Bc9";

  // Get addresses from deployments file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const networkFileMap: { [key: string]: string } = {
    "baseSepolia": "base-sepolia.json",
    "base": "base.json",
  };
  const fileName = networkFileMap[network.name] || `${network.name}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployments file not found: ${filePath}`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const pollsContractAddress = deploymentData.PollsContract?.proxy;

  if (!pollsContractAddress) {
    throw new Error("PollsContract not deployed yet");
  }

  console.log("\n=== CONTRACT ADDRESSES ===");
  console.log("PollsContract:", pollsContractAddress);
  console.log("New Treasury:", newTreasury);

  // Get contract instance
  const pollsContract = await ethers.getContractAt("PollsContract", pollsContractAddress);

  // Check current treasury
  console.log("\n=== CURRENT TREASURY ===");
  const currentTreasury = await pollsContract.quadraticVotingTreasury();
  console.log("Current:", currentTreasury);

  // Set new treasury
  console.log("\n=== UPDATING TREASURY ===");
  console.log("Setting to:", newTreasury);

  const tx = await pollsContract.setQuadraticVotingTreasury(newTreasury);
  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");

  await tx.wait();
  console.log("Transaction confirmed!");

  // Verify
  console.log("\n=== VERIFICATION ===");
  const finalTreasury = await pollsContract.quadraticVotingTreasury();
  console.log("Final Treasury:", finalTreasury);
  console.log("Match:", finalTreasury.toLowerCase() === newTreasury.toLowerCase() ? "YES ✓" : "NO ✗");

  console.log("\n=== UPDATE COMPLETE ===");
  console.log("All PULSE tokens from quadratic vote purchases will now go to:", newTreasury);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
