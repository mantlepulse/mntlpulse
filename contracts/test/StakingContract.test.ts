import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { StakingContract, PulsePollToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("StakingContract", function () {
  let stakingContract: StakingContract;
  let pulseToken: PulsePollToken;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;

  // Test constants
  const MINIMUM_STAKE_FOR_PREMIUM = ethers.parseEther("10000"); // 10,000 PULSE
  const REWARD_RATE_PER_SECOND = ethers.parseEther("0.0001"); // 0.0001 PULSE per token per second
  const INITIAL_USER_BALANCE = ethers.parseEther("100000"); // 100,000 PULSE

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
      [await pulseToken.getAddress(), MINIMUM_STAKE_FOR_PREMIUM, REWARD_RATE_PER_SECOND],
      { initializer: "initialize" }
    ) as any;
    await stakingContract.waitForDeployment();

    // Transfer PULSE to test users
    await pulseToken.transfer(user1.address, INITIAL_USER_BALANCE);
    await pulseToken.transfer(user2.address, INITIAL_USER_BALANCE);

    // Fund reward pool
    const rewardPoolAmount = ethers.parseEther("1000000");
    await pulseToken.approve(await stakingContract.getAddress(), rewardPoolAmount);
    await stakingContract.fundRewardPool(rewardPoolAmount);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await stakingContract.owner()).to.equal(owner.address);
    });

    it("Should set the correct PULSE token address", async function () {
      expect(await stakingContract.pulseToken()).to.equal(await pulseToken.getAddress());
    });

    it("Should set the correct minimum stake for premium", async function () {
      expect(await stakingContract.minimumStakeForPremium()).to.equal(MINIMUM_STAKE_FOR_PREMIUM);
    });

    it("Should set the correct reward rate", async function () {
      expect(await stakingContract.rewardRatePerSecond()).to.equal(REWARD_RATE_PER_SECOND);
    });

    it("Should start with 0 total staked", async function () {
      expect(await stakingContract.totalStaked()).to.equal(0);
    });
  });

  describe("Staking", function () {
    const stakeAmount = ethers.parseEther("5000");

    beforeEach(async function () {
      // Approve staking contract to spend user's tokens
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), stakeAmount);
    });

    it("Should allow staking PULSE tokens", async function () {
      await expect(stakingContract.connect(user1).stake(stakeAmount))
        .to.emit(stakingContract, "Staked")
        .withArgs(user1.address, stakeAmount, await getBlockTimestamp());

      expect(await stakingContract.totalStaked()).to.equal(stakeAmount);
    });

    it("Should update user's stake info correctly", async function () {
      await stakingContract.connect(user1).stake(stakeAmount);

      const stakeInfo = await stakingContract.getStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.stakingStartTime).to.be.gt(0);
    });

    it("Should transfer tokens from user to contract", async function () {
      const balanceBefore = await pulseToken.balanceOf(user1.address);
      await stakingContract.connect(user1).stake(stakeAmount);
      const balanceAfter = await pulseToken.balanceOf(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(stakeAmount);
    });

    it("Should fail when staking 0 tokens", async function () {
      await expect(stakingContract.connect(user1).stake(0))
        .to.be.revertedWithCustomError(stakingContract, "ZeroAmount");
    });

    it("Should allow multiple stakes", async function () {
      await stakingContract.connect(user1).stake(stakeAmount);

      // Approve more tokens
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), stakeAmount);
      await stakingContract.connect(user1).stake(stakeAmount);

      const stakeInfo = await stakingContract.getStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount * BigInt(2));
    });
  });

  describe("Unstaking", function () {
    const stakeAmount = ethers.parseEther("10000");
    const unstakeAmount = ethers.parseEther("3000");

    beforeEach(async function () {
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), stakeAmount);
      await stakingContract.connect(user1).stake(stakeAmount);
    });

    it("Should allow unstaking tokens", async function () {
      await expect(stakingContract.connect(user1).unstake(unstakeAmount))
        .to.emit(stakingContract, "Unstaked")
        .withArgs(user1.address, unstakeAmount, await getBlockTimestamp());

      const stakeInfo = await stakingContract.getStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount - unstakeAmount);
    });

    it("Should transfer tokens back to user", async function () {
      const balanceBefore = await pulseToken.balanceOf(user1.address);
      await stakingContract.connect(user1).unstake(unstakeAmount);
      const balanceAfter = await pulseToken.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(unstakeAmount);
    });

    it("Should update total staked", async function () {
      await stakingContract.connect(user1).unstake(unstakeAmount);
      expect(await stakingContract.totalStaked()).to.equal(stakeAmount - unstakeAmount);
    });

    it("Should fail when unstaking 0 tokens", async function () {
      await expect(stakingContract.connect(user1).unstake(0))
        .to.be.revertedWithCustomError(stakingContract, "ZeroAmount");
    });

    it("Should fail when unstaking more than staked", async function () {
      const tooMuch = stakeAmount + ethers.parseEther("1");
      await expect(stakingContract.connect(user1).unstake(tooMuch))
        .to.be.revertedWithCustomError(stakingContract, "InsufficientStake");
    });

    it("Should allow full unstake", async function () {
      await stakingContract.connect(user1).unstake(stakeAmount);

      const stakeInfo = await stakingContract.getStakeInfo(user1.address);
      expect(stakeInfo.amount).to.equal(0);
    });
  });

  describe("Premium Status", function () {
    it("Should return false for user without stake", async function () {
      expect(await stakingContract.isPremiumByStaking(user1.address)).to.be.false;
    });

    it("Should return false for user with stake below minimum", async function () {
      const belowMinimum = MINIMUM_STAKE_FOR_PREMIUM - ethers.parseEther("1");
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), belowMinimum);
      await stakingContract.connect(user1).stake(belowMinimum);

      expect(await stakingContract.isPremiumByStaking(user1.address)).to.be.false;
    });

    it("Should return true for user with stake at minimum", async function () {
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), MINIMUM_STAKE_FOR_PREMIUM);
      await stakingContract.connect(user1).stake(MINIMUM_STAKE_FOR_PREMIUM);

      expect(await stakingContract.isPremiumByStaking(user1.address)).to.be.true;
    });

    it("Should return true for user with stake above minimum", async function () {
      const aboveMinimum = MINIMUM_STAKE_FOR_PREMIUM + ethers.parseEther("1000");
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), aboveMinimum);
      await stakingContract.connect(user1).stake(aboveMinimum);

      expect(await stakingContract.isPremiumByStaking(user1.address)).to.be.true;
    });

    it("Should revoke premium when unstaking below minimum", async function () {
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), MINIMUM_STAKE_FOR_PREMIUM);
      await stakingContract.connect(user1).stake(MINIMUM_STAKE_FOR_PREMIUM);
      expect(await stakingContract.isPremiumByStaking(user1.address)).to.be.true;

      // Unstake 1 PULSE - below minimum now
      await stakingContract.connect(user1).unstake(ethers.parseEther("1"));
      expect(await stakingContract.isPremiumByStaking(user1.address)).to.be.false;
    });
  });

  describe("Rewards", function () {
    const stakeAmount = ethers.parseEther("10000");

    beforeEach(async function () {
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), stakeAmount);
      await stakingContract.connect(user1).stake(stakeAmount);
    });

    it("Should calculate pending rewards correctly", async function () {
      // Advance time by 100 seconds
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);

      const pendingRewards = await stakingContract.calculatePendingRewards(user1.address);
      // Expected: stakeAmount * 100 seconds * rewardRate / 1e18
      const expectedRewards = (stakeAmount * BigInt(100) * REWARD_RATE_PER_SECOND) / ethers.parseEther("1");

      expect(pendingRewards).to.be.closeTo(expectedRewards, ethers.parseEther("0.01"));
    });

    it("Should allow claiming rewards", async function () {
      // Advance time
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);

      const balanceBefore = await pulseToken.balanceOf(user1.address);

      await expect(stakingContract.connect(user1).claimRewards())
        .to.emit(stakingContract, "RewardsClaimed");

      const balanceAfter = await pulseToken.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should fail claiming with no rewards", async function () {
      // Stake with 0 reward rate
      await stakingContract.setRewardRate(0);

      await expect(stakingContract.connect(user1).claimRewards())
        .to.be.revertedWithCustomError(stakingContract, "NoRewardsToClaim");
    });

    it("Should accumulate rewards when adding more stake", async function () {
      // Advance time
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);

      // Add more stake - this should accumulate pending rewards
      const moreStake = ethers.parseEther("5000");
      await pulseToken.connect(user1).approve(await stakingContract.getAddress(), moreStake);
      await stakingContract.connect(user1).stake(moreStake);

      const stakeInfo = await stakingContract.getStakeInfo(user1.address);
      expect(stakeInfo.accumulatedRewards).to.be.gt(0);
    });

    it("Should get total claimable rewards", async function () {
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("evm_mine", []);

      const totalClaimable = await stakingContract.getTotalClaimableRewards(user1.address);
      expect(totalClaimable).to.be.gt(0);
    });
  });

  describe("Reward Pool", function () {
    it("Should allow funding reward pool", async function () {
      const fundAmount = ethers.parseEther("10000");
      const poolBefore = await stakingContract.rewardPool();

      await pulseToken.approve(await stakingContract.getAddress(), fundAmount);
      await expect(stakingContract.fundRewardPool(fundAmount))
        .to.emit(stakingContract, "RewardPoolFunded")
        .withArgs(owner.address, fundAmount);

      expect(await stakingContract.rewardPool()).to.equal(poolBefore + fundAmount);
    });

    it("Should fail funding with 0 amount", async function () {
      await expect(stakingContract.fundRewardPool(0))
        .to.be.revertedWithCustomError(stakingContract, "ZeroAmount");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update minimum stake", async function () {
      const newMinimum = ethers.parseEther("20000");

      await expect(stakingContract.setMinimumStakeForPremium(newMinimum))
        .to.emit(stakingContract, "MinimumStakeUpdated")
        .withArgs(MINIMUM_STAKE_FOR_PREMIUM, newMinimum);

      expect(await stakingContract.minimumStakeForPremium()).to.equal(newMinimum);
    });

    it("Should allow owner to update reward rate", async function () {
      const newRate = ethers.parseEther("0.0002");

      await expect(stakingContract.setRewardRate(newRate))
        .to.emit(stakingContract, "RewardRateUpdated")
        .withArgs(REWARD_RATE_PER_SECOND, newRate);

      expect(await stakingContract.rewardRatePerSecond()).to.equal(newRate);
    });

    it("Should prevent non-owner from updating minimum stake", async function () {
      await expect(stakingContract.connect(user1).setMinimumStakeForPremium(ethers.parseEther("5000")))
        .to.be.revertedWithCustomError(stakingContract, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from updating reward rate", async function () {
      await expect(stakingContract.connect(user1).setRewardRate(ethers.parseEther("0.0002")))
        .to.be.revertedWithCustomError(stakingContract, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to set premium contract", async function () {
      const premiumAddress = "0x1234567890123456789012345678901234567890";

      await expect(stakingContract.setPremiumContract(premiumAddress))
        .to.emit(stakingContract, "PremiumContractUpdated")
        .withArgs(ethers.ZeroAddress, premiumAddress);

      expect(await stakingContract.premiumContract()).to.equal(premiumAddress);
    });
  });

  // Helper function to get current block timestamp
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp + 1;
  }
});
