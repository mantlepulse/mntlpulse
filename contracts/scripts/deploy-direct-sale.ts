import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploy DirectTokenSale contract
 *
 * This script deploys a simple fixed-price token sale contract for direct
 * PULSE token purchases in the MantlePulse app.
 *
 * Prerequisites:
 * 1. PULSE token must be deployed first
 * 2. USDC token address must be known for the network
 * 3. Owner must have PULSE tokens to fund the sale contract
 */
async function main() {
  console.log("Deploying DirectTokenSale...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log();

  // Get token addresses based on network
  const tokenAddresses = getTokenAddresses(Number(network.chainId));

  console.log("PULSE Token:", tokenAddresses.pulseToken);
  console.log("USDC Token:", tokenAddresses.usdcToken);
  console.log("ETH/USD Price Feed:", tokenAddresses.ethUsdPriceFeed);
  console.log();

  // Deploy DirectTokenSale
  console.log("1. Deploying DirectTokenSale...");
  const DirectTokenSale = await ethers.getContractFactory("DirectTokenSale");
  const directSale = await DirectTokenSale.deploy(
    tokenAddresses.pulseToken,
    tokenAddresses.usdcToken,
    tokenAddresses.ethUsdPriceFeed
  );

  await directSale.waitForDeployment();
  const directSaleAddress = await directSale.getAddress();

  console.log("✅ DirectTokenSale deployed to:", directSaleAddress);
  console.log();

  // Save deployment info
  const deployment = {
    network: {
      name: network.name,
      chainId: Number(network.chainId),
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DirectTokenSale: {
        address: directSaleAddress,
        tokenPrice: "0.01 USDC",
        totalSupply: "1,000,000 PULSE",
        minPurchase: "100 PULSE",
        maxPurchasePerWallet: "50,000 PULSE",
        ethPricing: "Dynamic via Chainlink ETH/USD oracle",
      },
      PulseToken: {
        address: tokenAddresses.pulseToken,
      },
      USDCToken: {
        address: tokenAddresses.usdcToken,
      },
      ChainlinkETHUSD: {
        address: tokenAddresses.ethUsdPriceFeed,
      },
    },
  };

  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(
    deploymentsDir,
    `direct-sale-${getNetworkFileName(Number(network.chainId))}`
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("=== Deployment Summary ===");
  console.log("\nContract Address:", directSaleAddress);
  console.log("\nConfiguration:");
  console.log("  Price: 0.01 USDC per PULSE");
  console.log("  ETH Pricing: Dynamic via Chainlink oracle (1 ETH = ETH price × 100 PULSE)");
  console.log("  Total Supply: 1,000,000 PULSE");
  console.log("  Min Purchase: 100 PULSE");
  console.log("  Max Per Wallet: 50,000 PULSE");
  console.log("  Price Feed:", tokenAddresses.ethUsdPriceFeed);

  console.log("\n=== Next Steps ===");
  console.log("1. Transfer 1,000,000 PULSE tokens to DirectTokenSale contract:");
  console.log(`   pulseToken.transfer("${directSaleAddress}", ethers.parseEther("1000000"))`);
  console.log("\n2. Approve USDC for testing (if using test USDC):");
  console.log(`   usdcToken.approve("${directSaleAddress}", ethers.parseUnits("10000", 6))`);
  console.log("\n3. Test purchase with ETH:");
  console.log(`   directSale.buyWithETH({ value: ethers.parseEther("0.01") })`);
  console.log("\n4. Test purchase with USDC:");
  console.log(`   directSale.buyWithUSDC(ethers.parseUnits("10", 6))`);
  console.log("\n5. Integrate into frontend at mantlepulse-app");

  console.log("\n=== Admin Functions ===");
  console.log("View sale stats:");
  console.log(`  directSale.getSaleStats()`);
  console.log("\nWithdraw funds:");
  console.log(`  directSale.withdrawFunds("${deployer.address}")`);
  console.log("\nPause sale:");
  console.log(`  directSale.pause()`);
  console.log("\nUnpause sale:");
  console.log(`  directSale.unpause()`);

  console.log("\n✅ Deployment complete!");
  console.log(`Deployment info saved to: ${deploymentPath}`);
}

function getTokenAddresses(chainId: number): {
  pulseToken: string;
  usdcToken: string;
  ethUsdPriceFeed: string;
} {
  // Mantle Sepolia (testnet)
  if (chainId === 5003) {
    // Try to load from existing deployment
    const deploymentPath = path.join(
      __dirname,
      "..",
      "deployments",
      "mantle-sepolia.json"
    );

    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      return {
        pulseToken: deployment.PulsePollToken?.address || "",
        usdcToken: "", // Mantle Sepolia USDC - update after deployment
        ethUsdPriceFeed: "", // Chainlink ETH/USD on Mantle Sepolia - verify availability
      };
    }

    return {
      pulseToken: "", // PulsePollToken on Mantle Sepolia - deploy first
      usdcToken: "", // Mantle Sepolia USDC - update after deployment
      ethUsdPriceFeed: "", // Chainlink ETH/USD on Mantle Sepolia - verify availability
    };
  }

  // Mantle Mainnet
  if (chainId === 5000) {
    return {
      pulseToken: "", // PULSE token on Mantle Mainnet - deploy first
      usdcToken: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", // Mantle Mainnet USDC
      ethUsdPriceFeed: "0x5bc7Cf88EB131DB18b5d7930e793095140799aD5", // Chainlink ETH/USD on Mantle Mainnet
    };
  }

  // Localhost
  if (chainId === 31337) {
    return {
      pulseToken: "", // Deploy PULSE token first for local testing
      usdcToken: "", // Deploy mock USDC for local testing
      ethUsdPriceFeed: "", // Deploy mock price feed for local testing
    };
  }

  throw new Error(`Unsupported network: ${chainId}`);
}

function getNetworkFileName(chainId: number): string {
  const networkNames: { [key: number]: string } = {
    5000: "mantle.json",
    5003: "mantle-sepolia.json",
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
