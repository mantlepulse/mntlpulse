import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PollsContract, PremiumSubscription, StakingContract, PulsePollToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Quadratic Voting", function () {
  let pollsContract: PollsContract;
  let premiumContract: PremiumSubscription;
  let stakingContract: StakingContract;
  let pulseToken: PulsePollToken;
  let owner: HardhatEthersSigner;
  let premiumUser: HardhatEthersSigner;
  let regularUser: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  // Constants
  const MONTHLY_PRICE = ethers.parseEther("1000");
  const ANNUAL_PRICE = ethers.parseEther("10000");
  const LIFETIME_PRICE = ethers.parseEther("50000");
  const MINIMUM_STAKE_FOR_PREMIUM = ethers.parseEther("10000");
  const INITIAL_USER_BALANCE = ethers.parseEther("1000000");
  const POLL_DURATION = 24 * 60 * 60; // 24 hours

  // Voting types (enum values)
  const VotingType = {
    LINEAR: 0,
    QUADRATIC: 1
  };

  // Funding types
  const FundingType = {
    NONE: 0,
    CREATOR_FUNDED: 1,
    USER_FUNDED: 2
  };

  beforeEach(async function () {
    [owner, premiumUser, regularUser, voter1, voter2, treasury] = await ethers.getSigners();

    // Deploy PULSE token
    const PulsePollToken = await ethers.getContractFactory("PulsePollToken");
    pulseToken = await PulsePollToken.deploy() as PulsePollToken;
    await pulseToken.waitForDeployment();

    // Deploy StakingContract
    const StakingContract = await ethers.getContractFactory("StakingContract");
    stakingContract = await upgrades.deployProxy(
      StakingContract,
      [await pulseToken.getAddress(), MINIMUM_STAKE_FOR_PREMIUM, 0],
      { initializer: "initialize" }
    ) as any;
    await stakingContract.waitForDeployment();

    // Deploy PremiumSubscription
    const PremiumSubscription = await ethers.getContractFactory("PremiumSubscription");
    premiumContract = await upgrades.deployProxy(
      PremiumSubscription,
      [
        await pulseToken.getAddress(),
        await stakingContract.getAddress(),
        treasury.address,
        MONTHLY_PRICE,
        ANNUAL_PRICE,
        LIFETIME_PRICE
      ],
      { initializer: "initialize" }
    ) as any;
    await premiumContract.waitForDeployment();

    // Deploy PollsContract
    const PollsContract = await ethers.getContractFactory("PollsContract");
    pollsContract = await upgrades.deployProxy(PollsContract, [], {
      initializer: "initialize",
    }) as any;
    await pollsContract.waitForDeployment();

    // Configure contracts
    await pollsContract.setPremiumContract(await premiumContract.getAddress());
    await pollsContract.setPulseToken(await pulseToken.getAddress());
    await pollsContract.setQuadraticVotingTreasury(treasury.address);

    // Transfer PULSE to test users
    await pulseToken.transfer(premiumUser.address, INITIAL_USER_BALANCE);
    await pulseToken.transfer(regularUser.address, INITIAL_USER_BALANCE);
    await pulseToken.transfer(voter1.address, INITIAL_USER_BALANCE);
    await pulseToken.transfer(voter2.address, INITIAL_USER_BALANCE);

    // Give premiumUser a premium subscription
    await pulseToken.connect(premiumUser).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
    await premiumContract.connect(premiumUser).subscribe(1); // MONTHLY
  });

  describe("Quadratic Poll Creation", function () {
    it("Should allow premium user to create quadratic poll", async function () {
      await expect(
        pollsContract.connect(premiumUser).createPollWithVotingType(
          "Quadratic Poll?",
          ["Option A", "Option B"],
          POLL_DURATION,
          ethers.ZeroAddress,
          FundingType.NONE,
          VotingType.QUADRATIC
        )
      ).to.emit(pollsContract, "PollCreated");

      const poll = await pollsContract.getPoll(0);
      expect(poll.votingType).to.equal(VotingType.QUADRATIC);
    });

    it("Should prevent non-premium user from creating quadratic poll", async function () {
      await expect(
        pollsContract.connect(regularUser).createPollWithVotingType(
          "Quadratic Poll?",
          ["Option A", "Option B"],
          POLL_DURATION,
          ethers.ZeroAddress,
          FundingType.NONE,
          VotingType.QUADRATIC
        )
      ).to.be.revertedWith("Quadratic voting requires premium");
    });

    it("Should allow user with staked PULSE to create quadratic poll", async function () {
      // Stake enough for premium
      await pulseToken.connect(regularUser).approve(await stakingContract.getAddress(), MINIMUM_STAKE_FOR_PREMIUM);
      await stakingContract.connect(regularUser).stake(MINIMUM_STAKE_FOR_PREMIUM);

      await expect(
        pollsContract.connect(regularUser).createPollWithVotingType(
          "Quadratic Poll?",
          ["Option A", "Option B"],
          POLL_DURATION,
          ethers.ZeroAddress,
          FundingType.NONE,
          VotingType.QUADRATIC
        )
      ).to.emit(pollsContract, "PollCreated");
    });

    it("Should allow non-premium user to create linear poll", async function () {
      await expect(
        pollsContract.connect(regularUser).createPollWithVotingType(
          "Linear Poll?",
          ["Option A", "Option B"],
          POLL_DURATION,
          ethers.ZeroAddress,
          FundingType.NONE,
          VotingType.LINEAR
        )
      ).to.emit(pollsContract, "PollCreated");
    });

    it("Should default to LINEAR when using createPoll", async function () {
      await pollsContract.connect(regularUser).createPoll(
        "Default Poll?",
        ["Option A", "Option B"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE
      );

      const poll = await pollsContract.getPoll(0);
      expect(poll.votingType).to.equal(VotingType.LINEAR);
    });
  });

  describe("Quadratic Cost Calculation", function () {
    it("Should calculate correct cost for first vote (1^2 = 1)", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 1);
      expect(cost).to.equal(ethers.parseEther("1"));
    });

    it("Should calculate correct cost for second vote (2^2 = 4)", async function () {
      const cost = await pollsContract.calculateQuadraticCost(1, 1);
      expect(cost).to.equal(ethers.parseEther("4"));
    });

    it("Should calculate correct cost for multiple votes from 0 (1+4+9 = 14)", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 3);
      // 1^2 + 2^2 + 3^2 = 1 + 4 + 9 = 14
      expect(cost).to.equal(ethers.parseEther("14"));
    });

    it("Should calculate correct cost for multiple votes from non-zero (10^2+11^2+12^2)", async function () {
      const cost = await pollsContract.calculateQuadraticCost(9, 3);
      // 10^2 + 11^2 + 12^2 = 100 + 121 + 144 = 365
      expect(cost).to.equal(ethers.parseEther("365"));
    });

    it("Should calculate correct cost for 10 votes from 0", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 10);
      // Sum of squares 1..10 = 385
      expect(cost).to.equal(ethers.parseEther("385"));
    });
  });

  describe("Buying Votes", function () {
    let pollId: bigint;

    beforeEach(async function () {
      // Create a quadratic poll
      await pollsContract.connect(premiumUser).createPollWithVotingType(
        "Quadratic Poll?",
        ["Option A", "Option B", "Option C"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE,
        VotingType.QUADRATIC
      );
      pollId = BigInt(0);
    });

    it("Should allow buying votes with PULSE", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 3);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost);

      await expect(pollsContract.connect(voter1).buyVotes(pollId, 0, 3))
        .to.emit(pollsContract, "VotesBought")
        .withArgs(pollId, voter1.address, 0, 3, cost, await getBlockTimestamp());

      // Check votes were recorded
      const poll = await pollsContract.getPoll(pollId);
      expect(poll.votes[0]).to.equal(3);
      expect(poll.totalVotesBought).to.equal(3);

      // Check user's votes
      const userVotes = await pollsContract.getUserVotesInPoll(pollId, voter1.address);
      expect(userVotes).to.equal(3);
    });

    it("Should transfer PULSE to treasury", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 5);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost);

      const treasuryBefore = await pulseToken.balanceOf(treasury.address);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 5);
      const treasuryAfter = await pulseToken.balanceOf(treasury.address);

      expect(treasuryAfter - treasuryBefore).to.equal(cost);
    });

    it("Should allow buying more votes (costs increase)", async function () {
      // First purchase: 3 votes (cost: 1+4+9 = 14)
      const cost1 = await pollsContract.calculateQuadraticCost(0, 3);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost1);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 3);

      // Second purchase: 2 more votes (cost: 16+25 = 41)
      const cost2 = await pollsContract.calculateQuadraticCost(3, 2);
      expect(cost2).to.equal(ethers.parseEther("41")); // 4^2 + 5^2 = 16 + 25

      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost2);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 2);

      const userVotes = await pollsContract.getUserVotesInPoll(pollId, voter1.address);
      expect(userVotes).to.equal(5);
    });

    it("Should allow buying votes for different options", async function () {
      // First purchase: 2 votes for option 0 (cost: 1+4 = 5)
      const cost1 = await pollsContract.calculateQuadraticCost(0, 2);
      // Second purchase: 2 more votes for option 1 (cost: 3^2+4^2 = 9+16 = 25 since user already has 2)
      const cost2 = await pollsContract.calculateQuadraticCost(2, 2);
      const totalCost = cost1 + cost2;

      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), totalCost);

      // Buy votes for option 0
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 2);
      // Buy votes for option 1
      await pollsContract.connect(voter1).buyVotes(pollId, 1, 2);

      const poll = await pollsContract.getPoll(pollId);
      expect(poll.votes[0]).to.equal(2);
      expect(poll.votes[1]).to.equal(2);

      // User's total votes should be 4
      const userVotes = await pollsContract.getUserVotesInPoll(pollId, voter1.address);
      expect(userVotes).to.equal(4);
    });

    it("Should fail buying votes on linear poll", async function () {
      // Create linear poll
      await pollsContract.connect(regularUser).createPoll(
        "Linear Poll?",
        ["Yes", "No"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE
      );

      await expect(pollsContract.connect(voter1).buyVotes(1, 0, 1))
        .to.be.revertedWith("Not a quadratic poll");
    });

    it("Should fail buying 0 votes", async function () {
      await expect(pollsContract.connect(voter1).buyVotes(pollId, 0, 0))
        .to.be.revertedWith("Must buy at least 1 vote");
    });

    it("Should fail with invalid option index", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 1);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost);

      await expect(pollsContract.connect(voter1).buyVotes(pollId, 10, 1))
        .to.be.revertedWith("Invalid option");
    });

    it("Should mark user as having voted", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 1);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 1);

      expect(await pollsContract.hasUserVoted(pollId, voter1.address)).to.be.true;
    });
  });

  describe("Preview Vote Cost", function () {
    let pollId: bigint;

    beforeEach(async function () {
      await pollsContract.connect(premiumUser).createPollWithVotingType(
        "Quadratic Poll?",
        ["Option A", "Option B"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE,
        VotingType.QUADRATIC
      );
      pollId = BigInt(0);
    });

    it("Should preview cost for new voter", async function () {
      const cost = await pollsContract.previewVoteCost(pollId, voter1.address, 3);
      expect(cost).to.equal(ethers.parseEther("14")); // 1+4+9
    });

    it("Should preview cost accounting for existing votes", async function () {
      // First buy some votes
      const initialCost = await pollsContract.calculateQuadraticCost(0, 5);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), initialCost);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 5);

      // Preview cost for additional votes
      const previewCost = await pollsContract.previewVoteCost(pollId, voter1.address, 3);
      // Should be 6^2 + 7^2 + 8^2 = 36 + 49 + 64 = 149
      expect(previewCost).to.equal(ethers.parseEther("149"));
    });

    it("Should fail preview on linear poll", async function () {
      await pollsContract.connect(regularUser).createPoll(
        "Linear Poll?",
        ["Yes", "No"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE
      );

      await expect(pollsContract.previewVoteCost(1, voter1.address, 1))
        .to.be.revertedWith("Not a quadratic poll");
    });
  });

  describe("Linear vs Quadratic Voting Restrictions", function () {
    it("Should prevent using vote() on quadratic poll", async function () {
      await pollsContract.connect(premiumUser).createPollWithVotingType(
        "Quadratic Poll?",
        ["Option A", "Option B"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE,
        VotingType.QUADRATIC
      );

      await expect(pollsContract.connect(voter1).vote(0, 0))
        .to.be.revertedWith("Use buyVotes for quadratic polls");
    });

    it("Should allow vote() on linear poll", async function () {
      await pollsContract.connect(regularUser).createPoll(
        "Linear Poll?",
        ["Yes", "No"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE
      );

      await expect(pollsContract.connect(voter1).vote(0, 0))
        .to.emit(pollsContract, "Voted");
    });
  });

  describe("Ended Poll Restrictions", function () {
    let pollId: bigint;

    beforeEach(async function () {
      await pollsContract.connect(premiumUser).createPollWithVotingType(
        "Quadratic Poll?",
        ["Option A", "Option B"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE,
        VotingType.QUADRATIC
      );
      pollId = BigInt(0);

      // Fast forward past poll end
      await ethers.provider.send("evm_increaseTime", [POLL_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should prevent buying votes on ended poll", async function () {
      const cost = await pollsContract.calculateQuadraticCost(0, 1);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost);

      await expect(pollsContract.connect(voter1).buyVotes(pollId, 0, 1))
        .to.be.revertedWith("Poll has ended");
    });
  });

  describe("Multiple Voters", function () {
    let pollId: bigint;

    beforeEach(async function () {
      await pollsContract.connect(premiumUser).createPollWithVotingType(
        "Quadratic Poll?",
        ["Option A", "Option B"],
        POLL_DURATION,
        ethers.ZeroAddress,
        FundingType.NONE,
        VotingType.QUADRATIC
      );
      pollId = BigInt(0);
    });

    it("Should track votes from multiple voters independently", async function () {
      // Voter 1 buys 3 votes
      const cost1 = await pollsContract.calculateQuadraticCost(0, 3);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost1);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 3);

      // Voter 2 buys 5 votes (their cost starts at 1, not after voter1's votes)
      const cost2 = await pollsContract.calculateQuadraticCost(0, 5);
      await pulseToken.connect(voter2).approve(await pollsContract.getAddress(), cost2);
      await pollsContract.connect(voter2).buyVotes(pollId, 0, 5);

      // Check individual vote counts
      expect(await pollsContract.getUserVotesInPoll(pollId, voter1.address)).to.equal(3);
      expect(await pollsContract.getUserVotesInPoll(pollId, voter2.address)).to.equal(5);

      // Check total votes
      const poll = await pollsContract.getPoll(pollId);
      expect(poll.votes[0]).to.equal(8); // 3 + 5
      expect(poll.totalVotesBought).to.equal(8);
    });

    it("Should calculate costs independently per voter", async function () {
      // Voter 1 buys 10 votes
      const cost1 = await pollsContract.calculateQuadraticCost(0, 10);
      await pulseToken.connect(voter1).approve(await pollsContract.getAddress(), cost1);
      await pollsContract.connect(voter1).buyVotes(pollId, 0, 10);

      // Voter 2's cost for 1 vote should still be 1 (not 11^2 = 121)
      const voter2Cost = await pollsContract.previewVoteCost(pollId, voter2.address, 1);
      expect(voter2Cost).to.equal(ethers.parseEther("1"));
    });
  });

  // Helper function to get current block timestamp
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp + 1;
  }
});
