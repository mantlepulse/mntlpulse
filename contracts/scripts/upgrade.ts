import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function saveUpgradeInfo(
  networkName: string,
  proxyAddress: string,
  newImplementationAddress: string,
  upgradeTx: string | undefined
) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");

  // Map network names to file names
  const networkFileMap: { [key: string]: string } = {
    "mantleSepolia": "mantle-sepolia.json",
    "mantle": "mantle.json",
  };

  const fileName = networkFileMap[networkName] || `${networkName}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  // Read existing deployment info
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment file not found: ${filePath}. Please deploy first.`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // Get current block number
  const blockNumber = await ethers.provider.getBlockNumber();

  // Add upgrade info
  const upgradeInfo = {
    implementationAddress: newImplementationAddress,
    upgradedAt: new Date().toISOString(),
    upgradeTx: upgradeTx || "N/A",
    blockNumber: blockNumber,
  };

  // Update implementation address and add to upgrades array
  const previousImplementation = deploymentData.PollsContract.implementation;
  deploymentData.PollsContract.implementation = newImplementationAddress;

  if (!deploymentData.PollsContract.upgrades) {
    deploymentData.PollsContract.upgrades = [];
  }

  deploymentData.PollsContract.upgrades.push({
    ...upgradeInfo,
    previousImplementation,
  });

  // Write updated deployment info
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log(`\nUpgrade info saved to: ${filePath}`);
}

async function main() {
  // Replace this with your deployed proxy address
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    throw new Error("PROXY_ADDRESS not found in .env file. Please set it to your deployed proxy address.");
  }

  console.log("Upgrading PollsContract at proxy address:", PROXY_ADDRESS);

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Upgrading contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get the new implementation
  const PollsContractV2 = await ethers.getContractFactory("PollsContract");

  console.log("Upgrading proxy to new implementation...");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, PollsContractV2);

  await upgraded.waitForDeployment();

  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);

  console.log("\n=== UPGRADE SUMMARY ===");
  console.log("Proxy address (unchanged):", PROXY_ADDRESS);
  console.log("New implementation address:", newImplementationAddress);
  console.log("\nUpgrade completed successfully!");
  console.log("Your frontend can continue using the same proxy address:", PROXY_ADDRESS);

  // Save upgrade information
  await saveUpgradeInfo(
    network.name,
    PROXY_ADDRESS,
    newImplementationAddress,
    upgraded.deploymentTransaction()?.hash
  );

  return PROXY_ADDRESS;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
