import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Fund DirectTokenSale contract with PULSE tokens
 *
 * This script transfers 1,000,000 PULSE tokens to the DirectTokenSale contract
 * so users can purchase them.
 */
async function main() {
  console.log("Funding DirectTokenSale with PULSE tokens...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log();

  // Load DirectTokenSale deployment
  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    `direct-sale-${getNetworkFileName(Number(network.chainId))}`
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("DirectTokenSale deployment not found. Please deploy first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const directSaleAddress = deployment.contracts.DirectTokenSale.address;
  const pulseTokenAddress = deployment.contracts.PulseToken.address;

  console.log("DirectTokenSale:", directSaleAddress);
  console.log("PulseToken:", pulseTokenAddress);
  console.log();

  // Get PULSE token contract
  const pulseToken = await ethers.getContractAt("PulsePollToken", pulseTokenAddress);

  // Check deployer's balance
  const balance = await pulseToken.balanceOf(deployer.address);
  console.log("Your PULSE balance:", ethers.formatEther(balance), "PULSE");

  const amountToTransfer = ethers.parseEther("1000000"); // 1 million PULSE

  if (balance < amountToTransfer) {
    throw new Error(
      `Insufficient PULSE balance. You have ${ethers.formatEther(balance)} PULSE but need 1,000,000 PULSE`
    );
  }

  // Transfer tokens
  console.log("\nTransferring 1,000,000 PULSE to DirectTokenSale...");
  const tx = await pulseToken.transfer(directSaleAddress, amountToTransfer);
  console.log("Transaction hash:", tx.hash);

  console.log("Waiting for confirmation...");
  await tx.wait();

  console.log("✅ Transfer complete!");

  // Verify the transfer
  const contractBalance = await pulseToken.balanceOf(directSaleAddress);
  console.log("\nDirectTokenSale PULSE balance:", ethers.formatEther(contractBalance), "PULSE");

  // Get sale stats
  const directSale = await ethers.getContractAt("DirectTokenSale", directSaleAddress);
  const stats = await directSale.getSaleStats();

  console.log("\n=== Sale Status ===");
  console.log("Tokens Sold:", ethers.formatEther(stats[0]), "PULSE");
  console.log("Remaining Supply:", ethers.formatEther(stats[1]), "PULSE");
  console.log("Total Buyers:", stats[2].toString());
  console.log("Sale Active:", await directSale.isSaleActive());

  console.log("\n✅ DirectTokenSale is now ready for purchases!");
  console.log("\nUsers can now buy PULSE tokens at:");
  console.log("- Price: 0.01 USDC per PULSE");
  console.log("- Min Purchase: 100 PULSE");
  console.log("- Max Per Wallet: 50,000 PULSE");
}

function getNetworkFileName(chainId: number): string {
  const networkNames: { [key: number]: string } = {
    8453: "base.json",
    84532: "base-sepolia.json",
    31337: "localhost.json",
  };

  return networkNames[chainId] || "unknown.json";
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
