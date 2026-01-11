import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploy DirectTokenSale with mock dependencies for testnet
 *
 * This script:
 * 1. Deploys MockUSDC token
 * 2. Deploys MockV3Aggregator (Chainlink price feed mock)
 * 3. Deploys DirectTokenSale contract
 * 4. Transfers PULSE tokens to the sale contract
 */
async function main() {
  console.log("Deploying DirectTokenSale for testnet with mocks...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deployer address:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log();

  // Load PULSE token address from deployment file
  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    "mantle-sepolia.json"
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Deploy core contracts first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const pulseTokenAddress = deployment.PulsePollToken?.address;

  if (!pulseTokenAddress) {
    throw new Error("PULSE token address not found in deployment file");
  }

  console.log("PULSE Token:", pulseTokenAddress);
  console.log();

  // 1. Deploy MockUSDC
  console.log("1. Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("   MockUSDC deployed to:", mockUSDCAddress);

  // 2. Deploy MockV3Aggregator (ETH/USD price feed)
  // Set initial ETH price to $3,500 (8 decimals)
  console.log("\n2. Deploying MockV3Aggregator (ETH/USD price feed)...");
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const initialEthPrice = 350000000000n; // $3,500 with 8 decimals
  const mockPriceFeed = await MockV3Aggregator.deploy(8, initialEthPrice);
  await mockPriceFeed.waitForDeployment();
  const mockPriceFeedAddress = await mockPriceFeed.getAddress();
  console.log("   MockV3Aggregator deployed to:", mockPriceFeedAddress);
  console.log("   Initial ETH price: $3,500");

  // 3. Deploy DirectTokenSale
  console.log("\n3. Deploying DirectTokenSale...");
  const DirectTokenSale = await ethers.getContractFactory("DirectTokenSale");
  const directSale = await DirectTokenSale.deploy(
    pulseTokenAddress,
    mockUSDCAddress,
    mockPriceFeedAddress
  );
  await directSale.waitForDeployment();
  const directSaleAddress = await directSale.getAddress();
  console.log("   DirectTokenSale deployed to:", directSaleAddress);

  // 4. Transfer PULSE tokens to DirectTokenSale
  console.log("\n4. Transferring PULSE tokens to DirectTokenSale...");
  const pulseToken = await ethers.getContractAt("PulsePollToken", pulseTokenAddress);
  const transferAmount = ethers.parseEther("1000000"); // 1 million PULSE
  const balance = await pulseToken.balanceOf(deployer.address);

  if (balance >= transferAmount) {
    const tx = await pulseToken.transfer(directSaleAddress, transferAmount);
    await tx.wait();
    console.log("   Transferred 1,000,000 PULSE to DirectTokenSale");
  } else {
    console.log("   Warning: Insufficient PULSE balance. Fund the sale contract manually.");
    console.log("   Current balance:", ethers.formatEther(balance), "PULSE");
  }

  // Update deployment file
  deployment.DirectTokenSale = {
    address: directSaleAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    network: "mantle-sepolia",
    chainId: 5003,
    verified: false,
    config: {
      pulseToken: pulseTokenAddress,
      usdcToken: mockUSDCAddress,
      ethUsdPriceFeed: mockPriceFeedAddress,
      tokenPriceUSDC: "0.01",
      minPurchase: "100",
      maxPurchasePerWallet: "50000",
    },
  };

  deployment.MockUSDC = {
    address: mockUSDCAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    network: "mantle-sepolia",
    chainId: 5003,
  };

  deployment.MockV3Aggregator = {
    address: mockPriceFeedAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    network: "mantle-sepolia",
    chainId: 5003,
    config: {
      initialEthPrice: "$3,500",
    },
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment file updated.");

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("\nContracts Deployed:");
  console.log("  MockUSDC:", mockUSDCAddress);
  console.log("  MockV3Aggregator:", mockPriceFeedAddress);
  console.log("  DirectTokenSale:", directSaleAddress);

  console.log("\n=== Configuration ===");
  console.log("  Token Price: 0.01 USDC per PULSE");
  console.log("  Min Purchase: 100 PULSE");
  console.log("  Max Per Wallet: 50,000 PULSE");
  console.log("  ETH Price (mock): $3,500");

  console.log("\n=== Testing Commands ===");
  console.log("\n1. Mint mock USDC for testing:");
  console.log(`   mockUSDC.mint("YOUR_ADDRESS", ethers.parseUnits("10000", 6))`);

  console.log("\n2. Approve USDC spending:");
  console.log(`   mockUSDC.approve("${directSaleAddress}", ethers.parseUnits("10000", 6))`);

  console.log("\n3. Buy with USDC:");
  console.log(`   directSale.buyWithUSDC(ethers.parseUnits("100", 6)) // Buy with 100 USDC`);

  console.log("\n4. Buy with ETH:");
  console.log(`   directSale.buyWithETH({ value: ethers.parseEther("0.01") })`);

  console.log("\n5. Update mock ETH price (owner only):");
  console.log(`   mockPriceFeed.updateAnswer(400000000000n) // Set to $4,000`);

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
