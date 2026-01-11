import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function saveDeploymentInfo(
  networkName: string,
  proxyAddress: string,
  implementationAddress: string,
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

  const deploymentInfo = {
    PollsContract: {
      proxy: proxyAddress,
      implementation: implementationAddress,
      deployedAt: new Date().toISOString(),
      deployer: deployerAddress,
      deploymentTx: deploymentTx || "N/A",
      network: networkName === "mantleSepolia" ? "mantle-sepolia" : networkName,
      chainId: Number(chainId),
      verified: false,
      upgrades: [],
    },
  };

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Write deployment info
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\nDeployment info saved to: ${filePath}`);
}

async function main() {
  console.log("Deploying PollsContract with UUPS Proxy...");

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const PollsContract = await ethers.getContractFactory("PollsContract");

  console.log("Deploying proxy and implementation...");
  const pollsContract = await upgrades.deployProxy(PollsContract, [], {
    initializer: "initialize",
    kind: "uups",
  });

  await pollsContract.waitForDeployment();
  const proxyAddress = await pollsContract.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\nPollsContract Proxy deployed to:", proxyAddress);
  console.log("Implementation deployed to:", implementationAddress);

  // Wait a bit more and then check the owner
  console.log("\nWaiting for deployment to be fully confirmed...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const owner = await pollsContract.owner();
    console.log("Owner:", owner);
  } catch (error) {
    console.log("Note: Could not immediately verify owner (this is normal on some networks)");
    console.log("You can verify the owner later using: npx hardhat console --network mantleSepolia");
  }

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Proxy address (use this in your frontend):", proxyAddress);
  console.log("Implementation address:", implementationAddress);
  console.log("\nIMPORTANT: Always use the PROXY address in your frontend!");
  console.log("This address will remain the same even after upgrades.");

  // Save deployment information
  await saveDeploymentInfo(
    network.name,
    proxyAddress,
    implementationAddress,
    deployer.address,
    pollsContract.deploymentTransaction()?.hash
  );

  return proxyAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });