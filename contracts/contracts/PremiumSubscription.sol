// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IStakingContract {
    function isPremiumByStaking(address user) external view returns (bool);
}

/**
 * @title PremiumSubscription
 * @notice Manages premium subscriptions for Mantle Pulse creators
 * @dev Users can subscribe with PULSE tokens to unlock premium features like Quadratic Voting
 */
contract PremiumSubscription is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum SubscriptionTier { NONE, MONTHLY, ANNUAL, LIFETIME }

    // ============ Structs ============

    struct Subscription {
        SubscriptionTier tier;
        uint256 expirationTime;  // 0 for lifetime, timestamp for others
        uint256 purchaseTime;    // When the subscription was purchased
        uint256 totalPaid;       // Total PULSE paid for subscriptions
    }

    // ============ State Variables ============

    IERC20 public pulseToken;
    IStakingContract public stakingContract;

    mapping(address => Subscription) public subscriptions;
    mapping(SubscriptionTier => uint256) public tierPrices;
    mapping(SubscriptionTier => uint256) public tierDurations; // Duration in seconds

    // Treasury to collect subscription payments
    address public treasury;

    // Total revenue collected
    uint256 public totalRevenue;
    uint256 public totalSubscribers;

    // ============ Constants ============

    uint256 public constant MONTHLY_DURATION = 30 days;
    uint256 public constant ANNUAL_DURATION = 365 days;

    // ============ Events ============

    event SubscriptionPurchased(
        address indexed user,
        SubscriptionTier tier,
        uint256 expirationTime,
        uint256 price,
        uint256 timestamp
    );

    event SubscriptionExtended(
        address indexed user,
        SubscriptionTier tier,
        uint256 newExpirationTime,
        uint256 price,
        uint256 timestamp
    );

    event TierPriceUpdated(SubscriptionTier tier, uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event StakingContractUpdated(address indexed oldContract, address indexed newContract);

    // ============ Errors ============

    error InvalidTier();
    error AlreadyLifetime();
    error InsufficientPayment();
    error ZeroAddress();

    // ============ Initializer ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the subscription contract
     * @param _pulseToken Address of the PULSE token
     * @param _stakingContract Address of the staking contract
     * @param _treasury Address to receive subscription payments
     * @param _monthlyPrice Price for monthly subscription (in wei)
     * @param _annualPrice Price for annual subscription (in wei)
     * @param _lifetimePrice Price for lifetime subscription (in wei)
     */
    function initialize(
        address _pulseToken,
        address _stakingContract,
        address _treasury,
        uint256 _monthlyPrice,
        uint256 _annualPrice,
        uint256 _lifetimePrice
    ) public initializer {
        if (_pulseToken == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();

        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        pulseToken = IERC20(_pulseToken);
        stakingContract = IStakingContract(_stakingContract);
        treasury = _treasury;

        // Set tier prices (defaults: Monthly=1000, Annual=10000, Lifetime=50000 PULSE)
        tierPrices[SubscriptionTier.MONTHLY] = _monthlyPrice;
        tierPrices[SubscriptionTier.ANNUAL] = _annualPrice;
        tierPrices[SubscriptionTier.LIFETIME] = _lifetimePrice;

        // Set tier durations
        tierDurations[SubscriptionTier.MONTHLY] = MONTHLY_DURATION;
        tierDurations[SubscriptionTier.ANNUAL] = ANNUAL_DURATION;
        tierDurations[SubscriptionTier.LIFETIME] = 0; // 0 means forever
    }

    // ============ External Functions ============

    /**
     * @notice Subscribe to a tier
     * @param tier The subscription tier to purchase
     */
    function subscribe(SubscriptionTier tier) external nonReentrant {
        if (tier == SubscriptionTier.NONE) revert InvalidTier();

        Subscription storage sub = subscriptions[msg.sender];

        // Check if already has lifetime
        if (sub.tier == SubscriptionTier.LIFETIME && sub.expirationTime == 0) {
            revert AlreadyLifetime();
        }

        uint256 price = tierPrices[tier];
        if (price == 0) revert InvalidTier();

        // Transfer PULSE from user to treasury
        pulseToken.safeTransferFrom(msg.sender, treasury, price);

        // Track if this is a new subscriber
        bool isNewSubscriber = !_hasActiveSubscription(msg.sender);

        // Calculate expiration time
        uint256 expirationTime;
        if (tier == SubscriptionTier.LIFETIME) {
            expirationTime = 0; // Lifetime never expires
        } else {
            uint256 duration = tierDurations[tier];
            // If user has active subscription, extend from current expiration
            if (_hasActiveSubscription(msg.sender) && sub.expirationTime > block.timestamp) {
                expirationTime = sub.expirationTime + duration;
            } else {
                expirationTime = block.timestamp + duration;
            }
        }

        // Update subscription
        sub.tier = tier;
        sub.expirationTime = expirationTime;
        sub.purchaseTime = block.timestamp;
        sub.totalPaid += price;

        // Update totals
        totalRevenue += price;
        if (isNewSubscriber) {
            totalSubscribers++;
        }

        emit SubscriptionPurchased(msg.sender, tier, expirationTime, price, block.timestamp);
    }

    /**
     * @notice Extend an existing subscription
     * @param tier The tier to extend with (can upgrade tier)
     */
    function extendSubscription(SubscriptionTier tier) external nonReentrant {
        if (tier == SubscriptionTier.NONE) revert InvalidTier();

        Subscription storage sub = subscriptions[msg.sender];

        // Check if already has lifetime
        if (sub.tier == SubscriptionTier.LIFETIME && sub.expirationTime == 0) {
            revert AlreadyLifetime();
        }

        uint256 price = tierPrices[tier];
        if (price == 0) revert InvalidTier();

        // Transfer PULSE from user to treasury
        pulseToken.safeTransferFrom(msg.sender, treasury, price);

        // Calculate new expiration time
        uint256 newExpirationTime;
        if (tier == SubscriptionTier.LIFETIME) {
            newExpirationTime = 0; // Lifetime never expires
        } else {
            uint256 duration = tierDurations[tier];
            // Extend from current expiration if still active, otherwise from now
            if (sub.expirationTime > block.timestamp) {
                newExpirationTime = sub.expirationTime + duration;
            } else {
                newExpirationTime = block.timestamp + duration;
            }
        }

        // Update subscription (upgrade tier if higher)
        if (tier > sub.tier || tier == SubscriptionTier.LIFETIME) {
            sub.tier = tier;
        }
        sub.expirationTime = newExpirationTime;
        sub.totalPaid += price;

        // Update totals
        totalRevenue += price;

        emit SubscriptionExtended(msg.sender, tier, newExpirationTime, price, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Check if a user has an active premium subscription
     * @param user Address to check
     * @return True if user has active subscription
     */
    function isPremium(address user) public view returns (bool) {
        return _hasActiveSubscription(user);
    }

    /**
     * @notice Check if a user is premium through subscription OR staking
     * @param user Address to check
     * @return True if user is premium through either method
     */
    function isPremiumOrStaked(address user) external view returns (bool) {
        // Check subscription first
        if (_hasActiveSubscription(user)) {
            return true;
        }

        // Check staking if staking contract is set
        if (address(stakingContract) != address(0)) {
            try stakingContract.isPremiumByStaking(user) returns (bool staked) {
                return staked;
            } catch {
                return false;
            }
        }

        return false;
    }

    /**
     * @notice Get subscription details for a user
     * @param user Address to query
     * @return tier The subscription tier
     * @return expirationTime When the subscription expires (0 for lifetime)
     * @return isActive Whether the subscription is currently active
     * @return purchaseTime When the subscription was purchased
     * @return totalPaid Total PULSE paid by this user
     */
    function getSubscription(address user) external view returns (
        SubscriptionTier tier,
        uint256 expirationTime,
        bool isActive,
        uint256 purchaseTime,
        uint256 totalPaid
    ) {
        Subscription storage sub = subscriptions[user];
        return (
            sub.tier,
            sub.expirationTime,
            _hasActiveSubscription(user),
            sub.purchaseTime,
            sub.totalPaid
        );
    }

    /**
     * @notice Get price for a tier
     * @param tier The subscription tier
     * @return Price in PULSE (wei)
     */
    function getTierPrice(SubscriptionTier tier) external view returns (uint256) {
        return tierPrices[tier];
    }

    /**
     * @notice Get duration for a tier
     * @param tier The subscription tier
     * @return Duration in seconds (0 for lifetime)
     */
    function getTierDuration(SubscriptionTier tier) external view returns (uint256) {
        return tierDurations[tier];
    }

    /**
     * @notice Get time remaining on subscription
     * @param user Address to check
     * @return Time remaining in seconds (type(uint256).max for lifetime, 0 if expired)
     */
    function getTimeRemaining(address user) external view returns (uint256) {
        Subscription storage sub = subscriptions[user];

        if (sub.tier == SubscriptionTier.LIFETIME && sub.expirationTime == 0 && sub.purchaseTime > 0) {
            return type(uint256).max; // Lifetime
        }

        if (sub.expirationTime == 0 || sub.expirationTime <= block.timestamp) {
            return 0; // Expired or no subscription
        }

        return sub.expirationTime - block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set price for a subscription tier
     * @param tier The subscription tier
     * @param price New price in PULSE (wei)
     */
    function setTierPrice(SubscriptionTier tier, uint256 price) external onlyOwner {
        if (tier == SubscriptionTier.NONE) revert InvalidTier();
        uint256 oldPrice = tierPrices[tier];
        tierPrices[tier] = price;
        emit TierPriceUpdated(tier, oldPrice, price);
    }

    /**
     * @notice Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Set staking contract address
     * @param _stakingContract New staking contract address
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        address oldContract = address(stakingContract);
        stakingContract = IStakingContract(_stakingContract);
        emit StakingContractUpdated(oldContract, _stakingContract);
    }

    /**
     * @notice Grant premium subscription to a user (admin function)
     * @param user Address to grant subscription
     * @param tier The subscription tier to grant
     * @param duration Custom duration in seconds (0 for tier default, max for lifetime)
     */
    function grantSubscription(address user, SubscriptionTier tier, uint256 duration) external onlyOwner {
        if (tier == SubscriptionTier.NONE) revert InvalidTier();
        if (user == address(0)) revert ZeroAddress();

        Subscription storage sub = subscriptions[user];

        bool isNewSubscriber = !_hasActiveSubscription(user);

        uint256 expirationTime;
        if (tier == SubscriptionTier.LIFETIME || duration == type(uint256).max) {
            expirationTime = 0; // Lifetime
            tier = SubscriptionTier.LIFETIME;
        } else if (duration > 0) {
            expirationTime = block.timestamp + duration;
        } else {
            expirationTime = block.timestamp + tierDurations[tier];
        }

        sub.tier = tier;
        sub.expirationTime = expirationTime;
        sub.purchaseTime = block.timestamp;
        // Note: totalPaid not updated for admin grants

        if (isNewSubscriber) {
            totalSubscribers++;
        }

        emit SubscriptionPurchased(user, tier, expirationTime, 0, block.timestamp);
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if user has active subscription
     * @param user Address to check
     * @return True if subscription is active
     */
    function _hasActiveSubscription(address user) internal view returns (bool) {
        Subscription storage sub = subscriptions[user];

        // No subscription purchased
        if (sub.purchaseTime == 0) {
            return false;
        }

        // Lifetime subscription (expirationTime = 0)
        if (sub.tier == SubscriptionTier.LIFETIME && sub.expirationTime == 0) {
            return true;
        }

        // Check if subscription has expired
        return sub.expirationTime > block.timestamp;
    }

    /**
     * @notice Required for UUPS proxy upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
