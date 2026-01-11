/**
 * Blockchain service for interacting with Mantle network smart contracts
 */

import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantle, mantleSepoliaTestnet } from 'viem/chains';
import { config } from '../config/env';
import {
  CHAIN_ID,
  POLLS_CONTRACT_ADDRESS,
  POLLS_CONTRACT_ABI,
  RPC_URL,
  getNetworkConfig,
} from '../config/contracts';

// Determine chain object based on environment configuration
const CHAIN = CHAIN_ID === 5000 ? mantle : mantleSepoliaTestnet;

// Create public client for reading blockchain data (uses environment-based config)
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

// Current chain ID for the deployment (from environment)
const CURRENT_CHAIN_ID = CHAIN_ID;

/**
 * Blockchain service for smart contract interactions
 */
export class BlockchainService {
  /**
   * Get blockchain client for specific chain
   * @param chainId - Optional chain ID (defaults to environment config)
   * @returns Public client configured for the specified chain
   */
  private getClientForChain(chainId?: number) {
    const targetChainId = chainId || CURRENT_CHAIN_ID;
    const networkConfig = getNetworkConfig(targetChainId);
    const chain = targetChainId === 5000 ? mantle : mantleSepoliaTestnet;

    return {
      client: createPublicClient({
        chain,
        transport: http(networkConfig.rpcUrl),
      }),
      contractAddress: networkConfig.pollsContract,
    };
  }

  /**
   * Get the chain ID where polls are deployed
   * @param pollId - The poll ID (currently all polls are on the same chain)
   * @param chainId - Optional explicit chain ID
   * @returns Chain ID (e.g., 84532 for Base Sepolia)
   */
  getPollChain(pollId: string, chainId?: number): number {
    // If chainId explicitly provided, use it
    if (chainId) {
      return chainId;
    }

    // Otherwise use environment default
    // In the future, this could query a database or registry
    // to support multi-chain polls
    return CURRENT_CHAIN_ID;
  }
  /**
   * Get poll data from smart contract
   * @param pollId - The poll ID
   * @param chainId - Optional chain ID (defaults to environment config)
   */
  async getPoll(pollId: bigint, chainId?: number) {
    try {
      const { client, contractAddress } = this.getClientForChain(chainId);

      const result = await client.readContract({
        address: contractAddress,
        abi: POLLS_CONTRACT_ABI,
        functionName: 'getPoll',
        args: [pollId],
      });

      return {
        id: result[0],
        question: result[1],
        options: result[2],
        votes: result[3],
        endTime: result[4],
        isActive: result[5],
        creator: result[6],
        totalFunding: result[7],
        distributionMode: result[8],
      };
    } catch (error) {
      throw new Error(`Failed to get poll ${pollId}: ${error}`);
    }
  }

  /**
   * Get poll funding details from events (optimized)
   */
  async getPollFundings(pollId: bigint, chainId?: number) {
    try {
      const { client, contractAddress } = this.getClientForChain(chainId);

      // Query PollFunded events for this pollId
      const logs = await client.getLogs({
        address: contractAddress,
        event: {
          type: 'event',
          name: 'PollFunded',
          inputs: [
            { type: 'uint256', indexed: true, name: 'pollId' },
            { type: 'address', indexed: true, name: 'funder' },
            { type: 'address', indexed: false, name: 'token' },
            { type: 'uint256', indexed: false, name: 'amount' }
          ]
        },
        args: {
          pollId: pollId,
        },
        fromBlock: 0n,
        toBlock: 'latest'
      });

      // Get block timestamps for each log
      const fundingsWithTimestamps = await Promise.all(
        logs.map(async (log) => {
          try {
            const block = await client.getBlock({ blockNumber: log.blockNumber });
            return {
              token: log.args.token,
              amount: log.args.amount?.toString() || '0',
              funder: log.args.funder,
              timestamp: block.timestamp,
            };
          } catch (error) {
            // Fallback if block fetch fails
            return {
              token: log.args.token,
              amount: log.args.amount?.toString() || '0',
              funder: log.args.funder,
              timestamp: 0n,
            };
          }
        })
      );

      return fundingsWithTimestamps;
    } catch (error) {
      throw new Error(`Failed to get poll fundings ${pollId}: ${error}`);
    }
  }

  /**
   * Verify that a poll exists and is valid
   * @param pollId - The poll ID to validate
   * @param chainId - Optional chain ID (defaults to environment config)
   */
  async validatePoll(pollId: string, chainId?: number): Promise<boolean> {
    try {
      const { client, contractAddress } = this.getClientForChain(chainId);

      await client.readContract({
        address: contractAddress,
        abi: POLLS_CONTRACT_ABI,
        functionName: 'getPoll',
        args: [BigInt(pollId)],
      });

      // If getPoll() succeeds, the poll exists (contract's pollExists modifier passed)
      // This correctly validates poll ID 0 and all other valid poll IDs
      return true;
    } catch (error) {
      // Contract will revert if poll doesn't exist
      return false;
    }
  }

  /**
   * Check if poll has ended and has funds to claim
   */
  async canClaimRewards(pollId: string): Promise<{ canClaim: boolean; reason?: string }> {
    try {
      const poll = await this.getPoll(BigInt(pollId));

      if (!poll.isActive) {
        return { canClaim: false, reason: 'Poll is not active' };
      }

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      if (currentTime < poll.endTime) {
        return { canClaim: false, reason: 'Poll has not ended yet' };
      }

      if (poll.totalFunding === 0n) {
        return { canClaim: false, reason: 'Poll has no funding' };
      }

      return { canClaim: true };
    } catch (error) {
      return { canClaim: false, reason: `Error checking poll: ${error}` };
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: `0x${string}`) {
    try {
      return await publicClient.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      throw new Error(`Failed to get transaction receipt: ${error}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: `0x${string}`, confirmations = 1) {
    try {
      return await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations,
      });
    } catch (error) {
      throw new Error(`Transaction failed: ${error}`);
    }
  }

  /**
   * Withdraw funds from a poll (backend automated claim)
   * Requires BACKEND_PRIVATE_KEY environment variable
   * @param pollId - The poll ID
   * @param recipient - The recipient address
   * @param tokens - Array of token addresses to withdraw (use address(0) for ETH)
   */
  async withdrawFunds(pollId: string, recipient: Address, tokens: Address[]): Promise<`0x${string}`> {
    try {
      // Check if backend wallet is configured
      const privateKey = config.backend.privateKey;
      if (!privateKey) {
        throw new Error('Backend wallet not configured. Set BACKEND_PRIVATE_KEY in .env');
      }

      // Create wallet client for backend transactions
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: CHAIN,
        transport: http(RPC_URL),
      });

      // Call withdrawFunds on the contract (NEW: now requires tokens array)
      const hash = await walletClient.writeContract({
        address: POLLS_CONTRACT_ADDRESS,
        abi: POLLS_CONTRACT_ABI,
        functionName: 'withdrawFunds',
        args: [BigInt(pollId), recipient, tokens], // NEW: added tokens parameter
        account,
      });

      // Wait for transaction confirmation
      const receipt = await this.waitForTransaction(hash);

      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted');
      }

      return hash;
    } catch (error) {
      throw new Error(`Failed to withdraw funds: ${error}`);
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
