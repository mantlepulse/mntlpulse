import { ethers, upgrades } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploy DirectTokenSaleUpgradeable as UUPS proxy
 */
async function main() {
  console.log("Deploying DirectTokenSaleUpgradeable...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log();

  // Get token addresses
  const tokenAddresses = getTokenAddresses(Number(network.chainId));

  console.log("PULSE Token:", tokenAddresses.pulseToken);
  console.log("USDC Token:", tokenAddresses.usdcToken);
  console.log("ETH/USD Price Feed:", tokenAddresses.ethUsdPriceFeed);
  console.log();

  // Deploy upgradeable contract
  console.log("1. Deploying DirectTokenSaleUpgradeable as UUPS proxy...");
  const DirectTokenSale = await ethers.getContractFactory("DirectTokenSaleUpgradeable");

  const directSale = await upgrades.deployProxy(
    DirectTokenSale,
    [tokenAddresses.pulseToken, tokenAddresses.usdcToken, tokenAddresses.ethUsdPriceFeed],
    {
      initializer: "initialize",
      kind: "uups",
      timeout: 0, // Disable timeout for slow networks
      pollingInterval: 5000, // Check every 5 seconds
    }
  );

  await directSale.waitForDeployment();
  const proxyAddress = await directSale.getAddress();

  console.log("✅ Proxy deployed to:", proxyAddress);

  // Wait a bit for the network to sync before checking implementation
  console.log("Waiting for network sync...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get implementation address with retry
  let implementationAddress: string;
  try {
    implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  } catch (error) {
    console.log("Retrying implementation address fetch...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  }
  console.log("✅ Implementation deployed to:", implementationAddress);
  console.log();

  // Verify initial configuration
  const tokenPrice = await directSale.tokenPriceUSDC();
  const spread = await directSale.swapSpreadBasisPoints();
  const minPurchase = await directSale.minPurchase();
  const maxPurchase = await directSale.maxPurchasePerWallet();

  console.log("=== Initial Configuration ===");
  console.log("Token Price:", ethers.formatUnits(tokenPrice, 6), "USDC per PULSE");
  console.log("Swap Spread:", Number(spread) / 100, "%");
  console.log("Min Purchase:", ethers.formatEther(minPurchase), "PULSE");
  console.log("Max Per Wallet:", ethers.formatEther(maxPurchase), "PULSE");
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
      DirectTokenSaleProxy: {
        address: proxyAddress,
        type: "UUPS Proxy",
      },
      DirectTokenSaleImplementation: {
        address: implementationAddress,
        type: "Implementation",
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
    configuration: {
      tokenPrice: "0.01 USDC",
      swapSpread: "2.5%",
      buyPrice: {
        usdc: "0.01 USDC per PULSE",
        eth: "Dynamic via Chainlink (1 ETH = ETH price × 100 PULSE)",
      },
      sellPrice: {
        usdc: "0.00975 USDC per PULSE (2.5% spread)",
        eth: "Dynamic via Chainlink (with 2.5% spread)",
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

  const deploymentPath = path.join(
    deploymentsDir,
    `direct-sale-upgradeable-${getNetworkFileName(Number(network.chainId))}`
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("=== Deployment Summary ===");
  console.log("\nProxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("Chainlink Price Feed:", tokenAddresses.ethUsdPriceFeed);
  console.log("\nPricing:");
  console.log("  USDC Buy:  0.01 USDC per PULSE");
  console.log("  USDC Sell: 0.00975 USDC per PULSE (2.5% spread)");
  console.log("  ETH Buy:   Dynamic via Chainlink (1 ETH = ETH price × 100 PULSE)");
  console.log("  ETH Sell:  Dynamic via Chainlink (with 2.5% spread)");
  console.log("\nConfiguration:");
  console.log("  Total Supply: 1,000,000 PULSE");
  console.log("  Min Purchase: 100 PULSE");
  console.log("  Max Per Wallet: 50,000 PULSE");
  console.log("  Swap Spread: 2.5%");

  // Determine which env variable to update
  const envVarName = Number(network.chainId) === 5000
    ? "DIRECT_SALE_PROXY_ADDRESS_MANTLE_MAINNET"
    : "DIRECT_SALE_PROXY_ADDRESS_MANTLE_SEPOLIA";

  console.log("\n=== Next Steps ===");
  console.log(`\n0. Update .env with the new proxy address:`);
  console.log(`   ${envVarName}=${proxyAddress}`);
  console.log("\n1. Transfer 1,000,000 PULSE tokens to proxy:");
  console.log(`   pulseToken.transfer("${proxyAddress}", ethers.parseEther("1000000"))`);
  console.log("\n2. Fund proxy with ETH for sell liquidity (optional):");
  console.log(`   Send ETH to ${proxyAddress}`);
  console.log("\n3. Update frontend configuration:");
  console.log(`   Update DIRECT_SALE_ADDRESSES[5003] = "${proxyAddress}"`);
  console.log("\n4. Test buy and sell flows");

  console.log("\n=== Upgrade Instructions ===");
  console.log("To upgrade this contract in the future:");
  console.log("1. Make changes to DirectTokenSaleUpgradeable.sol");
  console.log("2. Run: npx hardhat run scripts/upgrade-direct-sale.ts --network mantleSepolia");

  console.log("\n✅ Deployment complete!");
  console.log(`Deployment info saved to: ${deploymentPath}`);
}

function getTokenAddresses(chainId: number): {
  pulseToken: string;
  usdcToken: string;
  ethUsdPriceFeed: string;
} {
  // Mantle Sepolia
  if (chainId === 5003) {
    return {
      pulseToken: "0xa3713739c39419aA1c6daf349dB4342Be59b9142", // PulsePollToken
      usdcToken: "0x6763442EbDe3705C4AE49Ca926b001997C67cC51", // MockUSDC
      ethUsdPriceFeed: "0x1b684A60309b0916C77834d62d117d306171FDFE", // MockV3Aggregator
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
      pulseToken: "",
      usdcToken: "",
      ethUsdPriceFeed: "",
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
