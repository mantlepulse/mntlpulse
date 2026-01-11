import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Checking Quadratic Voting Treasury configuration...\n");

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

  console.log("PollsContract:", pollsContractAddress);
  console.log("Network:", network.name);

  // Get contract instance
  const pollsContract = await ethers.getContractAt("PollsContract", pollsContractAddress);

  // Check treasury
  const treasury = await pollsContract.quadraticVotingTreasury();
  console.log("\nQuadratic Voting Treasury:", treasury);

  // Check PULSE token
  const pulseToken = await pollsContract.pulseToken();
  console.log("PULSE Token:", pulseToken);

  // Check if properly configured
  const isConfigured =
    treasury !== ethers.ZeroAddress &&
    pulseToken !== ethers.ZeroAddress;

  console.log("\nQuadratic Voting Configured:", isConfigured ? "YES ✓" : "NO ✗");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
