// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StakingContract
 * @notice Allows users to stake PULSE tokens to unlock premium features and earn rewards
 * @dev Uses UUPS upgradeable pattern for future improvements
 */
contract StakingContract is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct StakeInfo {
        uint256 amount;              // Amount of PULSE staked
        uint256 stakingStartTime;    // When the stake was first created
        uint256 lastRewardClaim;     // Timestamp of last reward claim
        uint256 accumulatedRewards;  // Rewards accumulated but not yet claimed
    }

    // ============ State Variables ============

    IERC20 public pulseToken;

    mapping(address => StakeInfo) public stakes;

    uint256 public totalStaked;
    uint256 public minimumStakeForPremium;  // Minimum stake to unlock premium (default: 10,000 PULSE)
    uint256 public rewardRatePerSecond;     // Reward rate per staked token per second (scaled by 1e18)
    uint256 public rewardPool;              // Available rewards in the contract

    // Premium subscription contract reference (set after deployment)
    address public premiumContract;

    // ============ Events ============

    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event MinimumStakeUpdated(uint256 oldAmount, uint256 newAmount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event PremiumContractUpdated(address indexed oldContract, address indexed newContract);

    // ============ Errors ============

    error ZeroAmount();
    error InsufficientStake();
    error NoRewardsToClaim();
    error InsufficientRewardPool();

    // ============ Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the staking contract
     * @param _pulseToken Address of the PULSE token
     * @param _minimumStakeForPremium Minimum stake amount for premium access (in wei)
     * @param _rewardRatePerSecond Initial reward rate per token per second (scaled by 1e18)
     */
    function initialize(
        address _pulseToken,
        uint256 _minimumStakeForPremium,
        uint256 _rewardRatePerSecond
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        pulseToken = IERC20(_pulseToken);
        minimumStakeForPremium = _minimumStakeForPremium;
        rewardRatePerSecond = _rewardRatePerSecond;
    }

    // ============ External Functions ============

    /**
     * @notice Stake PULSE tokens
     * @param amount Amount of PULSE to stake
     */
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        // Update accumulated rewards before changing stake
        _updateRewards(msg.sender);

        // Transfer tokens from user
        pulseToken.safeTransferFrom(msg.sender, address(this), amount);

        StakeInfo storage stakeInfo = stakes[msg.sender];

        // Initialize staking start time if first stake
        if (stakeInfo.amount == 0) {
            stakeInfo.stakingStartTime = block.timestamp;
            stakeInfo.lastRewardClaim = block.timestamp;
        }

        stakeInfo.amount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Unstake PULSE tokens
     * @param amount Amount of PULSE to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        StakeInfo storage stakeInfo = stakes[msg.sender];
        if (stakeInfo.amount < amount) revert InsufficientStake();

        // Update accumulated rewards before changing stake
        _updateRewards(msg.sender);

        stakeInfo.amount -= amount;
        totalStaked -= amount;

        // Transfer tokens back to user
        pulseToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Claim accumulated staking rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);

        StakeInfo storage stakeInfo = stakes[msg.sender];
        uint256 rewards = stakeInfo.accumulatedRewards;

        if (rewards == 0) revert NoRewardsToClaim();
        if (rewardPool < rewards) revert InsufficientRewardPool();

        stakeInfo.accumulatedRewards = 0;
        stakeInfo.lastRewardClaim = block.timestamp;
        rewardPool -= rewards;

        pulseToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards, block.timestamp);
    }

    /**
     * @notice Fund the reward pool
     * @param amount Amount of PULSE to add to rewards
     */
    function fundRewardPool(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        pulseToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;

        emit RewardPoolFunded(msg.sender, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get stake info for a user
     * @param user Address of the user
     * @return amount Amount staked
     * @return stakingStartTime When staking started
     * @return lastRewardClaim Last reward claim timestamp
     * @return accumulatedRewards Rewards accumulated but not claimed
     * @return pendingRewards Pending rewards since last claim
     */
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 stakingStartTime,
        uint256 lastRewardClaim,
        uint256 accumulatedRewards,
        uint256 pendingRewards
    ) {
        StakeInfo storage stakeInfo = stakes[user];
        return (
            stakeInfo.amount,
            stakeInfo.stakingStartTime,
            stakeInfo.lastRewardClaim,
            stakeInfo.accumulatedRewards,
            calculatePendingRewards(user)
        );
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param user Address of the user
     * @return Pending reward amount
     */
    function calculatePendingRewards(address user) public view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[user];

        if (stakeInfo.amount == 0 || rewardRatePerSecond == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - stakeInfo.lastRewardClaim;
        uint256 pendingRewards = (stakeInfo.amount * timeElapsed * rewardRatePerSecond) / 1e18;

        return pendingRewards;
    }

    /**
     * @notice Check if a user has premium access through staking
     * @param user Address to check
     * @return True if user has staked enough for premium
     */
    function isPremiumByStaking(address user) external view returns (bool) {
        return stakes[user].amount >= minimumStakeForPremium;
    }

    /**
     * @notice Get total claimable rewards (accumulated + pending)
     * @param user Address of the user
     * @return Total claimable rewards
     */
    function getTotalClaimableRewards(address user) external view returns (uint256) {
        return stakes[user].accumulatedRewards + calculatePendingRewards(user);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set minimum stake required for premium access
     * @param _minimumStakeForPremium New minimum stake amount
     */
    function setMinimumStakeForPremium(uint256 _minimumStakeForPremium) external onlyOwner {
        uint256 oldAmount = minimumStakeForPremium;
        minimumStakeForPremium = _minimumStakeForPremium;
        emit MinimumStakeUpdated(oldAmount, _minimumStakeForPremium);
    }

    /**
     * @notice Set the reward rate per second
     * @param _rewardRatePerSecond New reward rate (scaled by 1e18)
     */
    function setRewardRate(uint256 _rewardRatePerSecond) external onlyOwner {
        uint256 oldRate = rewardRatePerSecond;
        rewardRatePerSecond = _rewardRatePerSecond;
        emit RewardRateUpdated(oldRate, _rewardRatePerSecond);
    }

    /**
     * @notice Set the premium subscription contract address
     * @param _premiumContract Address of the PremiumSubscription contract
     */
    function setPremiumContract(address _premiumContract) external onlyOwner {
        address oldContract = premiumContract;
        premiumContract = _premiumContract;
        emit PremiumContractUpdated(oldContract, _premiumContract);
    }

    /**
     * @notice Emergency withdraw function for owner (only excess tokens, not staked)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(pulseToken)) {
            // Can only withdraw excess (reward pool minus what's needed)
            uint256 stakedAndRewards = totalStaked + rewardPool;
            uint256 balance = pulseToken.balanceOf(address(this));
            require(balance - amount >= stakedAndRewards, "Cannot withdraw staked tokens");
        }
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // ============ Internal Functions ============

    /**
     * @notice Update accumulated rewards for a user
     * @param user Address of the user
     */
    function _updateRewards(address user) internal {
        StakeInfo storage stakeInfo = stakes[user];

        if (stakeInfo.amount > 0 && rewardRatePerSecond > 0) {
            uint256 pending = calculatePendingRewards(user);
            stakeInfo.accumulatedRewards += pending;
        }

        stakeInfo.lastRewardClaim = block.timestamp;
    }

    /**
     * @notice Required for UUPS proxy upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
