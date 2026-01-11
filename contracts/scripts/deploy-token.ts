import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function saveTokenDeployment(
  networkName: string,
  tokenAddress: string,
  deployerAddress: string,
  deploymentTx: string | undefined
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
  const chainId = chainIdMap[networkName] || (await ethers.provider.getNetwork()).chainId;

  // Read existing deployment file
  let deploymentData: any = {};
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    deploymentData = JSON.parse(fileContent);
  }

  // Add token deployment info
  deploymentData.PulsePollToken = {
    address: tokenAddress,
    deployedAt: new Date().toISOString().split('T')[0],
    deployer: deployerAddress,
    deploymentTx: deploymentTx || "N/A",
    network: networkName === "mantleSepolia" ? "mantle-sepolia" : networkName,
    chainId: Number(chainId),
    verified: false,
  };

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));

  console.log(`\nToken deployment info saved to: ${filePath}`);
}

async function main() {
  console.log("Deploying PulsePollToken...");

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Deploying token with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy PulsePollToken
  const PulsePollToken = await ethers.getContractFactory("PulsePollToken");
  const token = await PulsePollToken.deploy();

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("\n=== DEPLOYMENT SUCCESS ===");
  console.log("PulsePollToken deployed to:", tokenAddress);

  // Wait a bit for the deployment to be fully confirmed
  console.log("\nWaiting for deployment to be fully confirmed...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    console.log("Token Name:", await token.name());
    console.log("Token Symbol:", await token.symbol());
    console.log("Token Decimals:", await token.decimals());
    console.log("Total Supply:", ethers.formatEther(await token.totalSupply()), "PULSE");
    console.log("Owner:", await token.owner());
  } catch (error) {
    console.log("Note: Could not immediately read token details (this is normal on some networks)");
    console.log("You can verify the token details later using: cast call", tokenAddress, "\"name()\" --rpc-url <RPC>");
  }

  // Save deployment information
  await saveTokenDeployment(
    network.name,
    tokenAddress,
    deployer.address,
    token.deploymentTransaction()?.hash
  );

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Verify the contract:");
  console.log(`   npx hardhat verify --network ${network.name} ${tokenAddress}`);
  console.log("\n2. Whitelist the token on PollsContract:");
  console.log(`   Call whitelistToken("${tokenAddress}", true) on the PollsContract`);
  console.log("\n3. Update frontend token configuration with this address");

  return tokenAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
