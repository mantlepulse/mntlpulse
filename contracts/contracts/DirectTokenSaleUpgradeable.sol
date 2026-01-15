// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title DirectTokenSaleUpgradeable
 * @dev Upgradeable fixed-price token sale contract for PULSE token buy/sell
 *
 * Features:
 * - Fixed price: 0.01 USDC per PULSE token (configurable)
 * - Dual payment support: ETH and USDC
 * - Dynamic ETH pricing via Chainlink oracle (1 USDC = 100 PULSE equivalent)
 * - Buy and Sell functionality with configurable spread
 * - Per-wallet purchase limits
 * - Minimum purchase requirement
 * - Pausable for emergency stops
 * - Upgradeable via UUPS pattern
 *
 * Purpose:
 * This contract allows users to buy and sell PULSE tokens directly in the
 * Mantle Pulse app at a premium price with a small spread.
 */
contract DirectTokenSaleUpgradeable is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 public pulseToken;
    IERC20 public usdcToken;
    AggregatorV3Interface public ethUsdPriceFeed;

    // Price: 0.01 USDC per PULSE (1 USDC = 100 PULSE)
    // Stored as USDC per PULSE with 6 decimals (USDC decimals)
    uint256 public tokenPriceUSDC;

    // Supply limits
    uint256 public totalSupply;
    uint256 public tokensSold;

    // Purchase limits
    uint256 public minPurchase;
    uint256 public maxPurchasePerWallet;

    // Swap spread (basis points: 250 = 2.5%)
    uint256 public swapSpreadBasisPoints;

    // Track purchases per wallet
    mapping(address => uint256) public purchasedAmount;

    // Statistics
    uint256 public totalBuyers;
    uint256 public totalRaisedETH;
    uint256 public totalRaisedUSDC;
    uint256 public totalSoldETH;
    uint256 public totalSoldUSDC;

    // ============ Events ============

    event TokensPurchasedWithETH(
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );

    event TokensPurchasedWithUSDC(
        address indexed buyer,
        uint256 usdcAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );

    event TokensSoldForETH(
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 timestamp
    );

    event TokensSoldForUSDC(
        address indexed seller,
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 timestamp
    );

    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event SpreadUpdated(uint256 oldSpread, uint256 newSpread);
    event LimitsUpdated(uint256 minPurchase, uint256 maxPurchasePerWallet);
    event TotalSupplyUpdated(uint256 oldSupply, uint256 newSupply);
    event FundsWithdrawn(address indexed to, uint256 ethAmount, uint256 usdcAmount);
    event TokensWithdrawn(address indexed to, uint256 amount);
    event PriceFeedUpdated(address indexed oldFeed, address indexed newFeed);

    // ============ Errors ============

    error SaleEnded();
    error InsufficientSupply();
    error BelowMinimumPurchase();
    error ExceedsWalletLimit();
    error InvalidAmount();
    error InvalidPrice();
    error TransferFailed();
    error NoFundsToWithdraw();
    error InsufficientContractBalance();
    error StalePrice();
    error InvalidPriceFeed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    function initialize(
        address _pulseToken,
        address _usdcToken,
        address _ethUsdPriceFeed
    ) public initializer {
        require(_pulseToken != address(0), "Invalid PULSE address");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_ethUsdPriceFeed != address(0), "Invalid price feed address");

        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        pulseToken = IERC20(_pulseToken);
        usdcToken = IERC20(_usdcToken);
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);

        // Initialize with default values
        tokenPriceUSDC = 10000; // 0.01 USDC (with 6 decimals)
        totalSupply = 1_000_000 * 1e18; // 1 million PULSE
        minPurchase = 100 * 1e18; // 100 PULSE minimum
        maxPurchasePerWallet = 50_000 * 1e18; // 50,000 PULSE max per wallet
        swapSpreadBasisPoints = 250; // 2.5%
    }

    // ============ Purchase Functions ============

    /**
     * @notice Buy PULSE tokens with ETH
     * @dev Calculates token amount based on ETH sent and live Chainlink ETH/USD price
     *      Rate: 1 USDC = 100 PULSE, so 1 ETH = (ETH price in USD) × 100 PULSE
     */
    function buyWithETH() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();

        // Get live ETH/USD price from Chainlink
        uint256 ethPriceUSD = getLatestETHPrice();

        // Calculate token amount based on live ETH price
        // 1 ETH = (ETH price in USD) × 100 PULSE (since 1 USDC = 100 PULSE)
        // ethPriceUSD has 8 decimals from Chainlink, msg.value has 18 decimals
        // tokenAmount should have 18 decimals
        // Formula: (ethAmount * ethPriceUSD * 100) / 1e8
        uint256 tokenAmount = (msg.value * ethPriceUSD * 100) / 1e8;

        _processPurchase(msg.sender, tokenAmount);

        totalRaisedETH += msg.value;

        emit TokensPurchasedWithETH(msg.sender, msg.value, tokenAmount, block.timestamp);
    }

    /**
     * @notice Buy PULSE tokens with USDC
     * @param _usdcAmount Amount of USDC to spend (with 6 decimals)
     * @dev User must approve this contract to spend USDC first
     */
    function buyWithUSDC(uint256 _usdcAmount) external nonReentrant whenNotPaused {
        if (_usdcAmount == 0) revert InvalidAmount();

        // Calculate token amount: (USDC amount * 1e18) / (price in USDC with 6 decimals)
        // Example: 100 USDC (100 * 1e6) / 10000 = 10,000 * 1e18 PULSE tokens
        uint256 tokenAmount = (_usdcAmount * 1e18) / tokenPriceUSDC;

        // Transfer USDC from buyer
        usdcToken.safeTransferFrom(msg.sender, address(this), _usdcAmount);

        _processPurchase(msg.sender, tokenAmount);

        totalRaisedUSDC += _usdcAmount;

        emit TokensPurchasedWithUSDC(msg.sender, _usdcAmount, tokenAmount, block.timestamp);
    }

    /**
     * @dev Internal function to process token purchase
     * @param _buyer Address of the buyer
     * @param _tokenAmount Amount of tokens to purchase
     */
    function _processPurchase(address _buyer, uint256 _tokenAmount) internal {
        // Check if sale has tokens available
        if (tokensSold >= totalSupply) revert SaleEnded();

        // Check minimum purchase
        if (_tokenAmount < minPurchase) revert BelowMinimumPurchase();

        // Check if requested amount exceeds available supply
        if (tokensSold + _tokenAmount > totalSupply) revert InsufficientSupply();

        // Check wallet limit
        uint256 newTotal = purchasedAmount[_buyer] + _tokenAmount;
        if (newTotal > maxPurchasePerWallet) revert ExceedsWalletLimit();

        // Track first-time buyers
        if (purchasedAmount[_buyer] == 0) {
            totalBuyers++;
        }

        // Update state
        purchasedAmount[_buyer] = newTotal;
        tokensSold += _tokenAmount;

        // Transfer tokens to buyer
        pulseToken.safeTransfer(_buyer, _tokenAmount);
    }

    // ============ Sell Functions ============

    /**
     * @notice Sell PULSE tokens for ETH
     * @param _tokenAmount Amount of PULSE tokens to sell (with 18 decimals)
     */
    function sellForETH(uint256 _tokenAmount) external nonReentrant whenNotPaused {
        if (_tokenAmount == 0) revert InvalidAmount();

        // Calculate ETH amount with spread
        // Sell price = buy price - spread
        uint256 ethAmount = calculateETHForTokens(_tokenAmount);

        // Check contract has enough ETH
        if (address(this).balance < ethAmount) revert InsufficientContractBalance();

        // Transfer PULSE from seller
        pulseToken.safeTransferFrom(msg.sender, address(this), _tokenAmount);

        // Transfer ETH to seller
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        if (!success) revert TransferFailed();

        totalSoldETH += ethAmount;

        emit TokensSoldForETH(msg.sender, _tokenAmount, ethAmount, block.timestamp);
    }

    /**
     * @notice Sell PULSE tokens for USDC
     * @param _tokenAmount Amount of PULSE tokens to sell (with 18 decimals)
     */
    function sellForUSDC(uint256 _tokenAmount) external nonReentrant whenNotPaused {
        if (_tokenAmount == 0) revert InvalidAmount();

        // Calculate USDC amount with spread
        uint256 usdcAmount = calculateUSDCForTokens(_tokenAmount);

        // Check contract has enough USDC
        if (usdcToken.balanceOf(address(this)) < usdcAmount) revert InsufficientContractBalance();

        // Transfer PULSE from seller
        pulseToken.safeTransferFrom(msg.sender, address(this), _tokenAmount);

        // Transfer USDC to seller
        usdcToken.safeTransfer(msg.sender, usdcAmount);

        totalSoldUSDC += usdcAmount;

        emit TokensSoldForUSDC(msg.sender, _tokenAmount, usdcAmount, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get remaining tokens available for sale
     */
    function remainingSupply() external view returns (uint256) {
        return totalSupply - tokensSold;
    }

    /**
     * @notice Get remaining purchase allowance for a wallet
     * @param _wallet Address to check
     */
    function remainingAllowance(address _wallet) external view returns (uint256) {
        uint256 purchased = purchasedAmount[_wallet];
        if (purchased >= maxPurchasePerWallet) {
            return 0;
        }
        return maxPurchasePerWallet - purchased;
    }

    /**
     * @notice Calculate how many PULSE tokens can be bought with given USDC amount
     * @param _usdcAmount Amount of USDC (with 6 decimals)
     */
    function calculateTokensForUSDC(uint256 _usdcAmount) public view returns (uint256) {
        return (_usdcAmount * 1e18) / tokenPriceUSDC;
    }

    /**
     * @notice Calculate how many PULSE tokens can be bought with given ETH amount
     * @param _ethAmount Amount of ETH in wei
     * @dev Uses live Chainlink ETH/USD price for calculation
     */
    function calculateTokensForETH(uint256 _ethAmount) public view returns (uint256) {
        uint256 ethPriceUSD = getLatestETHPrice();
        // 1 ETH = (ETH price in USD) × 100 PULSE
        return (_ethAmount * ethPriceUSD * 100) / 1e8;
    }

    /**
     * @notice Calculate USDC cost for a specific amount of PULSE tokens (buy price)
     * @param _tokenAmount Amount of PULSE tokens (with 18 decimals)
     */
    function calculateUSDCCost(uint256 _tokenAmount) public view returns (uint256) {
        return (_tokenAmount * tokenPriceUSDC) / 1e18;
    }

    /**
     * @notice Calculate ETH cost for a specific amount of PULSE tokens (buy price)
     * @param _tokenAmount Amount of PULSE tokens (with 18 decimals)
     * @dev Uses live Chainlink ETH/USD price for calculation
     */
    function calculateETHCost(uint256 _tokenAmount) public view returns (uint256) {
        uint256 ethPriceUSD = getLatestETHPrice();
        // Reverse of: tokenAmount = (ethAmount * ethPriceUSD * 100) / 1e8
        // ethAmount = (tokenAmount * 1e8) / (ethPriceUSD * 100)
        return (_tokenAmount * 1e8) / (ethPriceUSD * 100);
    }

    /**
     * @notice Calculate USDC received when selling PULSE tokens (with spread)
     * @param _tokenAmount Amount of PULSE tokens to sell (with 18 decimals)
     */
    function calculateUSDCForTokens(uint256 _tokenAmount) public view returns (uint256) {
        uint256 baseAmount = calculateUSDCCost(_tokenAmount);
        uint256 spread = (baseAmount * swapSpreadBasisPoints) / 10000;
        return baseAmount - spread;
    }

    /**
     * @notice Calculate ETH received when selling PULSE tokens (with spread)
     * @param _tokenAmount Amount of PULSE tokens to sell (with 18 decimals)
     */
    function calculateETHForTokens(uint256 _tokenAmount) public view returns (uint256) {
        uint256 baseAmount = calculateETHCost(_tokenAmount);
        uint256 spread = (baseAmount * swapSpreadBasisPoints) / 10000;
        return baseAmount - spread;
    }

    /**
     * @notice Get buy price (what user pays)
     * @dev Uses live ETH price for ETH-based pricing
     */
    function getBuyPrice() external view returns (uint256 usdcPrice, uint256 ethPrice) {
        usdcPrice = tokenPriceUSDC; // per PULSE in USDC (6 decimals)
        uint256 ethPriceUSD = getLatestETHPrice();
        // ethPrice = cost in ETH for 1 PULSE (18 decimals)
        // 1 PULSE = 0.01 USDC, ETH price = ethPriceUSD with 8 decimals
        // ethPrice = (0.01 USDC) / (ethPriceUSD / 1e8) = 1e8 / (ethPriceUSD * 100)
        ethPrice = (1e18 * 1e8) / (ethPriceUSD * 100);
    }

    /**
     * @notice Get sell price (what user receives, after spread)
     * @dev Uses live ETH price for ETH-based pricing
     */
    function getSellPrice() external view returns (uint256 usdcPrice, uint256 ethPrice) {
        uint256 spread = swapSpreadBasisPoints;
        usdcPrice = tokenPriceUSDC - ((tokenPriceUSDC * spread) / 10000);

        uint256 ethPriceUSD = getLatestETHPrice();
        uint256 baseBuyEthPrice = (1e18 * 1e8) / (ethPriceUSD * 100);
        ethPrice = baseBuyEthPrice - ((baseBuyEthPrice * spread) / 10000);
    }

    /**
     * @notice Check if sale is still active
     */
    function isSaleActive() external view returns (bool) {
        return !paused() && tokensSold < totalSupply;
    }

    /**
     * @notice Get sale statistics
     */
    function getSaleStats() external view returns (
        uint256 _tokensSold,
        uint256 _remainingSupply,
        uint256 _totalBuyers,
        uint256 _totalRaisedETH,
        uint256 _totalRaisedUSDC
    ) {
        return (
            tokensSold,
            totalSupply - tokensSold,
            totalBuyers,
            totalRaisedETH,
            totalRaisedUSDC
        );
    }

    /**
     * @notice Get the latest ETH/USD price from Chainlink
     * @return The ETH price in USD with 8 decimals
     */
    function getLatestETHPrice() public view returns (uint256) {
        (
            /* uint80 roundID */,
            int256 price,
            /* uint256 startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = ethUsdPriceFeed.latestRoundData();

        // Ensure price is positive and not stale (updated within last 1 hour)
        if (price <= 0) revert InvalidPrice();
        if (block.timestamp - updatedAt > 3600) revert StalePrice();

        return uint256(price);
    }

    /**
     * @notice Get current ETH to PULSE rate
     * @return pulsePerETH Amount of PULSE tokens per 1 ETH
     * @return ethPriceUSD Current ETH price in USD (8 decimals)
     */
    function getETHToPulseRate() external view returns (uint256 pulsePerETH, uint256 ethPriceUSD) {
        ethPriceUSD = getLatestETHPrice();
        // 1 ETH = (ETH price in USD) × 100 PULSE (with 18 decimals)
        pulsePerETH = (1e18 * ethPriceUSD * 100) / 1e8;
        return (pulsePerETH, ethPriceUSD);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update token price
     * @param _newPriceUSDC New price in USDC (with 6 decimals)
     */
    function setTokenPrice(uint256 _newPriceUSDC) external onlyOwner {
        if (_newPriceUSDC == 0) revert InvalidPrice();

        uint256 oldPrice = tokenPriceUSDC;
        tokenPriceUSDC = _newPriceUSDC;

        emit PriceUpdated(oldPrice, _newPriceUSDC);
    }

    /**
     * @notice Update swap spread
     * @param _newSpreadBasisPoints New spread in basis points (250 = 2.5%)
     */
    function setSwapSpread(uint256 _newSpreadBasisPoints) external onlyOwner {
        require(_newSpreadBasisPoints <= 1000, "Spread too high"); // Max 10%

        uint256 oldSpread = swapSpreadBasisPoints;
        swapSpreadBasisPoints = _newSpreadBasisPoints;

        emit SpreadUpdated(oldSpread, _newSpreadBasisPoints);
    }

    /**
     * @notice Update purchase limits
     * @param _minPurchase New minimum purchase amount
     * @param _maxPurchasePerWallet New maximum purchase per wallet
     */
    function setPurchaseLimits(
        uint256 _minPurchase,
        uint256 _maxPurchasePerWallet
    ) external onlyOwner {
        require(_minPurchase > 0, "Min purchase must be > 0");
        require(_maxPurchasePerWallet >= _minPurchase, "Max must be >= min");

        minPurchase = _minPurchase;
        maxPurchasePerWallet = _maxPurchasePerWallet;

        emit LimitsUpdated(_minPurchase, _maxPurchasePerWallet);
    }

    /**
     * @notice Update total supply (sale allocation)
     * @param _newTotalSupply New total supply amount (with 18 decimals)
     * @dev Used to sync the contract's tracked supply with actual token balance
     */
    function setTotalSupply(uint256 _newTotalSupply) external onlyOwner {
        require(_newTotalSupply >= tokensSold, "Cannot set below tokens sold");

        uint256 oldSupply = totalSupply;
        totalSupply = _newTotalSupply;

        emit TotalSupplyUpdated(oldSupply, _newTotalSupply);
    }

    /**
     * @notice Update the Chainlink ETH/USD price feed address
     * @param _newPriceFeed Address of the new price feed
     */
    function setPriceFeed(address _newPriceFeed) external onlyOwner {
        if (_newPriceFeed == address(0)) revert InvalidPriceFeed();

        address oldFeed = address(ethUsdPriceFeed);
        ethUsdPriceFeed = AggregatorV3Interface(_newPriceFeed);

        emit PriceFeedUpdated(oldFeed, _newPriceFeed);
    }

    /**
     * @notice Withdraw raised funds (ETH and USDC)
     * @param _to Address to send funds to
     */
    function withdrawFunds(address _to) external onlyOwner {
        require(_to != address(0), "Invalid address");

        uint256 ethBalance = address(this).balance;
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        if (ethBalance == 0 && usdcBalance == 0) revert NoFundsToWithdraw();

        if (ethBalance > 0) {
            (bool success, ) = _to.call{value: ethBalance}("");
            if (!success) revert TransferFailed();
        }

        if (usdcBalance > 0) {
            usdcToken.safeTransfer(_to, usdcBalance);
        }

        emit FundsWithdrawn(_to, ethBalance, usdcBalance);
    }

    /**
     * @notice Withdraw PULSE tokens
     * @param _to Address to send tokens to
     * @param _amount Amount of tokens to withdraw
     */
    function withdrawTokens(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid address");

        uint256 balance = pulseToken.balanceOf(address(this));
        require(_amount <= balance, "Insufficient balance");

        pulseToken.safeTransfer(_to, _amount);

        emit TokensWithdrawn(_to, _amount);
    }

    /**
     * @notice Pause the sale
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the sale
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Upgrade Authorization ============

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Receive Function ============

    /**
     * @dev Allow contract to receive ETH (for sell functionality)
     */
    receive() external payable {}
}
