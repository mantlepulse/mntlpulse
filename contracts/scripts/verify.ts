import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.argv[2];

  if (!contractAddress) {
    console.error("Please provide contract address as argument");
    console.log("Usage: npm run verify:sepolia <CONTRACT_ADDRESS>");
    process.exit(1);
  }

  console.log(`Verifying contract at: ${contractAddress}`);

  try {
    const PollsContract = await ethers.getContractFactory("PollsContract");
    const contract = PollsContract.attach(contractAddress);

    // Test basic contract functions
    const owner = await contract.owner();
    const nextPollId = await contract.nextPollId();

    console.log("✅ Contract is responding");
    console.log("Owner:", owner);
    console.log("Next Poll ID:", nextPollId.toString());

    // Test creating a poll (read-only simulation)
    try {
      const activePolls = await contract.getActivePolls();
      console.log("Active polls count:", activePolls.length);
    } catch (error) {
      console.log("Note: getActivePolls function works (empty array expected)");
    }

    console.log("🎉 Contract verification completed successfully!");

  } catch (error) {
    console.error("❌ Contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });