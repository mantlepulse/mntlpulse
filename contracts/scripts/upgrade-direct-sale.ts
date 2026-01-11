import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Upgrade DirectTokenSaleUpgradeable contract
 *
 * Usage:
 *   npm run upgrade-direct-sale:sepolia   # Upgrade on Base Sepolia
 *   npm run upgrade-direct-sale:mainnet   # Upgrade on Base Mainnet
 *
 * Prerequisites:
 * - Set DIRECT_SALE_PROXY_ADDRESS_BASE_SEPOLIA or DIRECT_SALE_PROXY_ADDRESS_BASE_MAINNET in .env
 */

function getProxyAddress(chainId: number): string {
  // Base Sepolia
  if (chainId === 84532) {
    const address = process.env.DIRECT_SALE_PROXY_ADDRESS_BASE_SEPOLIA;
    if (!address) {
      throw new Error("DIRECT_SALE_PROXY_ADDRESS_BASE_SEPOLIA not set in .env file");
    }
    return address;
  }

  // Base Mainnet
  if (chainId === 8453) {
    const address = process.env.DIRECT_SALE_PROXY_ADDRESS_BASE_MAINNET;
    if (!address) {
      throw new Error("DIRECT_SALE_PROXY_ADDRESS_BASE_MAINNET not set in .env file");
    }
    return address;
  }

  throw new Error(`Unsupported network chainId: ${chainId}`);
}

async function saveUpgradeInfo(
  networkName: string,
  proxyAddress: string,
  newImplementationAddress: string,
  upgradeTx: string | undefined
) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");

  // Map network names to file names
  const networkFileMap: { [key: string]: string } = {
    "baseSepolia": "direct-sale-upgradeable-base-sepolia.json",
    "base": "direct-sale-upgradeable-base.json",
  };

  const fileName = networkFileMap[networkName] || `direct-sale-upgradeable-${networkName}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  // Read existing deployment info or create new
  let deploymentData: any = {};
  if (fs.existsSync(filePath)) {
    deploymentData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

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
  const previousImplementation = deploymentData.contracts?.DirectTokenSaleImplementation?.address;

  if (!deploymentData.contracts) {
    deploymentData.contracts = {};
  }

  deploymentData.contracts.DirectTokenSaleImplementation = {
    address: newImplementationAddress,
    type: "Implementation",
  };

  if (!deploymentData.upgrades) {
    deploymentData.upgrades = [];
  }

  deploymentData.upgrades.push({
    ...upgradeInfo,
    previousImplementation: previousImplementation || "Initial deployment",
  });

  // Write updated deployment info
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log(`\nUpgrade info saved to: ${filePath}`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  console.log("Upgrading DirectTokenSaleUpgradeable...\n");
  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get proxy address based on network
  const proxyAddress = getProxyAddress(chainId);
  console.log("Proxy address:", proxyAddress);

  // Get the new implementation
  const DirectTokenSale = await ethers.getContractFactory("DirectTokenSaleUpgradeable");

  console.log("\nUpgrading proxy to new implementation...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, DirectTokenSale);

  await upgraded.waitForDeployment();

  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n=== UPGRADE SUMMARY ===");
  console.log("Proxy address (unchanged):", proxyAddress);
  console.log("New implementation address:", newImplementationAddress);
  console.log("\nUpgrade completed successfully!");
  console.log("Your frontend can continue using the same proxy address:", proxyAddress);

  // Save upgrade information
  await saveUpgradeInfo(
    network.name,
    proxyAddress,
    newImplementationAddress,
    upgraded.deploymentTransaction()?.hash
  );

  return proxyAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
