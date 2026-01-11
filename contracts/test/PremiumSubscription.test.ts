import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PremiumSubscription, StakingContract, PulsePollToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PremiumSubscription", function () {
  let premiumContract: PremiumSubscription;
  let stakingContract: StakingContract;
  let pulseToken: PulsePollToken;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  // Test constants
  const MONTHLY_PRICE = ethers.parseEther("1000"); // 1,000 PULSE
  const ANNUAL_PRICE = ethers.parseEther("10000"); // 10,000 PULSE
  const LIFETIME_PRICE = ethers.parseEther("50000"); // 50,000 PULSE
  const MINIMUM_STAKE_FOR_PREMIUM = ethers.parseEther("10000");
  const INITIAL_USER_BALANCE = ethers.parseEther("100000");

  // Duration constants (from contract)
  const MONTHLY_DURATION = 30 * 24 * 60 * 60; // 30 days
  const ANNUAL_DURATION = 365 * 24 * 60 * 60; // 365 days

  // Subscription tiers (enum values)
  const SubscriptionTier = {
    NONE: 0,
    MONTHLY: 1,
    ANNUAL: 2,
    LIFETIME: 3
  };

  beforeEach(async function () {
    [owner, user1, user2, treasury] = await ethers.getSigners();

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

    // Transfer PULSE to test users
    await pulseToken.transfer(user1.address, INITIAL_USER_BALANCE);
    await pulseToken.transfer(user2.address, INITIAL_USER_BALANCE);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await premiumContract.owner()).to.equal(owner.address);
    });

    it("Should set the correct PULSE token address", async function () {
      expect(await premiumContract.pulseToken()).to.equal(await pulseToken.getAddress());
    });

    it("Should set the correct staking contract", async function () {
      expect(await premiumContract.stakingContract()).to.equal(await stakingContract.getAddress());
    });

    it("Should set the correct treasury", async function () {
      expect(await premiumContract.treasury()).to.equal(treasury.address);
    });

    it("Should set correct tier prices", async function () {
      expect(await premiumContract.getTierPrice(SubscriptionTier.MONTHLY)).to.equal(MONTHLY_PRICE);
      expect(await premiumContract.getTierPrice(SubscriptionTier.ANNUAL)).to.equal(ANNUAL_PRICE);
      expect(await premiumContract.getTierPrice(SubscriptionTier.LIFETIME)).to.equal(LIFETIME_PRICE);
    });

    it("Should set correct tier durations", async function () {
      expect(await premiumContract.getTierDuration(SubscriptionTier.MONTHLY)).to.equal(MONTHLY_DURATION);
      expect(await premiumContract.getTierDuration(SubscriptionTier.ANNUAL)).to.equal(ANNUAL_DURATION);
      expect(await premiumContract.getTierDuration(SubscriptionTier.LIFETIME)).to.equal(0); // Lifetime = 0 (never expires)
    });

    it("Should start with 0 total revenue", async function () {
      expect(await premiumContract.totalRevenue()).to.equal(0);
    });

    it("Should start with 0 total subscribers", async function () {
      expect(await premiumContract.totalSubscribers()).to.equal(0);
    });
  });

  describe("Monthly Subscription", function () {
    beforeEach(async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
    });

    it("Should allow subscribing to monthly tier", async function () {
      await expect(premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY))
        .to.emit(premiumContract, "SubscriptionPurchased");

      expect(await premiumContract.isPremium(user1.address)).to.be.true;
    });

    it("Should set correct expiration time", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      const subscription = await premiumContract.getSubscription(user1.address);
      const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;

      expect(subscription.tier).to.equal(SubscriptionTier.MONTHLY);
      expect(subscription.expirationTime).to.be.closeTo(BigInt(currentTime) + BigInt(MONTHLY_DURATION), 2);
      expect(subscription.isActive).to.be.true;
    });

    it("Should transfer PULSE to treasury", async function () {
      const treasuryBefore = await pulseToken.balanceOf(treasury.address);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);
      const treasuryAfter = await pulseToken.balanceOf(treasury.address);

      expect(treasuryAfter - treasuryBefore).to.equal(MONTHLY_PRICE);
    });

    it("Should update total revenue", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);
      expect(await premiumContract.totalRevenue()).to.equal(MONTHLY_PRICE);
    });

    it("Should increment total subscribers", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);
      expect(await premiumContract.totalSubscribers()).to.equal(1);
    });

    it("Should expire after duration", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);
      expect(await premiumContract.isPremium(user1.address)).to.be.true;

      // Fast forward past expiration
      await ethers.provider.send("evm_increaseTime", [MONTHLY_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await premiumContract.isPremium(user1.address)).to.be.false;
    });
  });

  describe("Annual Subscription", function () {
    beforeEach(async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), ANNUAL_PRICE);
    });

    it("Should allow subscribing to annual tier", async function () {
      await expect(premiumContract.connect(user1).subscribe(SubscriptionTier.ANNUAL))
        .to.emit(premiumContract, "SubscriptionPurchased");

      expect(await premiumContract.isPremium(user1.address)).to.be.true;
    });

    it("Should set correct expiration time", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.ANNUAL);

      const subscription = await premiumContract.getSubscription(user1.address);
      const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;

      expect(subscription.tier).to.equal(SubscriptionTier.ANNUAL);
      expect(subscription.expirationTime).to.be.closeTo(BigInt(currentTime) + BigInt(ANNUAL_DURATION), 2);
    });
  });

  describe("Lifetime Subscription", function () {
    beforeEach(async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), LIFETIME_PRICE);
    });

    it("Should allow subscribing to lifetime tier", async function () {
      await expect(premiumContract.connect(user1).subscribe(SubscriptionTier.LIFETIME))
        .to.emit(premiumContract, "SubscriptionPurchased");

      expect(await premiumContract.isPremium(user1.address)).to.be.true;
    });

    it("Should set expiration time to 0 for lifetime", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.LIFETIME);

      const subscription = await premiumContract.getSubscription(user1.address);
      expect(subscription.tier).to.equal(SubscriptionTier.LIFETIME);
      expect(subscription.expirationTime).to.equal(0);
    });

    it("Should never expire", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.LIFETIME);

      // Fast forward 10 years
      await ethers.provider.send("evm_increaseTime", [10 * 365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      expect(await premiumContract.isPremium(user1.address)).to.be.true;
    });

    it("Should return max uint256 for time remaining", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.LIFETIME);

      const timeRemaining = await premiumContract.getTimeRemaining(user1.address);
      expect(timeRemaining).to.equal(ethers.MaxUint256);
    });

    it("Should prevent subscribing again after lifetime", async function () {
      await premiumContract.connect(user1).subscribe(SubscriptionTier.LIFETIME);

      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);

      await expect(premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY))
        .to.be.revertedWithCustomError(premiumContract, "AlreadyLifetime");
    });
  });

  describe("Subscription Extension", function () {
    beforeEach(async function () {
      // Subscribe to monthly first
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);
    });

    it("Should allow extending subscription", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);

      await expect(premiumContract.connect(user1).extendSubscription(SubscriptionTier.MONTHLY))
        .to.emit(premiumContract, "SubscriptionExtended");
    });

    it("Should extend from current expiration if still active", async function () {
      const subscriptionBefore = await premiumContract.getSubscription(user1.address);
      const originalExpiration = subscriptionBefore.expirationTime;

      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).extendSubscription(SubscriptionTier.MONTHLY);

      const subscriptionAfter = await premiumContract.getSubscription(user1.address);
      expect(subscriptionAfter.expirationTime).to.be.closeTo(
        originalExpiration + BigInt(MONTHLY_DURATION),
        2
      );
    });

    it("Should extend from now if subscription expired", async function () {
      // Fast forward past expiration
      await ethers.provider.send("evm_increaseTime", [MONTHLY_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await premiumContract.isPremium(user1.address)).to.be.false;

      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).extendSubscription(SubscriptionTier.MONTHLY);

      const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
      const subscription = await premiumContract.getSubscription(user1.address);

      expect(subscription.expirationTime).to.be.closeTo(BigInt(currentTime) + BigInt(MONTHLY_DURATION), 2);
      expect(await premiumContract.isPremium(user1.address)).to.be.true;
    });

    it("Should upgrade tier if extending with higher tier", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), ANNUAL_PRICE);
      await premiumContract.connect(user1).extendSubscription(SubscriptionTier.ANNUAL);

      const subscription = await premiumContract.getSubscription(user1.address);
      expect(subscription.tier).to.equal(SubscriptionTier.ANNUAL);
    });
  });

  describe("Premium Status via Staking", function () {
    it("Should return true for isPremiumOrStaked when user has valid subscription", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      expect(await premiumContract.isPremiumOrStaked(user1.address)).to.be.true;
    });

    it("Should return true for isPremiumOrStaked when user has staked enough", async function () {
      // Stake enough PULSE for premium
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), MINIMUM_STAKE_FOR_PREMIUM);
      await stakingContract.connect(user1).stake(MINIMUM_STAKE_FOR_PREMIUM);

      expect(await premiumContract.isPremiumOrStaked(user1.address)).to.be.true;
    });

    it("Should return false for isPremiumOrStaked when user has neither", async function () {
      expect(await premiumContract.isPremiumOrStaked(user1.address)).to.be.false;
    });

    it("Should prioritize subscription over staking check", async function () {
      // Subscribe
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      // Even with no staking, should be premium via subscription
      expect(await premiumContract.isPremiumOrStaked(user1.address)).to.be.true;
    });
  });

  describe("Time Remaining", function () {
    it("Should return correct time remaining for active subscription", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      // Advance 10 days
      await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const timeRemaining = await premiumContract.getTimeRemaining(user1.address);
      const expectedRemaining = MONTHLY_DURATION - 10 * 24 * 60 * 60;

      expect(timeRemaining).to.be.closeTo(BigInt(expectedRemaining), 5);
    });

    it("Should return 0 for expired subscription", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      // Fast forward past expiration
      await ethers.provider.send("evm_increaseTime", [MONTHLY_DURATION + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await premiumContract.getTimeRemaining(user1.address)).to.equal(0);
    });

    it("Should return 0 for user with no subscription", async function () {
      expect(await premiumContract.getTimeRemaining(user1.address)).to.equal(0);
    });
  });

  describe("Invalid Operations", function () {
    it("Should fail subscribing to NONE tier", async function () {
      await expect(premiumContract.connect(user1).subscribe(SubscriptionTier.NONE))
        .to.be.revertedWithCustomError(premiumContract, "InvalidTier");
    });

    it("Should fail extending with NONE tier", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      await expect(premiumContract.connect(user1).extendSubscription(SubscriptionTier.NONE))
        .to.be.revertedWithCustomError(premiumContract, "InvalidTier");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update tier price", async function () {
      const newPrice = ethers.parseEther("2000");

      await expect(premiumContract.setTierPrice(SubscriptionTier.MONTHLY, newPrice))
        .to.emit(premiumContract, "TierPriceUpdated")
        .withArgs(SubscriptionTier.MONTHLY, MONTHLY_PRICE, newPrice);

      expect(await premiumContract.getTierPrice(SubscriptionTier.MONTHLY)).to.equal(newPrice);
    });

    it("Should allow owner to update treasury", async function () {
      await expect(premiumContract.setTreasury(user2.address))
        .to.emit(premiumContract, "TreasuryUpdated")
        .withArgs(treasury.address, user2.address);

      expect(await premiumContract.treasury()).to.equal(user2.address);
    });

    it("Should allow owner to update staking contract", async function () {
      const newStaking = "0x1234567890123456789012345678901234567890";

      await expect(premiumContract.setStakingContract(newStaking))
        .to.emit(premiumContract, "StakingContractUpdated");

      expect(await premiumContract.stakingContract()).to.equal(newStaking);
    });

    it("Should allow owner to grant subscription", async function () {
      await expect(premiumContract.grantSubscription(user1.address, SubscriptionTier.ANNUAL, 0))
        .to.emit(premiumContract, "SubscriptionPurchased");

      expect(await premiumContract.isPremium(user1.address)).to.be.true;
    });

    it("Should allow owner to grant lifetime subscription", async function () {
      await premiumContract.grantSubscription(user1.address, SubscriptionTier.LIFETIME, 0);

      const subscription = await premiumContract.getSubscription(user1.address);
      expect(subscription.tier).to.equal(SubscriptionTier.LIFETIME);
      expect(subscription.expirationTime).to.equal(0);
    });

    it("Should prevent non-owner from updating tier price", async function () {
      await expect(premiumContract.connect(user1).setTierPrice(SubscriptionTier.MONTHLY, ethers.parseEther("2000")))
        .to.be.revertedWithCustomError(premiumContract, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from granting subscription", async function () {
      await expect(premiumContract.connect(user1).grantSubscription(user2.address, SubscriptionTier.MONTHLY, 0))
        .to.be.revertedWithCustomError(premiumContract, "OwnableUnauthorizedAccount");
    });

    it("Should fail setting treasury to zero address", async function () {
      await expect(premiumContract.setTreasury(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(premiumContract, "ZeroAddress");
    });
  });

  describe("Total Paid Tracking", function () {
    it("Should track total paid correctly for single subscription", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE);
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);

      const subscription = await premiumContract.getSubscription(user1.address);
      expect(subscription.totalPaid).to.equal(MONTHLY_PRICE);
    });

    it("Should accumulate total paid across extensions", async function () {
      await pulseToken.connect(user1).approve(await premiumContract.getAddress(), MONTHLY_PRICE * BigInt(2));
      await premiumContract.connect(user1).subscribe(SubscriptionTier.MONTHLY);
      await premiumContract.connect(user1).extendSubscription(SubscriptionTier.MONTHLY);

      const subscription = await premiumContract.getSubscription(user1.address);
      expect(subscription.totalPaid).to.equal(MONTHLY_PRICE * BigInt(2));
    });

    it("Should not update total paid for admin grants", async function () {
      await premiumContract.grantSubscription(user1.address, SubscriptionTier.MONTHLY, 0);

      const subscription = await premiumContract.getSubscription(user1.address);
      expect(subscription.totalPaid).to.equal(0);
    });
  });
});
