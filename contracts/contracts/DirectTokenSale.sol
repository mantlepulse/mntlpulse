// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title DirectTokenSale
 * @dev Simple fixed-price token sale contract for immediate PULSE token purchases
 *
 * Features:
 * - Fixed price: 0.01 USDC per PULSE token
 * - Dual payment support: ETH and USDC
 * - Dynamic ETH pricing via Chainlink oracle (1 USDC = 100 PULSE equivalent)
 * - Per-wallet purchase limits
 * - Minimum purchase requirement
 * - Pausable for emergency stops
 * - Owner can withdraw funds and adjust parameters
 *
 * Purpose:
 * This contract is designed for direct token sales in the BasePulse app,
 * selling tokens at a premium compared to the IDO price to demonstrate
 * immediate utility within the application.
 */
contract DirectTokenSale is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 public immutable pulseToken;
    IERC20 public immutable usdcToken;
    AggregatorV3Interface public ethUsdPriceFeed;

    // Price: 0.01 USDC per PULSE (1 USDC = 100 PULSE)
    // Stored as USDC per PULSE with 6 decimals (USDC decimals)
    uint256 public tokenPriceUSDC = 10000; // 0.01 USDC = 10000 (with 6 decimals)

    // Supply limits
    uint256 public totalSupply = 1_000_000 * 1e18; // 1 million PULSE
    uint256 public tokensSold;

    // Purchase limits
    uint256 public minPurchase = 100 * 1e18; // 100 PULSE minimum
    uint256 public maxPurchasePerWallet = 50_000 * 1e18; // 50,000 PULSE max per wallet

    // Track purchases per wallet
    mapping(address => uint256) public purchasedAmount;

    // Statistics
    uint256 public totalBuyers;
    uint256 public totalRaisedETH;
    uint256 public totalRaisedUSDC;

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

    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event LimitsUpdated(uint256 minPurchase, uint256 maxPurchasePerWallet);
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
    error StalePrice();
    error InvalidPriceFeed();

    // ============ Constructor ============

    /**
     * @param _pulseToken Address of the PULSE token contract
     * @param _usdcToken Address of the USDC token contract
     * @param _ethUsdPriceFeed Address of the Chainlink ETH/USD price feed
     */
    constructor(
        address _pulseToken,
        address _usdcToken,
        address _ethUsdPriceFeed
    ) Ownable(msg.sender) {
        require(_pulseToken != address(0), "Invalid PULSE address");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_ethUsdPriceFeed != address(0), "Invalid price feed address");

        pulseToken = IERC20(_pulseToken);
        usdcToken = IERC20(_usdcToken);
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
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
    function calculateTokensForUSDC(uint256 _usdcAmount) external view returns (uint256) {
        return (_usdcAmount * 1e18) / tokenPriceUSDC;
    }

    /**
     * @notice Calculate how many PULSE tokens can be bought with given ETH amount
     * @param _ethAmount Amount of ETH in wei
     * @dev Uses live Chainlink ETH/USD price for calculation
     */
    function calculateTokensForETH(uint256 _ethAmount) external view returns (uint256) {
        uint256 ethPriceUSD = getLatestETHPrice();
        // 1 ETH = (ETH price in USD) × 100 PULSE
        return (_ethAmount * ethPriceUSD * 100) / 1e8;
    }

    /**
     * @notice Calculate USDC cost for a specific amount of PULSE tokens
     * @param _tokenAmount Amount of PULSE tokens (with 18 decimals)
     */
    function calculateUSDCCost(uint256 _tokenAmount) external view returns (uint256) {
        return (_tokenAmount * tokenPriceUSDC) / 1e18;
    }

    /**
     * @notice Calculate ETH cost for a specific amount of PULSE tokens
     * @param _tokenAmount Amount of PULSE tokens (with 18 decimals)
     * @dev Uses live Chainlink ETH/USD price for calculation
     */
    function calculateETHCost(uint256 _tokenAmount) external view returns (uint256) {
        uint256 ethPriceUSD = getLatestETHPrice();
        // Reverse of: tokenAmount = (ethAmount * ethPriceUSD * 100) / 1e8
        // ethAmount = (tokenAmount * 1e8) / (ethPriceUSD * 100)
        return (_tokenAmount * 1e8) / (ethPriceUSD * 100);
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
     * @notice Withdraw unsold PULSE tokens
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

    // ============ Receive Function ============

    /**
     * @dev Reject direct ETH transfers, must use buyWithETH()
     */
    receive() external payable {
        revert("Use buyWithETH() function");
    }
}
