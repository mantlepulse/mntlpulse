// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PulsePollToken
 * @dev Custom ERC20 token for Mantle Pulse poll funding
 *
 * Token Details:
 * - Name: PulsePoll Token
 * - Symbol: PULSE
 * - Decimals: 18 (standard)
 * - Max Supply: 1,000,000,000 PULSE (1 billion)
 * - Initial Supply: 1,000,000,000 PULSE (minted to deployer for testing)
 *
 * This token can be used to fund polls on the Mantle Pulse platform.
 * Utility token inspired by TruePulse tokenomics.
 */
contract PulsePollToken is ERC20, Ownable {
    /**
     * @dev Constructor that mints initial supply to the deployer
     * For testnet: Mints full 1 billion supply
     * For mainnet TGE: Can be modified to mint gradually
     */
    constructor() ERC20("PulsePoll Token", "PULSE") Ownable(msg.sender) {
        // Mint 1 billion tokens to the deployer (with 18 decimals)
        _mint(msg.sender, 1_000_000_000 * 10**18);
    }

    /**
     * @dev Allows owner to mint additional tokens if needed
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint (in wei, with decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Allows owner to burn tokens from their own balance
     * @param amount Amount of tokens to burn (in wei, with decimals)
     */
    function burn(uint256 amount) external onlyOwner {
        _burn(msg.sender, amount);
    }
}
