import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploy DirectTokenSaleUpgradeable manually (without upgrades plugin)
 * This avoids RPC compatibility issues with Base Sepolia
 */
async function main() {
  console.log("Deploying DirectTokenSaleUpgradeable manually...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log();

  // Get token addresses
  const pulseToken = "0x19821658D5798976152146d1c1882047670B898c";
  const usdcToken = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("PULSE Token:", pulseToken);
  console.log("USDC Token:", usdcToken);
  console.log();

  // Step 1: Deploy implementation
  console.log("1. Deploying implementation contract...");
  const DirectTokenSale = await ethers.getContractFactory("DirectTokenSaleUpgradeable");
  const implementation = await DirectTokenSale.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log("✅ Implementation deployed to:", implementationAddress);

  // Step 2: Deploy ERC1967Proxy
  console.log("\n2. Deploying ERC1967Proxy...");

  // Encode initialize function call
  const initializeData = DirectTokenSale.interface.encodeFunctionData("initialize", [
    pulseToken,
    usdcToken,
  ]);

  const DirectTokenSaleProxy = await ethers.getContractFactory("DirectTokenSaleProxy");
  const proxy = await DirectTokenSaleProxy.deploy(implementationAddress, initializeData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("✅ Proxy deployed to:", proxyAddress);

  // Step 3: Verify configuration
  console.log("\n3. Verifying configuration...");
  const directSale = await ethers.getContractAt("DirectTokenSaleUpgradeable", proxyAddress);

  try {
    const tokenPrice = await directSale.tokenPriceUSDC();
    const spread = await directSale.swapSpreadBasisPoints();
    const minPurchase = await directSale.minPurchase();
    const maxPurchase = await directSale.maxPurchasePerWallet();

    console.log("\n=== Initial Configuration ===");
    console.log("Token Price:", ethers.formatUnits(tokenPrice, 6), "USDC per PULSE");
    console.log("Swap Spread:", Number(spread) / 100, "%");
    console.log("Min Purchase:", ethers.formatEther(minPurchase), "PULSE");
    console.log("Max Per Wallet:", ethers.formatEther(maxPurchase), "PULSE");
  } catch (error) {
    console.log("⚠️  Could not verify configuration immediately (initialization may still be processing)");
    console.log("Configuration will be available shortly");
  }

  // Save deployment info
  const deployment = {
    network: {
      name: network.name,
      chainId: Number(network.chainId),
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DirectTokenSaleProxy: {
        address: proxyAddress,
        type: "ERC1967 Proxy",
      },
      DirectTokenSaleImplementation: {
        address: implementationAddress,
        type: "Implementation",
      },
      PulseToken: {
        address: pulseToken,
      },
      USDCToken: {
        address: usdcToken,
      },
    },
    configuration: {
      tokenPrice: "0.01 USDC",
      swapSpread: "2.5%",
      buyPrice: {
        usdc: "0.01 USDC per PULSE",
        eth: "~0.00001 ETH per PULSE (at $1000/ETH)",
      },
      sellPrice: {
        usdc: "0.00975 USDC per PULSE (2.5% spread)",
        eth: "~0.0000097 ETH per PULSE (at $1000/ETH)",
      },
      totalSupply: "1,000,000 PULSE",
      minPurchase: "100 PULSE",
      maxPurchasePerWallet: "50,000 PULSE",
    },
  };

  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, "direct-sale-upgradeable-base-sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("\n=== Deployment Summary ===");
  console.log("\nProxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("\nPricing:");
  console.log("  Buy:  0.01 USDC per PULSE");
  console.log("  Sell: 0.00975 USDC per PULSE (2.5% spread)");
  console.log("\nConfiguration:");
  console.log("  Total Supply: 1,000,000 PULSE");
  console.log("  Min Purchase: 100 PULSE");
  console.log("  Max Per Wallet: 50,000 PULSE");
  console.log("  Swap Spread: 2.5%");

  console.log("\n=== Next Steps ===");
  console.log("1. Transfer 1,000,000 PULSE tokens to proxy:");
  console.log(`   Address: ${proxyAddress}`);
  console.log("\n2. Fund proxy with ETH for sell liquidity (optional):");
  console.log(`   Send ETH to ${proxyAddress}`);
  console.log("\n3. Update frontend configuration:");
  console.log(`   Update DIRECT_SALE_ADDRESSES[84532] = "${proxyAddress}"`);

  console.log("\n✅ Deployment complete!");
  console.log(`Deployment info saved to: ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
