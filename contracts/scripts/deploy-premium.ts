import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Configuration - Tier prices in PULSE
const MONTHLY_PRICE = ethers.parseEther("1000");   // 1,000 PULSE
const ANNUAL_PRICE = ethers.parseEther("10000");   // 10,000 PULSE
const LIFETIME_PRICE = ethers.parseEther("50000"); // 50,000 PULSE

async function saveDeploymentInfo(
  networkName: string,
  proxyAddress: string,
  implementationAddress: string,
  deployerAddress: string,
  deploymentTx: string | undefined,
  pulseTokenAddress: string,
  stakingContractAddress: string,
  treasuryAddress: string
) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");

  // Map network names to file names
  const networkFileMap: { [key: string]: string } = {
    "mantleSepolia": "mantle-sepolia.json",
    "mantle": "mantle.json",
  };

  const fileName = networkFileMap[networkName] || `${networkName}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  // Get chain ID
  const chainIdMap: { [key: string]: number } = {
    "mantleSepolia": 5003,
    "mantle": 5000,
  };
  const chainId = chainIdMap[networkName] || Number((await ethers.provider.getNetwork()).chainId);

  // Read existing deployment file
  let deploymentData: any = {};
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    deploymentData = JSON.parse(fileContent);
  }

  // Add PremiumSubscription deployment info
  deploymentData.PremiumSubscription = {
    proxy: proxyAddress,
    implementation: implementationAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    deploymentTx: deploymentTx || "N/A",
    network: networkName === "mantleSepolia" ? "mantle-sepolia" : networkName,
    chainId: chainId,
    verified: false,
    config: {
      pulseToken: pulseTokenAddress,
      stakingContract: stakingContractAddress,
      treasury: treasuryAddress,
      monthlyPrice: MONTHLY_PRICE.toString(),
      annualPrice: ANNUAL_PRICE.toString(),
      lifetimePrice: LIFETIME_PRICE.toString(),
    },
    upgrades: [],
  };

  // Write deployment info
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log(`\nDeployment info saved to: ${filePath}`);
}

async function main() {
  console.log("Deploying PremiumSubscription with UUPS Proxy...");

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get addresses from deployments file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const networkFileMap: { [key: string]: string } = {
    "mantleSepolia": "mantle-sepolia.json",
    "mantle": "mantle.json",
  };
  const fileName = networkFileMap[network.name] || `${network.name}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployments file not found: ${filePath}. Deploy PulsePollToken and StakingContract first.`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const pulseTokenAddress = deploymentData.PulsePollToken?.address;
  const stakingContractAddress = deploymentData.StakingContract?.proxy;

  if (!pulseTokenAddress) {
    throw new Error("PulsePollToken address not found in deployments. Deploy the token first.");
  }

  if (!stakingContractAddress) {
    throw new Error("StakingContract address not found in deployments. Deploy StakingContract first.");
  }

  // Use deployer as treasury for now (can be changed later)
  const treasuryAddress = deployer.address;

  console.log("\n=== CONFIGURATION ===");
  console.log("PulsePollToken:", pulseTokenAddress);
  console.log("StakingContract:", stakingContractAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("\n=== TIER PRICES ===");
  console.log("Monthly:", ethers.formatEther(MONTHLY_PRICE), "PULSE");
  console.log("Annual:", ethers.formatEther(ANNUAL_PRICE), "PULSE");
  console.log("Lifetime:", ethers.formatEther(LIFETIME_PRICE), "PULSE");

  const PremiumSubscription = await ethers.getContractFactory("PremiumSubscription");

  console.log("\nDeploying proxy and implementation...");
  const premiumContract = await upgrades.deployProxy(
    PremiumSubscription,
    [
      pulseTokenAddress,
      stakingContractAddress,
      treasuryAddress,
      MONTHLY_PRICE,
      ANNUAL_PRICE,
      LIFETIME_PRICE,
    ],
    {
      initializer: "initialize",
      kind: "uups",
      redeployImplementation: "always",
      unsafeSkipStorageCheck: true,
      unsafeSkipProxyAdminCheck: true,
    }
  );

  await premiumContract.waitForDeployment();
  const proxyAddress = await premiumContract.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\nPremiumSubscription Proxy deployed to:", proxyAddress);
  console.log("Implementation deployed to:", implementationAddress);

  // Wait a bit more and then check the owner
  console.log("\nWaiting for deployment to be fully confirmed...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    const owner = await premiumContract.owner();
    const pulseToken = await premiumContract.pulseToken();
    const treasury = await premiumContract.treasury();

    console.log("\n=== CONTRACT STATE ===");
    console.log("Owner:", owner);
    console.log("PULSE Token:", pulseToken);
    console.log("Treasury:", treasury);

    // Check tier prices
    const monthlyPrice = await premiumContract.tierPrices(1); // MONTHLY = 1
    const annualPrice = await premiumContract.tierPrices(2);  // ANNUAL = 2
    const lifetimePrice = await premiumContract.tierPrices(3); // LIFETIME = 3
    console.log("\nTier Prices:");
    console.log("  Monthly:", ethers.formatEther(monthlyPrice), "PULSE");
    console.log("  Annual:", ethers.formatEther(annualPrice), "PULSE");
    console.log("  Lifetime:", ethers.formatEther(lifetimePrice), "PULSE");
  } catch (error) {
    console.log("Note: Could not immediately verify contract state (this is normal on some networks)");
  }

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Proxy address (use this in your frontend):", proxyAddress);
  console.log("Implementation address:", implementationAddress);
  console.log("\nIMPORTANT: Always use the PROXY address in your frontend!");

  // Save deployment information
  await saveDeploymentInfo(
    network.name,
    proxyAddress,
    implementationAddress,
    deployer.address,
    premiumContract.deploymentTransaction()?.hash,
    pulseTokenAddress,
    stakingContractAddress,
    treasuryAddress
  );

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Verify the contract:");
  console.log(`   npx hardhat verify --network ${network.name} ${implementationAddress}`);
  console.log("\n2. Set PremiumContract on StakingContract (if needed):");
  console.log(`   StakingContract.setPremiumContract("${proxyAddress}")`);
  console.log("\n3. Set PremiumContract on PollsContract:");
  console.log(`   PollsContract.setPremiumContract("${proxyAddress}")`);
  console.log("\n4. Update environment variables:");
  console.log(`   MANTLE_SEPOLIA_PREMIUM_CONTRACT=${proxyAddress}`);

  return proxyAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
