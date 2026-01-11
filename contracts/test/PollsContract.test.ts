import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PollsContract } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PollsContract", function () {
  let pollsContract: PollsContract;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const PollsContract = await ethers.getContractFactory("PollsContract");
    pollsContract = await upgrades.deployProxy(PollsContract, [], {
      initializer: "initialize",
    }) as any;
    await pollsContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await pollsContract.owner()).to.equal(owner.address);
    });

    it("Should start with nextPollId as 0", async function () {
      expect(await pollsContract.nextPollId()).to.equal(0);
    });
  });

  describe("Poll Creation", function () {
    it("Should create a poll successfully", async function () {
      const question = "What is your favorite color?";
      const options = ["Red", "Blue", "Green"];
      const duration = 24 * 60 * 60; // 24 hours

      await expect(
        pollsContract.createPoll(question, options, duration, ethers.ZeroAddress, 0)
      ).to.emit(pollsContract, "PollCreated")
        .withArgs(0, owner.address, question, (await ethers.provider.getBlock("latest"))!.timestamp + duration + 1);

      const poll = await pollsContract.getPoll(0);
      expect(poll.question).to.equal(question);
      expect(poll.options).to.deep.equal(options);
      expect(poll.isActive).to.be.true;
      expect(poll.creator).to.equal(owner.address);
    });

    it("Should fail with empty question", async function () {
      await expect(
        pollsContract.createPoll("", ["Yes", "No"], 3600, ethers.ZeroAddress, 0)
      ).to.be.revertedWith("Question cannot be empty");
    });

    it("Should fail with less than 2 options", async function () {
      await expect(
        pollsContract.createPoll("Test?", ["Yes"], 3600, ethers.ZeroAddress, 0)
      ).to.be.revertedWith("Poll must have at least 2 options");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await pollsContract.createPoll("Test Poll", ["Option 1", "Option 2"], 3600, ethers.ZeroAddress, 0);
    });

    it("Should allow voting", async function () {
      await expect(
        pollsContract.connect(user1).vote(0, 0)
      ).to.emit(pollsContract, "Voted")
        .withArgs(0, user1.address, 0);

      const poll = await pollsContract.getPoll(0);
      expect(poll.votes[0]).to.equal(1);
      expect(poll.votes[1]).to.equal(0);
    });

    it("Should prevent double voting", async function () {
      await pollsContract.connect(user1).vote(0, 0);

      await expect(
        pollsContract.connect(user1).vote(0, 1)
      ).to.be.revertedWith("Already voted");
    });

    it("Should fail with invalid option", async function () {
      await expect(
        pollsContract.connect(user1).vote(0, 5)
      ).to.be.revertedWith("Invalid option");
    });
  });

  describe("Funding", function () {
    beforeEach(async function () {
      await pollsContract.createPoll("Test Poll", ["Option 1", "Option 2"], 3600, ethers.ZeroAddress, 0);
    });

    it("Should allow funding with ETH", async function () {
      const fundAmount = ethers.parseEther("1");

      await expect(
        pollsContract.connect(user1).fundPollWithETH(0, { value: fundAmount })
      ).to.emit(pollsContract, "PollFunded")
        .withArgs(0, user1.address, ethers.ZeroAddress, fundAmount);

      const poll = await pollsContract.getPoll(0);
      expect(poll.totalFunding).to.equal(fundAmount);
    });

    it("Should fail funding with 0 ETH", async function () {
      await expect(
        pollsContract.connect(user1).fundPollWithETH(0, { value: 0 })
      ).to.be.revertedWith("Must send ETH to fund");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to whitelist tokens", async function () {
      const tokenAddress = "0x1234567890123456789012345678901234567890";

      await expect(
        pollsContract.whitelistToken(tokenAddress, true)
      ).to.emit(pollsContract, "TokenWhitelisted")
        .withArgs(tokenAddress, true);

      expect(await pollsContract.whitelistedTokens(tokenAddress)).to.be.true;
    });

    it("Should prevent non-owner from whitelisting tokens", async function () {
      const tokenAddress = "0x1234567890123456789012345678901234567890";

      await expect(
        pollsContract.connect(user1).whitelistToken(tokenAddress, true)
      ).to.be.revertedWithCustomError(pollsContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await pollsContract.createPoll("Test Poll 1", ["Option 1", "Option 2"], 3600, ethers.ZeroAddress, 0);
      await pollsContract.createPoll("Test Poll 2", ["Yes", "No"], 7200, ethers.ZeroAddress, 0);
    });

    it("Should return active polls", async function () {
      const activePolls = await pollsContract.getActivePolls();
      expect(activePolls.length).to.equal(2);
      expect(activePolls[0]).to.equal(0);
      expect(activePolls[1]).to.equal(1);
    });

    it("Should check if user has voted", async function () {
      expect(await pollsContract.hasUserVoted(0, user1.address)).to.be.false;

      await pollsContract.connect(user1).vote(0, 0);

      expect(await pollsContract.hasUserVoted(0, user1.address)).to.be.true;
    });
  });

  describe("Distribution Mode", function () {
    beforeEach(async function () {
      await pollsContract.createPoll("Test Poll", ["Option 1", "Option 2"], 3600, ethers.ZeroAddress, 0);
    });

    it("Should default to MANUAL_PULL mode", async function () {
      const poll = await pollsContract.getPoll(0);
      expect(poll.distributionMode).to.equal(0); // MANUAL_PULL = 0
    });

    it("Should allow creator to set distribution mode", async function () {
      await expect(
        pollsContract.setDistributionMode(0, 1) // MANUAL_PUSH
      ).to.emit(pollsContract, "DistributionModeSet")
        .withArgs(0, 1, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

      const mode = await pollsContract.getDistributionMode(0);
      expect(mode).to.equal(1); // MANUAL_PUSH
    });

    it("Should allow creator to change mode multiple times", async function () {
      // Set to MANUAL_PUSH
      await pollsContract.setDistributionMode(0, 1);
      expect(await pollsContract.getDistributionMode(0)).to.equal(1);

      // Change to AUTOMATED
      await pollsContract.setDistributionMode(0, 2);
      expect(await pollsContract.getDistributionMode(0)).to.equal(2);

      // Change back to MANUAL_PULL
      await pollsContract.setDistributionMode(0, 0);
      expect(await pollsContract.getDistributionMode(0)).to.equal(0);
    });

    it("Should prevent non-creator from setting distribution mode", async function () {
      await expect(
        pollsContract.connect(user1).setDistributionMode(0, 1)
      ).to.be.revertedWith("Only creator or owner can set distribution mode");
    });

    it("Should allow owner to set distribution mode", async function () {
      await expect(
        pollsContract.connect(owner).setDistributionMode(0, 2) // AUTOMATED
      ).to.emit(pollsContract, "DistributionModeSet");

      const mode = await pollsContract.getDistributionMode(0);
      expect(mode).to.equal(2);
    });
  });

  describe("Distribute Rewards", function () {
    beforeEach(async function () {
      // Create poll with 1 hour duration
      await pollsContract.createPoll("Test Poll", ["Option 1", "Option 2"], 3600, ethers.ZeroAddress, 0);

      // Fund the poll
      const fundAmount = ethers.parseEther("10");
      await pollsContract.connect(user1).fundPollWithETH(0, { value: fundAmount });

      // Fast forward time to after poll ends
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should distribute rewards to multiple recipients (MANUAL_PUSH)", async function () {
      // Set to MANUAL_PUSH mode
      await pollsContract.setDistributionMode(0, 1);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("6"), ethers.parseEther("4")];

      const initialBalance1 = await ethers.provider.getBalance(user1.address);
      const initialBalance2 = await ethers.provider.getBalance(user2.address);

      await expect(
        pollsContract.distributeRewards(0, recipients, amounts)
      ).to.emit(pollsContract, "RewardDistributed")
        .withArgs(0, user1.address, amounts[0], ethers.ZeroAddress, (await ethers.provider.getBlock("latest"))!.timestamp + 1);

      const finalBalance1 = await ethers.provider.getBalance(user1.address);
      const finalBalance2 = await ethers.provider.getBalance(user2.address);

      expect(finalBalance1 - initialBalance1).to.equal(amounts[0]);
      expect(finalBalance2 - initialBalance2).to.equal(amounts[1]);
    });

    it("Should distribute rewards in AUTOMATED mode", async function () {
      // Set to AUTOMATED mode
      await pollsContract.setDistributionMode(0, 2);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("7"), ethers.parseEther("3")];

      await expect(
        pollsContract.distributeRewards(0, recipients, amounts)
      ).to.emit(pollsContract, "RewardDistributed");
    });

    it("Should fail distribution with MANUAL_PULL mode", async function () {
      // Keep default MANUAL_PULL mode (0)
      const recipients = [user1.address];
      const amounts = [ethers.parseEther("5")];

      await expect(
        pollsContract.distributeRewards(0, recipients, amounts)
      ).to.be.revertedWith("Distribution mode must be MANUAL_PUSH or AUTOMATED");
    });

    it("Should fail if poll has not ended", async function () {
      // Create new poll
      await pollsContract.createPoll("New Poll", ["A", "B"], 3600, ethers.ZeroAddress, 0);
      await pollsContract.connect(user1).fundPollWithETH(1, { value: ethers.parseEther("5") });

      // Set to MANUAL_PUSH
      await pollsContract.setDistributionMode(1, 1);

      const recipients = [user1.address];
      const amounts = [ethers.parseEther("5")];

      await expect(
        pollsContract.distributeRewards(1, recipients, amounts)
      ).to.be.revertedWith("Poll must be ended to distribute rewards");
    });

    it("Should fail with mismatched array lengths", async function () {
      await pollsContract.setDistributionMode(0, 1);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("10")]; // Length mismatch

      await expect(
        pollsContract.distributeRewards(0, recipients, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should fail if total amount exceeds available funds", async function () {
      await pollsContract.setDistributionMode(0, 1);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("8"), ethers.parseEther("5")]; // Total: 13 ETH, available: 10 ETH

      await expect(
        pollsContract.distributeRewards(0, recipients, amounts)
      ).to.be.revertedWith("Insufficient funds");
    });

    it("Should prevent non-creator from distributing rewards", async function () {
      await pollsContract.setDistributionMode(0, 1);

      const recipients = [user1.address];
      const amounts = [ethers.parseEther("5")];

      await expect(
        pollsContract.connect(user2).distributeRewards(0, recipients, amounts)
      ).to.be.revertedWith("Only creator or owner can distribute rewards");
    });

    it("Should skip recipients with 0 amount", async function () {
      await pollsContract.setDistributionMode(0, 1);

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("0"), ethers.parseEther("5")];

      const initialBalance2 = await ethers.provider.getBalance(user2.address);

      await pollsContract.distributeRewards(0, recipients, amounts);

      const finalBalance2 = await ethers.provider.getBalance(user2.address);
      expect(finalBalance2 - initialBalance2).to.equal(amounts[1]);
    });

    it("Should handle partial distributions correctly", async function () {
      await pollsContract.setDistributionMode(0, 1);

      // First distribution
      const recipients1 = [user1.address];
      const amounts1 = [ethers.parseEther("3")];

      await pollsContract.distributeRewards(0, recipients1, amounts1);

      // Second distribution with remaining funds
      const recipients2 = [user2.address];
      const amounts2 = [ethers.parseEther("7")];

      const initialBalance2 = await ethers.provider.getBalance(user2.address);
      await pollsContract.distributeRewards(0, recipients2, amounts2);
      const finalBalance2 = await ethers.provider.getBalance(user2.address);

      expect(finalBalance2 - initialBalance2).to.equal(amounts2[0]);
    });
  });

  describe("Backward Compatibility", function () {
    it("Should still support withdrawFunds for MANUAL_PULL mode", async function () {
      // Create and fund poll
      await pollsContract.createPoll("Test Poll", ["Option 1", "Option 2"], 3600, ethers.ZeroAddress, 0);
      const fundAmount = ethers.parseEther("5");
      await pollsContract.connect(user1).fundPollWithETH(0, { value: fundAmount });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      // Withdraw funds (MANUAL_PULL - default mode)
      const initialBalance = await ethers.provider.getBalance(user2.address);

      await expect(
        pollsContract.withdrawFunds(0, user2.address)
      ).to.emit(pollsContract, "FundsWithdrawn")
        .withArgs(0, user2.address, ethers.ZeroAddress, fundAmount);

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(fundAmount);
    });

    it("Should preserve existing poll data structure", async function () {
      await pollsContract.createPoll("Test Poll", ["Red", "Blue"], 3600, ethers.ZeroAddress, 0);
      await pollsContract.connect(user1).vote(0, 0);
      await pollsContract.connect(user1).fundPollWithETH(0, { value: ethers.parseEther("2") });

      const poll = await pollsContract.getPoll(0);
      expect(poll.question).to.equal("Test Poll");
      expect(poll.options).to.deep.equal(["Red", "Blue"]);
      expect(poll.votes[0]).to.equal(1);
      expect(poll.totalFunding).to.equal(ethers.parseEther("2"));
      expect(poll.creator).to.equal(owner.address);
      expect(poll.isActive).to.be.true;
    });
  });
});