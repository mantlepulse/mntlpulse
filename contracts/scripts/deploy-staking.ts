import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Configuration
const MINIMUM_STAKE_FOR_PREMIUM = ethers.parseEther("10000"); // 10,000 PULSE
const REWARD_RATE_PER_SECOND = ethers.parseEther("0.0001"); // 0.0001 PULSE per token per second

async function saveDeploymentInfo(
  networkName: string,
  proxyAddress: string,
  implementationAddress: string,
  deployerAddress: string,
  deploymentTx: string | undefined,
  pulseTokenAddress: string
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

  // Add StakingContract deployment info
  deploymentData.StakingContract = {
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
      minimumStakeForPremium: MINIMUM_STAKE_FOR_PREMIUM.toString(),
      rewardRatePerSecond: REWARD_RATE_PER_SECOND.toString(),
    },
    upgrades: [],
  };

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Write deployment info
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log(`\nDeployment info saved to: ${filePath}`);
}

async function main() {
  console.log("Deploying StakingContract with UUPS Proxy...");

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get PULSE token address from deployments file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const networkFileMap: { [key: string]: string } = {
    "mantleSepolia": "mantle-sepolia.json",
    "mantle": "mantle.json",
  };
  const fileName = networkFileMap[network.name] || `${network.name}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployments file not found: ${filePath}. Deploy PulsePollToken first.`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const pulseTokenAddress = deploymentData.PulsePollToken?.address;

  if (!pulseTokenAddress) {
    throw new Error("PulsePollToken address not found in deployments. Deploy the token first.");
  }

  console.log("\nUsing PulsePollToken at:", pulseTokenAddress);
  console.log("Minimum stake for premium:", ethers.formatEther(MINIMUM_STAKE_FOR_PREMIUM), "PULSE");
  console.log("Reward rate per second:", ethers.formatEther(REWARD_RATE_PER_SECOND), "PULSE per token");

  const StakingContract = await ethers.getContractFactory("StakingContract");

  console.log("\nDeploying proxy and implementation...");
  const stakingContract = await upgrades.deployProxy(
    StakingContract,
    [pulseTokenAddress, MINIMUM_STAKE_FOR_PREMIUM, REWARD_RATE_PER_SECOND],
    {
      initializer: "initialize",
      kind: "uups",
      redeployImplementation: "always",
      unsafeSkipStorageCheck: true,
      unsafeSkipProxyAdminCheck: true,
    }
  );

  await stakingContract.waitForDeployment();
  const proxyAddress = await stakingContract.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\nStakingContract Proxy deployed to:", proxyAddress);
  console.log("Implementation deployed to:", implementationAddress);

  // Wait a bit more and then check the owner
  console.log("\nWaiting for deployment to be fully confirmed...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    const owner = await stakingContract.owner();
    const pulseToken = await stakingContract.pulseToken();
    const minimumStake = await stakingContract.minimumStakeForPremium();
    const rewardRate = await stakingContract.rewardRatePerSecond();

    console.log("\n=== CONTRACT STATE ===");
    console.log("Owner:", owner);
    console.log("PULSE Token:", pulseToken);
    console.log("Minimum Stake for Premium:", ethers.formatEther(minimumStake), "PULSE");
    console.log("Reward Rate:", ethers.formatEther(rewardRate), "PULSE/token/second");
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
    stakingContract.deploymentTransaction()?.hash,
    pulseTokenAddress
  );

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Verify the contract:");
  console.log(`   npx hardhat verify --network ${network.name} ${implementationAddress}`);
  console.log("\n2. Fund the reward pool:");
  console.log("   Transfer PULSE tokens to the contract and call fundRewardPool()");
  console.log("\n3. Deploy PremiumSubscription contract:");
  console.log("   npx hardhat run scripts/deploy-premium.ts --network", network.name);
  console.log("\n4. Update environment variables:");
  console.log(`   MANTLE_SEPOLIA_STAKING_CONTRACT=${proxyAddress}`);

  return proxyAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
