// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPremiumSubscription {
    function isPremiumOrStaked(address user) external view returns (bool);
}

contract PollsContract is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    enum DistributionMode {
        MANUAL_PULL,    // Creator manually withdraws to single address (default, backward compatible)
        MANUAL_PUSH,    // Creator manually distributes to multiple recipients
        AUTOMATED       // System automatically distributes when poll ends
    }

    enum FundingType {
        NONE,           // No rewards
        SELF,           // Self-funded by creator
        COMMUNITY       // Community funded
    }

    enum PollStatus {
        ACTIVE,         // 0 - Accepting votes/funding
        CLOSED,         // 1 - Voting ended, awaiting distribution setup
        FOR_CLAIMING,   // 2 - Ready for reward distribution
        PAUSED,         // 3 - Temporarily suspended
        DRAFT,          // 4 - Created but not yet published (was NEW, renamed for clarity)
        FINALIZED       // 5 - All distributions complete, poll archived
    }

    enum VotingType {
        LINEAR,         // 0 - One person, one vote (default)
        QUADRATIC       // 1 - Pay-per-vote with quadratic cost (premium feature)
    }

    struct Poll {
        uint256 id;
        string question;
        string[] options;
        uint256[] votes;
        uint256 endTime;
        bool isActive;
        address creator;
        uint256 totalFunding;
        DistributionMode distributionMode;
        mapping(address => uint256) fundings;
        mapping(address => bool) hasVoted;
        mapping(address => bool) rewardsClaimed;
        address fundingToken; // The single token accepted for funding (address(0) for ETH)
        FundingType fundingType; // Type of funding (NONE, SELF, or COMMUNITY)
        // NEW FIELDS - APPENDED FOR UPGRADEABLE CONTRACT COMPATIBILITY
        PollStatus status; // Explicit status tracking (synchronized with isActive)
        PollStatus previousStatus; // Track previous status for resume functionality
        // QUADRATIC VOTING FIELDS
        VotingType votingType; // Type of voting (LINEAR or QUADRATIC)
        uint256 totalVotesBought; // Total votes purchased in quadratic voting
        mapping(address => uint256) votesOwned; // Votes owned by each user in quadratic voting
    }

    struct Funding {
        address token;
        uint256 amount;
        address funder;
        uint256 timestamp;
    }

    mapping(uint256 => Poll) public polls;
    mapping(address => bool) public whitelistedTokens;
    // Removed: mapping(uint256 => Funding[]) public pollFundings; - expensive array storage
    // New: Track token balances per poll for multi-token support
    mapping(uint256 => mapping(address => uint256)) public pollTokenBalances;

    uint256 public nextPollId;
    uint256 public constant MIN_POLL_DURATION = 1 hours;
    uint256 public constant MAX_POLL_DURATION = 30 days;

    // Quadratic voting related state
    IPremiumSubscription public premiumContract;
    IERC20 public pulseToken;
    address public quadraticVotingTreasury; // Where QV payments go

    // Platform fee state (for poll funding)
    uint256 public platformFeePercent; // Fee in basis points (e.g., 500 = 5%)
    address public platformTreasury; // Where platform fees are sent
    uint256 public constant MAX_PLATFORM_FEE = 2000; // Max 20% fee

    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string question,
        uint256 endTime
    );

    event Voted(
        uint256 indexed pollId,
        address indexed voter,
        uint256 optionIndex
    );

    event PollFunded(
        uint256 indexed pollId,
        address indexed funder,
        address token,
        uint256 amount
    );

    event TokenWhitelisted(address indexed token, bool status);

    event FundsWithdrawn(
        uint256 indexed pollId,
        address indexed recipient,
        address token,
        uint256 amount
    );

    event DistributionModeSet(
        uint256 indexed pollId,
        DistributionMode mode,
        uint256 timestamp
    );

    event RewardDistributed(
        uint256 indexed pollId,
        address indexed recipient,
        uint256 amount,
        address token,
        uint256 timestamp
    );

    event RewardClaimed(
        uint256 indexed pollId,
        address indexed claimer,
        uint256 amount,
        address token,
        uint256 timestamp
    );

    event PollStatusChanged(
        uint256 indexed pollId,
        PollStatus indexed oldStatus,
        PollStatus indexed newStatus,
        uint256 timestamp
    );

    event PollPaused(
        uint256 indexed pollId,
        uint256 timestamp
    );

    event PollResumed(
        uint256 indexed pollId,
        uint256 timestamp
    );

    event PollPublished(
        uint256 indexed pollId,
        uint256 timestamp
    );

    event PollFinalized(
        uint256 indexed pollId,
        uint256 timestamp
    );

    event VotesBought(
        uint256 indexed pollId,
        address indexed voter,
        uint256 optionIndex,
        uint256 numVotes,
        uint256 cost,
        uint256 timestamp
    );

    event PremiumContractUpdated(address indexed oldContract, address indexed newContract);
    event PulseTokenUpdated(address indexed oldToken, address indexed newToken);
    event QuadraticVotingTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeePaid(uint256 indexed pollId, address token, uint256 amount, address treasury);

    modifier pollExists(uint256 pollId) {
        require(pollId < nextPollId, "Poll does not exist");
        _;
    }

    modifier pollActive(uint256 pollId) {
        require(polls[pollId].isActive, "Poll is not active");
        require(block.timestamp < polls[pollId].endTime, "Poll has ended");
        _;
    }

    modifier validOption(uint256 pollId, uint256 optionIndex) {
        require(optionIndex < polls[pollId].options.length, "Invalid option");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        nextPollId = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Internal helper to synchronize isActive with status
     * Ensures backward compatibility by keeping both fields in sync
     * isActive is true only for ACTIVE status (not DRAFT, PAUSED, CLOSED, etc.)
     */
    function _syncIsActiveWithStatus(uint256 pollId) internal {
        polls[pollId].isActive = (polls[pollId].status == PollStatus.ACTIVE);
    }

    /**
     * @dev Internal helper to set poll status with synchronization
     * Updates both status and isActive fields atomically
     */
    function _setStatus(uint256 pollId, PollStatus newStatus) internal {
        PollStatus oldStatus = polls[pollId].status;
        polls[pollId].previousStatus = oldStatus;
        polls[pollId].status = newStatus;
        _syncIsActiveWithStatus(pollId);
        emit PollStatusChanged(pollId, oldStatus, newStatus, block.timestamp);
    }

    function whitelistToken(address token, bool status) external onlyOwner {
        whitelistedTokens[token] = status;
        emit TokenWhitelisted(token, status);
    }

    function setFundingToken(uint256 pollId, address fundingToken) external onlyOwner pollExists(pollId) {
        require(
            fundingToken == address(0) || whitelistedTokens[fundingToken],
            "Funding token must be ETH or whitelisted"
        );
        polls[pollId].fundingToken = fundingToken;
    }

    function setFundingType(uint256 pollId, FundingType fundingType) external onlyOwner pollExists(pollId) {
        polls[pollId].fundingType = fundingType;
    }

    function createPoll(
        string memory question,
        string[] memory options,
        uint256 duration,
        address fundingToken,
        FundingType fundingType
    ) external returns (uint256) {
        return createPollWithVotingTypeAndPublish(question, options, duration, fundingToken, fundingType, VotingType.LINEAR, true);
    }

    function createPollWithVotingType(
        string memory question,
        string[] memory options,
        uint256 duration,
        address fundingToken,
        FundingType fundingType,
        VotingType votingType
    ) public returns (uint256) {
        return createPollWithVotingTypeAndPublish(question, options, duration, fundingToken, fundingType, votingType, true);
    }

    /**
     * @notice Create a new poll with full control over voting type and publish status
     * @param question The poll question
     * @param options Array of voting options
     * @param duration Poll duration in seconds
     * @param fundingToken Token address for funding (address(0) for ETH)
     * @param fundingType Type of funding (NONE, SELF, COMMUNITY)
     * @param votingType Type of voting (LINEAR or QUADRATIC)
     * @param publish If true, poll starts as ACTIVE; if false, poll starts as DRAFT
     * @return pollId The ID of the created poll
     */
    function createPollWithVotingTypeAndPublish(
        string memory question,
        string[] memory options,
        uint256 duration,
        address fundingToken,
        FundingType fundingType,
        VotingType votingType,
        bool publish
    ) public returns (uint256) {
        require(bytes(question).length > 0, "Question cannot be empty");
        require(options.length >= 2, "Poll must have at least 2 options");
        require(options.length <= 10, "Poll cannot have more than 10 options");
        require(
            duration >= MIN_POLL_DURATION && duration <= MAX_POLL_DURATION,
            "Invalid poll duration"
        );
        require(
            fundingToken == address(0) || whitelistedTokens[fundingToken],
            "Funding token must be ETH or whitelisted"
        );

        // Quadratic voting requires premium subscription or staking
        if (votingType == VotingType.QUADRATIC) {
            require(
                address(premiumContract) != address(0),
                "Premium contract not set"
            );
            require(
                premiumContract.isPremiumOrStaked(msg.sender),
                "Quadratic voting requires premium"
            );
        }

        uint256 pollId = nextPollId++;
        Poll storage newPoll = polls[pollId];

        newPoll.id = pollId;
        newPoll.question = question;
        newPoll.options = options;
        newPoll.votes = new uint256[](options.length);
        newPoll.creator = msg.sender;
        newPoll.totalFunding = 0;
        newPoll.distributionMode = DistributionMode.MANUAL_PULL; // Default mode (backward compatible)
        newPoll.fundingToken = fundingToken;
        newPoll.fundingType = fundingType;
        newPoll.votingType = votingType; // Set voting type

        if (publish) {
            // Poll starts as ACTIVE immediately
            newPoll.endTime = block.timestamp + duration;
            newPoll.isActive = true;
            newPoll.status = PollStatus.ACTIVE;
            newPoll.previousStatus = PollStatus.ACTIVE;
        } else {
            // Poll starts as DRAFT - endTime will be set when published
            newPoll.endTime = duration; // Store duration temporarily, will be converted to endTime when published
            newPoll.isActive = false;
            newPoll.status = PollStatus.DRAFT;
            newPoll.previousStatus = PollStatus.DRAFT;
        }

        emit PollCreated(pollId, msg.sender, question, newPoll.endTime);
        return pollId;
    }

    /**
     * @notice Create a new poll with initial funding in a single transaction
     * @param question The poll question
     * @param options Array of voting options
     * @param duration Poll duration in seconds
     * @param fundingToken Token address for funding (address(0) for ETH)
     * @param fundingType Type of funding (NONE, SELF, COMMUNITY)
     * @param votingType Type of voting (LINEAR or QUADRATIC)
     * @param publish If true, poll starts as ACTIVE; if false, poll starts as DRAFT
     * @param fundingAmount Total amount to fund (including platform fee)
     * @return pollId The ID of the created poll
     */
    function createPollWithFundingAndPublish(
        string memory question,
        string[] memory options,
        uint256 duration,
        address fundingToken,
        FundingType fundingType,
        VotingType votingType,
        bool publish,
        uint256 fundingAmount
    ) external payable nonReentrant returns (uint256) {
        // Create the poll first
        uint256 pollId = createPollWithVotingTypeAndPublish(
            question,
            options,
            duration,
            fundingToken,
            fundingType,
            votingType,
            publish
        );

        // Handle funding if amount > 0
        if (fundingAmount > 0) {
            require(fundingType == FundingType.SELF, "Only self-funded polls can be funded at creation");

            // Calculate platform fee
            uint256 platformFee = calculatePlatformFee(fundingAmount);
            uint256 rewardPool = fundingAmount - platformFee;

            if (fundingToken == address(0)) {
                // ETH funding
                require(msg.value == fundingAmount, "ETH amount mismatch");

                // Send platform fee to treasury
                if (platformFee > 0 && platformTreasury != address(0)) {
                    (bool feeSuccess, ) = platformTreasury.call{value: platformFee}("");
                    require(feeSuccess, "Platform fee transfer failed");
                    emit PlatformFeePaid(pollId, address(0), platformFee, platformTreasury);
                }

                // Record reward pool for the poll
                polls[pollId].totalFunding += rewardPool;
                polls[pollId].fundings[msg.sender] += rewardPool;
                pollTokenBalances[pollId][address(0)] += rewardPool;
            } else {
                // ERC20 token funding
                require(whitelistedTokens[fundingToken], "Token not whitelisted");
                require(msg.value == 0, "ETH not accepted for token-funded polls");

                // Transfer full amount from user
                IERC20(fundingToken).safeTransferFrom(msg.sender, address(this), fundingAmount);

                // Send platform fee to treasury
                if (platformFee > 0 && platformTreasury != address(0)) {
                    IERC20(fundingToken).safeTransfer(platformTreasury, platformFee);
                    emit PlatformFeePaid(pollId, fundingToken, platformFee, platformTreasury);
                }

                // Record reward pool for the poll
                polls[pollId].totalFunding += rewardPool;
                polls[pollId].fundings[msg.sender] += rewardPool;
                pollTokenBalances[pollId][fundingToken] += rewardPool;
            }

            emit PollFunded(pollId, msg.sender, fundingToken, rewardPool);
        }

        return pollId;
    }

    function vote(uint256 pollId, uint256 optionIndex)
        external
        pollExists(pollId)
        pollActive(pollId)
        validOption(pollId, optionIndex)
    {
        require(polls[pollId].votingType == VotingType.LINEAR, "Use buyVotes for quadratic polls");
        require(!polls[pollId].hasVoted[msg.sender], "Already voted");

        polls[pollId].hasVoted[msg.sender] = true;
        polls[pollId].votes[optionIndex]++;

        emit Voted(pollId, msg.sender, optionIndex);
    }

    /**
     * @notice Buy votes for a quadratic voting poll
     * @param pollId The poll ID
     * @param optionIndex The option to vote for
     * @param numVotes Number of votes to buy
     */
    function buyVotes(uint256 pollId, uint256 optionIndex, uint256 numVotes)
        external
        pollExists(pollId)
        pollActive(pollId)
        validOption(pollId, optionIndex)
        nonReentrant
    {
        Poll storage poll = polls[pollId];
        require(poll.votingType == VotingType.QUADRATIC, "Not a quadratic poll");
        require(numVotes > 0, "Must buy at least 1 vote");
        require(address(pulseToken) != address(0), "PULSE token not set");
        require(quadraticVotingTreasury != address(0), "QV treasury not set");

        uint256 currentVotes = poll.votesOwned[msg.sender];
        uint256 cost = calculateQuadraticCost(currentVotes, numVotes);

        // Transfer PULSE tokens from voter to treasury
        pulseToken.safeTransferFrom(msg.sender, quadraticVotingTreasury, cost);

        // Update vote tracking
        poll.votesOwned[msg.sender] += numVotes;
        poll.votes[optionIndex] += numVotes;
        poll.totalVotesBought += numVotes;

        // Mark user as having voted (for UI purposes)
        poll.hasVoted[msg.sender] = true;

        emit VotesBought(pollId, msg.sender, optionIndex, numVotes, cost, block.timestamp);
    }

    /**
     * @notice Calculate the cost for additional votes using quadratic formula
     * @dev Cost = sum of squares: 1 + 4 + 9 + ... for each vote
     * @param currentVotes Number of votes the user already owns
     * @param additionalVotes Number of new votes to buy
     * @return Total cost in PULSE tokens (with 18 decimals)
     */
    function calculateQuadraticCost(uint256 currentVotes, uint256 additionalVotes)
        public
        pure
        returns (uint256)
    {
        uint256 totalCost = 0;
        for (uint256 i = 1; i <= additionalVotes; i++) {
            uint256 voteNumber = currentVotes + i;
            totalCost += voteNumber * voteNumber;
        }
        return totalCost * 1e18; // PULSE has 18 decimals
    }

    /**
     * @notice Preview the cost for buying votes without executing
     * @param pollId The poll ID
     * @param voter Address of the voter
     * @param numVotes Number of votes to preview cost for
     * @return Cost in PULSE tokens (with 18 decimals)
     */
    function previewVoteCost(uint256 pollId, address voter, uint256 numVotes)
        external
        view
        pollExists(pollId)
        returns (uint256)
    {
        require(polls[pollId].votingType == VotingType.QUADRATIC, "Not a quadratic poll");
        uint256 currentVotes = polls[pollId].votesOwned[voter];
        return calculateQuadraticCost(currentVotes, numVotes);
    }

    /**
     * @notice Get the number of votes a user owns in a quadratic poll
     * @param pollId The poll ID
     * @param voter Address of the voter
     * @return Number of votes owned
     */
    function getUserVotesInPoll(uint256 pollId, address voter)
        external
        view
        pollExists(pollId)
        returns (uint256)
    {
        return polls[pollId].votesOwned[voter];
    }

    /**
     * @notice Fund a poll with ETH (platform fee is deducted)
     * @param pollId The poll ID to fund
     */
    function fundPollWithETH(uint256 pollId)
        external
        payable
        pollExists(pollId)
        pollActive(pollId)
        nonReentrant
    {
        require(msg.value > 0, "Must send ETH to fund");
        require(polls[pollId].fundingToken == address(0), "This poll only accepts a specific token");

        // Calculate platform fee
        uint256 platformFee = calculatePlatformFee(msg.value);
        uint256 rewardPool = msg.value - platformFee;

        // Send platform fee to treasury
        if (platformFee > 0 && platformTreasury != address(0)) {
            (bool feeSuccess, ) = platformTreasury.call{value: platformFee}("");
            require(feeSuccess, "Platform fee transfer failed");
            emit PlatformFeePaid(pollId, address(0), platformFee, platformTreasury);
        }

        // Record reward pool (after fee deduction)
        polls[pollId].totalFunding += rewardPool;
        polls[pollId].fundings[msg.sender] += rewardPool;
        pollTokenBalances[pollId][address(0)] += rewardPool;

        emit PollFunded(pollId, msg.sender, address(0), rewardPool);
    }

    /**
     * @notice Fund a poll with ERC20 tokens (platform fee is deducted)
     * @param pollId The poll ID to fund
     * @param token The token address
     * @param amount Total amount to fund (including platform fee)
     */
    function fundPollWithToken(
        uint256 pollId,
        address token,
        uint256 amount
    )
        external
        pollExists(pollId)
        pollActive(pollId)
        nonReentrant
    {
        require(whitelistedTokens[token], "Token not whitelisted");
        require(amount > 0, "Amount must be greater than 0");
        require(polls[pollId].fundingToken == token, "This poll only accepts a specific token");

        // Transfer full amount from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate platform fee
        uint256 platformFee = calculatePlatformFee(amount);
        uint256 rewardPool = amount - platformFee;

        // Send platform fee to treasury
        if (platformFee > 0 && platformTreasury != address(0)) {
            IERC20(token).safeTransfer(platformTreasury, platformFee);
            emit PlatformFeePaid(pollId, token, platformFee, platformTreasury);
        }

        // Record reward pool (after fee deduction)
        polls[pollId].totalFunding += rewardPool;
        polls[pollId].fundings[msg.sender] += rewardPool;
        pollTokenBalances[pollId][token] += rewardPool;

        emit PollFunded(pollId, msg.sender, token, rewardPool);
    }

    function withdrawFunds(uint256 pollId, address recipient, address[] calldata tokens)
        external
        pollExists(pollId)
        nonReentrant
    {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can withdraw"
        );
        require(
            block.timestamp >= polls[pollId].endTime,
            "Poll must be ended to withdraw"
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = pollTokenBalances[pollId][tokens[i]];
            if (balance > 0) {
                pollTokenBalances[pollId][tokens[i]] = 0;

                if (tokens[i] == address(0)) {
                    (bool success, ) = recipient.call{value: balance}("");
                    require(success, "ETH transfer failed");
                } else {
                    IERC20(tokens[i]).safeTransfer(recipient, balance);
                }

                emit FundsWithdrawn(pollId, recipient, tokens[i], balance);
            }
        }
    }

    function setDistributionMode(uint256 pollId, DistributionMode mode)
        external
        pollExists(pollId)
    {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can set distribution mode"
        );

        polls[pollId].distributionMode = mode;
        emit DistributionModeSet(pollId, mode, block.timestamp);
    }

    function distributeRewards(
        uint256 pollId,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    )
        external
        pollExists(pollId)
        nonReentrant
    {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can distribute rewards"
        );
        require(
            block.timestamp >= polls[pollId].endTime,
            "Poll must be ended to distribute rewards"
        );
        require(
            polls[pollId].distributionMode == DistributionMode.MANUAL_PUSH ||
            polls[pollId].distributionMode == DistributionMode.AUTOMATED,
            "Distribution mode must be MANUAL_PUSH or AUTOMATED"
        );
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Must have at least one recipient");

        _validateDistributionAmounts(pollId, token, amounts);
        _executeDistribution(pollId, token, recipients, amounts);
    }

    function _validateDistributionAmounts(uint256 pollId, address token, uint256[] calldata amounts) private view {
        uint256 totalToDistribute = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalToDistribute += amounts[i];
        }

        require(totalToDistribute <= pollTokenBalances[pollId][token], "Insufficient token balance");
    }

    function _executeDistribution(
        uint256 pollId,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) private {
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] == 0) continue;

            require(pollTokenBalances[pollId][token] >= amounts[i], "Insufficient balance for distribution");
            pollTokenBalances[pollId][token] -= amounts[i];

            _transferFunds(recipients[i], token, amounts[i]);
            emit RewardDistributed(pollId, recipients[i], amounts[i], token, block.timestamp);
        }
    }

    function _transferFunds(address recipient, address token, uint256 amount) private {
        if (token == address(0)) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    function closePoll(uint256 pollId) external pollExists(pollId) {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can close poll"
        );
        require(polls[pollId].status != PollStatus.CLOSED, "Poll is already closed");
        _setStatus(pollId, PollStatus.CLOSED);
    }

    /**
     * @dev Set poll status to FOR_CLAIMING (ready for reward distribution)
     * Can only be called by creator or owner
     * Poll must be CLOSED and have ended
     */
    function setForClaiming(uint256 pollId) external pollExists(pollId) {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can set for claiming"
        );
        require(polls[pollId].status == PollStatus.CLOSED, "Poll must be closed");
        require(block.timestamp >= polls[pollId].endTime, "Poll must have ended");
        _setStatus(pollId, PollStatus.FOR_CLAIMING);
    }

    /**
     * @dev Pause an active poll temporarily
     * Can only be called by creator or owner
     * Only ACTIVE polls can be paused
     */
    function pausePoll(uint256 pollId) external pollExists(pollId) {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can pause poll"
        );
        require(polls[pollId].status == PollStatus.ACTIVE, "Only active polls can be paused");
        _setStatus(pollId, PollStatus.PAUSED);
        emit PollPaused(pollId, block.timestamp);
    }

    /**
     * @dev Resume a paused poll
     * Can only be called by creator or owner
     * Only PAUSED polls can be resumed
     */
    function resumePoll(uint256 pollId) external pollExists(pollId) {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can resume poll"
        );
        require(polls[pollId].status == PollStatus.PAUSED, "Only paused polls can be resumed");
        require(block.timestamp < polls[pollId].endTime, "Cannot resume expired poll");
        // Resume to previous status (should be ACTIVE)
        PollStatus resumeToStatus = polls[pollId].previousStatus;
        if (resumeToStatus == PollStatus.PAUSED) {
            resumeToStatus = PollStatus.ACTIVE; // Fallback to ACTIVE if previous was also PAUSED
        }
        _setStatus(pollId, resumeToStatus);
        emit PollResumed(pollId, block.timestamp);
    }

    /**
     * @dev Publish a draft poll to make it active
     * Can only be called by creator or owner
     * Only DRAFT polls can be published
     * The endTime stored during creation is actually the duration, which is now converted to proper endTime
     */
    function publishPoll(uint256 pollId) external pollExists(pollId) {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can publish poll"
        );
        require(polls[pollId].status == PollStatus.DRAFT, "Only draft polls can be published");

        // Convert stored duration to actual endTime
        uint256 duration = polls[pollId].endTime; // This was storing duration temporarily
        require(
            duration >= MIN_POLL_DURATION && duration <= MAX_POLL_DURATION,
            "Invalid poll duration"
        );
        polls[pollId].endTime = block.timestamp + duration;

        _setStatus(pollId, PollStatus.ACTIVE);
        emit PollPublished(pollId, block.timestamp);
    }

    /**
     * @dev Finalize a poll after all distributions are complete
     * Can only be called by creator or owner
     * Poll must be in FOR_CLAIMING status
     * This is an optional final state indicating all rewards have been distributed
     */
    function finalizePoll(uint256 pollId) external pollExists(pollId) {
        require(
            msg.sender == polls[pollId].creator || msg.sender == owner(),
            "Only creator or owner can finalize poll"
        );
        require(
            polls[pollId].status == PollStatus.FOR_CLAIMING,
            "Poll must be in FOR_CLAIMING status to finalize"
        );
        _setStatus(pollId, PollStatus.FINALIZED);
        emit PollFinalized(pollId, block.timestamp);
    }

    /**
     * @dev Get all draft polls for a creator
     * @param creator Address of the poll creator
     * @return Array of poll IDs in DRAFT status created by the given address
     */
    function getDraftPolls(address creator) external view returns (uint256[] memory) {
        uint256 draftCount = 0;

        for (uint256 i = 0; i < nextPollId; i++) {
            if (polls[i].creator == creator && polls[i].status == PollStatus.DRAFT) {
                draftCount++;
            }
        }

        uint256[] memory draftPolls = new uint256[](draftCount);
        uint256 index = 0;

        for (uint256 i = 0; i < nextPollId; i++) {
            if (polls[i].creator == creator && polls[i].status == PollStatus.DRAFT) {
                draftPolls[index] = i;
                index++;
            }
        }

        return draftPolls;
    }

    /**
     * @dev Migration function to initialize status fields for existing polls
     * Should be called once after contract upgrade
     * Converts isActive boolean to PollStatus enum
     * Can be called in batches to avoid gas limits
     */
    function migratePolls(uint256 startPollId, uint256 endPollId) external onlyOwner {
        require(startPollId < endPollId, "Invalid range");
        require(endPollId <= nextPollId, "End poll ID exceeds total polls");

        for (uint256 i = startPollId; i < endPollId; i++) {
            Poll storage poll = polls[i];

            // Skip if already migrated (status is not default/zero value)
            if (poll.status != PollStatus.ACTIVE || poll.previousStatus != PollStatus.ACTIVE) {
                // Check if it's genuinely migrated or just initialized
                // If isActive matches status, it's likely already migrated
                bool statusMatchesIsActive = (poll.isActive && poll.status == PollStatus.ACTIVE) ||
                                            (!poll.isActive && poll.status != PollStatus.ACTIVE);
                if (statusMatchesIsActive && i > 0) {
                    continue; // Skip already migrated polls
                }
            }

            // Migrate based on current isActive value
            if (poll.isActive) {
                poll.status = PollStatus.ACTIVE;
                poll.previousStatus = PollStatus.ACTIVE;
            } else {
                // Closed polls should be set to CLOSED status
                poll.status = PollStatus.CLOSED;
                poll.previousStatus = PollStatus.ACTIVE;
            }
        }
    }

    function getPoll(uint256 pollId)
        external
        view
        pollExists(pollId)
        returns (
            uint256 id,
            string memory question,
            string[] memory options,
            uint256[] memory votes,
            uint256 endTime,
            bool isActive,
            address creator,
            uint256 totalFunding,
            DistributionMode distributionMode,
            address fundingToken,
            FundingType fundingType,
            PollStatus status,
            PollStatus previousStatus,
            VotingType votingType,
            uint256 totalVotesBought
        )
    {
        Poll storage poll = polls[pollId];
        return (
            poll.id,
            poll.question,
            poll.options,
            poll.votes,
            poll.endTime,
            poll.isActive,
            poll.creator,
            poll.totalFunding,
            poll.distributionMode,
            poll.fundingToken,
            poll.fundingType,
            poll.status,
            poll.previousStatus,
            poll.votingType,
            poll.totalVotesBought
        );
    }

    function getDistributionMode(uint256 pollId)
        external
        view
        pollExists(pollId)
        returns (DistributionMode)
    {
        return polls[pollId].distributionMode;
    }

    // Deprecated: getPollFundings() removed - use PollFunded events for funding history
    // Query events via backend API for better gas efficiency

    function getPollTokenBalance(uint256 pollId, address token)
        external
        view
        pollExists(pollId)
        returns (uint256)
    {
        return pollTokenBalances[pollId][token];
    }

    function hasUserVoted(uint256 pollId, address user)
        external
        view
        pollExists(pollId)
        returns (bool)
    {
        return polls[pollId].hasVoted[user];
    }

    function getUserFunding(uint256 pollId, address user)
        external
        view
        pollExists(pollId)
        returns (uint256)
    {
        return polls[pollId].fundings[user];
    }

    function isPollActive(uint256 pollId)
        external
        view
        pollExists(pollId)
        returns (bool)
    {
        return polls[pollId].isActive && block.timestamp < polls[pollId].endTime;
    }

    function getActivePolls() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        for (uint256 i = 0; i < nextPollId; i++) {
            if (polls[i].isActive && block.timestamp < polls[i].endTime) {
                activeCount++;
            }
        }

        uint256[] memory activePolls = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < nextPollId; i++) {
            if (polls[i].isActive && block.timestamp < polls[i].endTime) {
                activePolls[index] = i;
                index++;
            }
        }

        return activePolls;
    }

    // ============ Admin Functions for Quadratic Voting ============

    /**
     * @notice Set the premium subscription contract address
     * @param _premiumContract Address of the PremiumSubscription contract
     */
    function setPremiumContract(address _premiumContract) external onlyOwner {
        address oldContract = address(premiumContract);
        premiumContract = IPremiumSubscription(_premiumContract);
        emit PremiumContractUpdated(oldContract, _premiumContract);
    }

    /**
     * @notice Set the PULSE token address for quadratic voting
     * @param _pulseToken Address of the PULSE token
     */
    function setPulseToken(address _pulseToken) external onlyOwner {
        address oldToken = address(pulseToken);
        pulseToken = IERC20(_pulseToken);
        emit PulseTokenUpdated(oldToken, _pulseToken);
    }

    /**
     * @notice Set the treasury address for quadratic voting payments
     * @param _treasury Address to receive QV payments
     */
    function setQuadraticVotingTreasury(address _treasury) external onlyOwner {
        address oldTreasury = quadraticVotingTreasury;
        quadraticVotingTreasury = _treasury;
        emit QuadraticVotingTreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Set the platform fee percentage for poll funding
     * @param _feePercent Fee in basis points (e.g., 500 = 5%)
     */
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_PLATFORM_FEE, "Fee exceeds maximum");
        uint256 oldFee = platformFeePercent;
        platformFeePercent = _feePercent;
        emit PlatformFeeUpdated(oldFee, _feePercent);
    }

    /**
     * @notice Set the treasury address for platform fees
     * @param _treasury Address to receive platform fees
     */
    function setPlatformTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        address oldTreasury = platformTreasury;
        platformTreasury = _treasury;
        emit PlatformTreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Calculate platform fee for a given amount
     * @param amount The funding amount
     * @return fee The platform fee amount
     */
    function calculatePlatformFee(uint256 amount) public view returns (uint256) {
        if (platformFeePercent == 0) return 0;
        return (amount * platformFeePercent) / 10000;
    }

    /**
     * @notice Get the voting type for a poll
     * @param pollId The poll ID
     * @return The voting type (LINEAR or QUADRATIC)
     */
    function getVotingType(uint256 pollId)
        external
        view
        pollExists(pollId)
        returns (VotingType)
    {
        return polls[pollId].votingType;
    }

    /**
     * @notice Get total votes bought in a quadratic poll
     * @param pollId The poll ID
     * @return Total votes bought
     */
    function getTotalVotesBought(uint256 pollId)
        external
        view
        pollExists(pollId)
        returns (uint256)
    {
        return polls[pollId].totalVotesBought;
    }
}