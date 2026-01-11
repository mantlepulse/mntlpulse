// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing on testnets
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 10 million USDC to deployer
        _mint(msg.sender, 10_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Anyone can mint tokens for testing
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
