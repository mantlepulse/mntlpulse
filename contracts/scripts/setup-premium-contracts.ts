import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Setting up Premium contracts connections...");

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env file");
  }

  console.log("Using account:", deployer.address);

  // Get addresses from deployments file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const networkFileMap: { [key: string]: string } = {
    "baseSepolia": "base-sepolia.json",
    "base": "base.json",
  };
  const fileName = networkFileMap[network.name] || `${network.name}.json`;
  const filePath = path.join(deploymentsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployments file not found: ${filePath}`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const pollsContractAddress = deploymentData.PollsContract?.proxy;
  const stakingContractAddress = deploymentData.StakingContract?.proxy;
  const premiumContractAddress = deploymentData.PremiumSubscription?.proxy;
  const pulseTokenAddress = deploymentData.PulsePollToken?.address;

  if (!pollsContractAddress) {
    throw new Error("PollsContract not deployed yet");
  }

  if (!stakingContractAddress) {
    throw new Error("StakingContract not deployed yet");
  }

  if (!premiumContractAddress) {
    throw new Error("PremiumSubscription not deployed yet");
  }

  console.log("\n=== CONTRACT ADDRESSES ===");
  console.log("PollsContract:", pollsContractAddress);
  console.log("StakingContract:", stakingContractAddress);
  console.log("PremiumSubscription:", premiumContractAddress);
  console.log("PulsePollToken:", pulseTokenAddress);

  // Get contract instances
  const pollsContract = await ethers.getContractAt("PollsContract", pollsContractAddress);
  const stakingContract = await ethers.getContractAt("StakingContract", stakingContractAddress);

  // Check current settings
  console.log("\n=== CURRENT SETTINGS ===");

  try {
    const currentPremiumOnPolls = await pollsContract.premiumContract();
    console.log("PollsContract.premiumContract:", currentPremiumOnPolls);
  } catch (error) {
    console.log("PollsContract.premiumContract: Not set or function doesn't exist");
  }

  try {
    const currentPremiumOnStaking = await stakingContract.premiumContract();
    console.log("StakingContract.premiumContract:", currentPremiumOnStaking);
  } catch (error) {
    console.log("StakingContract.premiumContract: Not set or function doesn't exist");
  }

  // Set PremiumContract on PollsContract
  console.log("\n=== SETTING UP CONNECTIONS ===");

  try {
    console.log("\n1. Setting PremiumContract on PollsContract...");
    const tx1 = await pollsContract.setPremiumContract(premiumContractAddress);
    console.log("   Transaction sent:", tx1.hash);
    await tx1.wait();
    console.log("   Done!");
  } catch (error: any) {
    if (error.message?.includes("already set") || error.message?.includes("same")) {
      console.log("   PremiumContract already set on PollsContract");
    } else {
      console.log("   Error:", error.message || error);
    }
  }

  // Set PremiumContract on StakingContract
  try {
    console.log("\n2. Setting PremiumContract on StakingContract...");
    const tx2 = await stakingContract.setPremiumContract(premiumContractAddress);
    console.log("   Transaction sent:", tx2.hash);
    await tx2.wait();
    console.log("   Done!");
  } catch (error: any) {
    if (error.message?.includes("already set") || error.message?.includes("same")) {
      console.log("   PremiumContract already set on StakingContract");
    } else {
      console.log("   Error:", error.message || error);
    }
  }

  // Whitelist PULSE token on PollsContract (for QV)
  if (pulseTokenAddress) {
    try {
      console.log("\n3. Whitelisting PULSE token on PollsContract...");
      const isWhitelisted = await pollsContract.whitelistedTokens(pulseTokenAddress);
      if (!isWhitelisted) {
        const tx3 = await pollsContract.whitelistToken(pulseTokenAddress, true);
        console.log("   Transaction sent:", tx3.hash);
        await tx3.wait();
        console.log("   Done!");
      } else {
        console.log("   PULSE token already whitelisted");
      }
    } catch (error: any) {
      console.log("   Error:", error.message || error);
    }
  }

  // Set PULSE token on PollsContract (for QV)
  if (pulseTokenAddress) {
    try {
      console.log("\n4. Setting PULSE token on PollsContract...");
      const currentPulse = await pollsContract.pulseToken();
      if (currentPulse === ethers.ZeroAddress) {
        const tx4 = await pollsContract.setPulseToken(pulseTokenAddress);
        console.log("   Transaction sent:", tx4.hash);
        await tx4.wait();
        console.log("   Done!");
      } else {
        console.log("   PULSE token already set:", currentPulse);
      }
    } catch (error: any) {
      console.log("   Error:", error.message || error);
    }
  }

  // Set Quadratic Voting Treasury on PollsContract
  try {
    console.log("\n5. Setting Quadratic Voting Treasury on PollsContract...");
    const currentTreasury = await pollsContract.quadraticVotingTreasury();
    if (currentTreasury === ethers.ZeroAddress) {
      // Use deployer address as treasury for now (can be changed later)
      const treasuryAddress = deployer.address;
      console.log("   Treasury address:", treasuryAddress);
      const tx5 = await pollsContract.setQuadraticVotingTreasury(treasuryAddress);
      console.log("   Transaction sent:", tx5.hash);
      await tx5.wait();
      console.log("   Done!");
      console.log("   NOTE: Treasury is set to deployer address. You can change it later using setQuadraticVotingTreasury()");
    } else {
      console.log("   Quadratic Voting Treasury already set:", currentTreasury);
    }
  } catch (error: any) {
    console.log("   Error:", error.message || error);
  }

  // Verify final settings
  console.log("\n=== FINAL VERIFICATION ===");

  try {
    const finalPremiumOnPolls = await pollsContract.premiumContract();
    console.log("PollsContract.premiumContract:", finalPremiumOnPolls);
    console.log("  Match:", finalPremiumOnPolls.toLowerCase() === premiumContractAddress.toLowerCase() ? "YES" : "NO");
  } catch (error) {
    console.log("PollsContract.premiumContract: Error reading");
  }

  try {
    const finalPremiumOnStaking = await stakingContract.premiumContract();
    console.log("StakingContract.premiumContract:", finalPremiumOnStaking);
    console.log("  Match:", finalPremiumOnStaking.toLowerCase() === premiumContractAddress.toLowerCase() ? "YES" : "NO");
  } catch (error) {
    console.log("StakingContract.premiumContract: Error reading");
  }

  try {
    const finalPulseToken = await pollsContract.pulseToken();
    console.log("PollsContract.pulseToken:", finalPulseToken);
    console.log("  Set:", finalPulseToken !== ethers.ZeroAddress ? "YES" : "NO");
  } catch (error) {
    console.log("PollsContract.pulseToken: Error reading");
  }

  try {
    const finalTreasury = await pollsContract.quadraticVotingTreasury();
    console.log("PollsContract.quadraticVotingTreasury:", finalTreasury);
    console.log("  Set:", finalTreasury !== ethers.ZeroAddress ? "YES" : "NO");
  } catch (error) {
    console.log("PollsContract.quadraticVotingTreasury: Error reading");
  }

  console.log("\n=== SETUP COMPLETE ===");
  console.log("\nEnvironment variables to set:");
  console.log(`BASE_SEPOLIA_STAKING_CONTRACT=${stakingContractAddress}`);
  console.log(`BASE_SEPOLIA_PREMIUM_CONTRACT=${premiumContractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
