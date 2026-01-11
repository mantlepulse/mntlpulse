/**
 * Event Listener Service for blockchain events
 * Listens to smart contract events and syncs them to the database
 */

import { createPublicClient, http, Address, Log } from 'viem';
import { mantleSepoliaTestnet, mantle } from 'viem/chains';
import { db } from '../db/client';
import { polls, distributionLogs, leaderboard, checkpoints } from '../db/schema';
import {
  POLLS_CONTRACT_ADDRESS,
  POLLS_CONTRACT_ABI,
  STAKING_CONTRACT_ADDRESS,
  STAKING_CONTRACT_ABI,
  PREMIUM_CONTRACT_ADDRESS,
  PREMIUM_CONTRACT_ABI,
  CHAIN_ID,
  MANTLE_SEPOLIA_CHAIN_ID,
} from '../config/contracts';
import { eq, sql, and } from 'drizzle-orm';
import { stakingService } from './staking.service';
import { premiumService, SubscriptionTier } from './premium.service';

// Distribution modes mapping
const DISTRIBUTION_MODES = ['MANUAL_PULL', 'MANUAL_PUSH', 'AUTOMATED'] as const;

// Subscription tier mapping
const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['MONTHLY', 'MONTHLY', 'ANNUAL', 'LIFETIME']; // Index 0 = NONE, but we map to MONTHLY as fallback

export class EventListenerService {
  private publicClient;
  private isListening = false;
  private lastBlockNumber: bigint | null = null;
  private unsubscribeFunctions: (() => void)[] = [];

  constructor() {
    // Select chain based on environment
    const chain = CHAIN_ID === MANTLE_SEPOLIA_CHAIN_ID ? mantleSepoliaTestnet : mantle;
    const rpcUrl = CHAIN_ID === MANTLE_SEPOLIA_CHAIN_ID
      ? 'https://rpc.sepolia.mantle.xyz'
      : 'https://rpc.mantle.xyz';

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  /**
   * Start listening to all contract events
   */
  async startListening() {
    if (this.isListening) {
      console.log('Event listener already running');
      return;
    }

    console.log(`Starting event listener on chain ${CHAIN_ID}...`);
    this.isListening = true;

    // Load checkpoint
    await this.loadCheckpoint();

    // Listen to all events
    this.listenToPollCreated();
    this.listenToPollFunded();
    this.listenToVoted();
    this.listenToDistributionModeSet();
    this.listenToRewardDistributed();
    this.listenToRewardClaimed();
    this.listenToFundsWithdrawn();

    // QV event - VotesBought
    this.listenToVotesBought();

    // Staking events (only if contract is deployed)
    if (STAKING_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      this.listenToStaked();
      this.listenToUnstaked();
      this.listenToStakingRewardsClaimed();
    }

    // Premium subscription events (only if contract is deployed)
    if (PREMIUM_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      this.listenToSubscriptionPurchased();
    }

    console.log('Event listener started successfully');
  }

  /**
   * Stop listening to events
   */
  stopListening() {
    console.log('Stopping event listener...');
    this.isListening = false;

    // Call all unsubscribe functions
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    console.log('Event listener stopped');
  }

  /**
   * Listen to PollCreated events
   */
  private listenToPollCreated() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'PollCreated',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handlePollCreated(log);
          } catch (error) {
            console.error('Error handling PollCreated event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('PollCreated event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to PollFunded events
   */
  private listenToPollFunded() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'PollFunded',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handlePollFunded(log);
          } catch (error) {
            console.error('Error handling PollFunded event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('PollFunded event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to Voted events
   */
  private listenToVoted() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'Voted',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleVoted(log);
          } catch (error) {
            console.error('Error handling Voted event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('Voted event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to DistributionModeSet events
   */
  private listenToDistributionModeSet() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'DistributionModeSet',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleDistributionModeSet(log);
          } catch (error) {
            console.error('Error handling DistributionModeSet event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('DistributionModeSet event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to RewardDistributed events
   */
  private listenToRewardDistributed() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'RewardDistributed',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleRewardDistributed(log);
          } catch (error) {
            console.error('Error handling RewardDistributed event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('RewardDistributed event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to RewardClaimed events
   */
  private listenToRewardClaimed() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'RewardClaimed',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleRewardClaimed(log);
          } catch (error) {
            console.error('Error handling RewardClaimed event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('RewardClaimed event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to FundsWithdrawn events
   */
  private listenToFundsWithdrawn() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'FundsWithdrawn',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleFundsWithdrawn(log);
          } catch (error) {
            console.error('Error handling FundsWithdrawn event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('FundsWithdrawn event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Handle PollCreated event
   */
  private async handlePollCreated(log: any) {
    const { pollId, creator, question, endTime } = log.args;

    console.log(`PollCreated: pollId=${pollId}, creator=${creator}`);

    // Insert or update poll in database
    await db
      .insert(polls)
      .values({
        chainId: CHAIN_ID,
        pollId: pollId,
        distributionMode: 'MANUAL_PULL', // Default mode
      })
      .onConflictDoNothing();

    // Update leaderboard - increment polls created
    await this.updateLeaderboard(creator as Address, {
      pollsCreated: sql`${leaderboard.pollsCreated} + 1`,
    });

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle PollFunded event
   */
  private async handlePollFunded(log: any) {
    const { pollId, funder } = log.args;

    console.log(`PollFunded: pollId=${pollId}, funder=${funder}`);

    // Update leaderboard - this could track funding contributions if needed
    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle Voted event
   */
  private async handleVoted(log: any) {
    const { pollId, voter, optionIndex } = log.args;

    console.log(`Voted: pollId=${pollId}, voter=${voter}, option=${optionIndex}`);

    // Update leaderboard - increment total votes and polls participated
    await this.updateLeaderboard(voter as Address, {
      totalVotes: sql`${leaderboard.totalVotes} + 1`,
      pollsParticipated: sql`
        CASE
          WHEN ${leaderboard.pollsParticipated} = 0 THEN 1
          ELSE ${leaderboard.pollsParticipated}
        END
      `,
    });

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle DistributionModeSet event
   */
  private async handleDistributionModeSet(log: any) {
    const { pollId, mode } = log.args;
    const modeString = DISTRIBUTION_MODES[mode as number] || 'MANUAL_PULL';

    console.log(`DistributionModeSet: pollId=${pollId}, mode=${modeString}`);

    // Find the poll in database and update distribution mode
    const existingPolls = await db
      .select()
      .from(polls)
      .where(and(eq(polls.pollId, pollId), eq(polls.chainId, CHAIN_ID)))
      .limit(1);

    if (existingPolls.length > 0) {
      await db
        .update(polls)
        .set({
          distributionMode: modeString,
          updatedAt: new Date(),
        })
        .where(eq(polls.id, existingPolls[0].id));
    }

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle RewardDistributed event
   */
  private async handleRewardDistributed(log: any) {
    const { pollId, recipient, amount, token, timestamp } = log.args;

    console.log(`RewardDistributed: pollId=${pollId}, recipient=${recipient}, amount=${amount}`);

    // Find the poll in database
    const existingPolls = await db
      .select()
      .from(polls)
      .where(and(eq(polls.pollId, pollId), eq(polls.chainId, CHAIN_ID)))
      .limit(1);

    if (existingPolls.length > 0) {
      // Insert distribution log
      await db.insert(distributionLogs).values({
        pollId: existingPolls[0].id,
        recipient: recipient as Address,
        amount: amount.toString(),
        token: token as Address,
        txHash: log.transactionHash,
        eventType: 'distributed',
        timestamp: new Date(Number(timestamp) * 1000),
      });

      // Update leaderboard - add to total rewards
      await this.updateLeaderboard(recipient as Address, {
        totalRewards: sql`${leaderboard.totalRewards}::numeric + ${amount.toString()}::numeric`,
      });
    }

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle RewardClaimed event
   */
  private async handleRewardClaimed(log: any) {
    const { pollId, claimer, amount, token, timestamp } = log.args;

    console.log(`RewardClaimed: pollId=${pollId}, claimer=${claimer}, amount=${amount}`);

    // Find the poll in database
    const existingPolls = await db
      .select()
      .from(polls)
      .where(and(eq(polls.pollId, pollId), eq(polls.chainId, CHAIN_ID)))
      .limit(1);

    if (existingPolls.length > 0) {
      // Insert distribution log
      await db.insert(distributionLogs).values({
        pollId: existingPolls[0].id,
        recipient: claimer as Address,
        amount: amount.toString(),
        token: token as Address,
        txHash: log.transactionHash,
        eventType: 'claimed',
        timestamp: new Date(Number(timestamp) * 1000),
      });

      // Update leaderboard - add to total rewards
      await this.updateLeaderboard(claimer as Address, {
        totalRewards: sql`${leaderboard.totalRewards}::numeric + ${amount.toString()}::numeric`,
      });
    }

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle FundsWithdrawn event
   */
  private async handleFundsWithdrawn(log: any) {
    const { pollId, recipient, token, amount } = log.args;

    console.log(`FundsWithdrawn: pollId=${pollId}, recipient=${recipient}, amount=${amount}`);

    // Find the poll in database
    const existingPolls = await db
      .select()
      .from(polls)
      .where(and(eq(polls.pollId, pollId), eq(polls.chainId, CHAIN_ID)))
      .limit(1);

    if (existingPolls.length > 0) {
      // Insert distribution log
      await db.insert(distributionLogs).values({
        pollId: existingPolls[0].id,
        recipient: recipient as Address,
        amount: amount.toString(),
        token: token as Address,
        txHash: log.transactionHash,
        eventType: 'withdrawn',
        timestamp: new Date(),
      });
    }

    await this.updateCheckpoint(log.blockNumber);
  }

  // ============================================
  // QV Event Listeners and Handlers
  // ============================================

  /**
   * Listen to VotesBought events (Quadratic Voting)
   */
  private listenToVotesBought() {
    const unwatch = this.publicClient.watchContractEvent({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      eventName: 'VotesBought',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleVotesBought(log);
          } catch (error) {
            console.error('Error handling VotesBought event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('VotesBought event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Handle VotesBought event
   */
  private async handleVotesBought(log: any) {
    const { pollId, voter, optionIndex, numVotes, cost } = log.args;

    console.log(`VotesBought: pollId=${pollId}, voter=${voter}, numVotes=${numVotes}, cost=${cost}`);

    // Update leaderboard - track QV participation
    await this.updateLeaderboard(voter as Address, {
      totalVotes: sql`${leaderboard.totalVotes} + ${Number(numVotes)}`,
    });

    await this.updateCheckpoint(log.blockNumber);
  }

  // ============================================
  // Staking Event Listeners and Handlers
  // ============================================

  /**
   * Listen to Staked events
   */
  private listenToStaked() {
    const unwatch = this.publicClient.watchContractEvent({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_CONTRACT_ABI,
      eventName: 'Staked',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleStaked(log);
          } catch (error) {
            console.error('Error handling Staked event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('Staked event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to Unstaked events
   */
  private listenToUnstaked() {
    const unwatch = this.publicClient.watchContractEvent({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_CONTRACT_ABI,
      eventName: 'Unstaked',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleUnstaked(log);
          } catch (error) {
            console.error('Error handling Unstaked event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('Unstaked event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Listen to RewardsClaimed events (Staking)
   */
  private listenToStakingRewardsClaimed() {
    const unwatch = this.publicClient.watchContractEvent({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_CONTRACT_ABI,
      eventName: 'RewardsClaimed',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleStakingRewardsClaimed(log);
          } catch (error) {
            console.error('Error handling RewardsClaimed (Staking) event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('RewardsClaimed (Staking) event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Handle Staked event
   */
  private async handleStaked(log: any) {
    const { user, amount, timestamp } = log.args;

    console.log(`Staked: user=${user}, amount=${amount}`);

    await stakingService.processStakeEvent(
      CHAIN_ID,
      user as string,
      amount.toString(),
      new Date(Number(timestamp) * 1000),
      log.transactionHash,
      log.blockNumber?.toString()
    );

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle Unstaked event
   */
  private async handleUnstaked(log: any) {
    const { user, amount, timestamp } = log.args;

    console.log(`Unstaked: user=${user}, amount=${amount}`);

    await stakingService.processUnstakeEvent(
      CHAIN_ID,
      user as string,
      amount.toString(),
      new Date(Number(timestamp) * 1000),
      log.transactionHash,
      log.blockNumber?.toString()
    );

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Handle RewardsClaimed event (Staking)
   */
  private async handleStakingRewardsClaimed(log: any) {
    const { user, amount, timestamp } = log.args;

    console.log(`StakingRewardsClaimed: user=${user}, amount=${amount}`);

    await stakingService.processClaimEvent(
      CHAIN_ID,
      user as string,
      amount.toString(),
      new Date(Number(timestamp) * 1000),
      log.transactionHash,
      log.blockNumber?.toString()
    );

    await this.updateCheckpoint(log.blockNumber);
  }

  // ============================================
  // Premium Subscription Event Listeners and Handlers
  // ============================================

  /**
   * Listen to SubscriptionPurchased events
   */
  private listenToSubscriptionPurchased() {
    const unwatch = this.publicClient.watchContractEvent({
      address: PREMIUM_CONTRACT_ADDRESS,
      abi: PREMIUM_CONTRACT_ABI,
      eventName: 'SubscriptionPurchased',
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleSubscriptionPurchased(log);
          } catch (error) {
            console.error('Error handling SubscriptionPurchased event:', error);
          }
        }
      },
      onError: (error) => {
        console.error('SubscriptionPurchased event error:', error);
      },
    });

    this.unsubscribeFunctions.push(unwatch);
  }

  /**
   * Handle SubscriptionPurchased event
   */
  private async handleSubscriptionPurchased(log: any) {
    const { user, tier, expirationTime, price } = log.args;
    const tierName = SUBSCRIPTION_TIERS[tier as number] || 'MONTHLY';

    console.log(`SubscriptionPurchased: user=${user}, tier=${tierName}, price=${price}`);

    await premiumService.processSubscriptionPurchase(
      CHAIN_ID,
      user as string,
      tierName,
      price.toString(),
      new Date(), // Use current time as purchase time
      log.transactionHash,
      log.blockNumber?.toString()
    );

    await this.updateCheckpoint(log.blockNumber);
  }

  /**
   * Update leaderboard for a user
   */
  private async updateLeaderboard(address: Address, updates: any) {
    try {
      // Try to insert first (upsert pattern)
      const existing = await db
        .select()
        .from(leaderboard)
        .where(eq(leaderboard.address, address.toLowerCase()))
        .limit(1);

      if (existing.length === 0) {
        // Insert new record
        await db.insert(leaderboard).values({
          address: address.toLowerCase(),
          totalRewards: '0',
          pollsParticipated: 0,
          totalVotes: 0,
          pollsCreated: 0,
          lastUpdated: new Date(),
        });
      }

      // Update with the provided changes
      await db
        .update(leaderboard)
        .set({
          ...updates,
          lastUpdated: new Date(),
        })
        .where(eq(leaderboard.address, address.toLowerCase()));
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  }

  /**
   * Load checkpoint from database
   */
  private async loadCheckpoint() {
    try {
      const chainIdStr = CHAIN_ID.toString();
      const existing = await db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.chainId, chainIdStr))
        .limit(1);

      if (existing.length > 0) {
        this.lastBlockNumber = existing[0].lastBlockNumber;
        console.log(`Checkpoint loaded: block ${this.lastBlockNumber}`);
      } else {
        // No checkpoint found, start from current block
        const blockNumber = await this.publicClient.getBlockNumber();
        this.lastBlockNumber = blockNumber;

        // Create initial checkpoint
        await db.insert(checkpoints).values({
          chainId: chainIdStr,
          lastBlockNumber: blockNumber,
          lastProcessedAt: new Date(),
        });

        console.log(`New checkpoint created: block ${blockNumber}`);
      }
    } catch (error) {
      console.error('Error loading checkpoint:', error);
      // Fallback to current block
      const blockNumber = await this.publicClient.getBlockNumber();
      this.lastBlockNumber = blockNumber;
    }
  }

  /**
   * Update checkpoint in database
   */
  private async updateCheckpoint(blockNumber: bigint) {
    if (!this.lastBlockNumber || blockNumber > this.lastBlockNumber) {
      this.lastBlockNumber = blockNumber;

      try {
        const chainIdStr = CHAIN_ID.toString();
        await db
          .update(checkpoints)
          .set({
            lastBlockNumber: blockNumber,
            lastProcessedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(checkpoints.chainId, chainIdStr));
      } catch (error) {
        console.error('Error updating checkpoint:', error);
      }
    }
  }

  /**
   * Sync historical events from a specific block range
   */
  async syncHistoricalEvents(fromBlock: bigint, toBlock?: bigint) {
    console.log(`Syncing historical events from block ${fromBlock}...`);

    const endBlock = toBlock || await this.publicClient.getBlockNumber();

    // Fetch all events in the range
    const logs = await this.publicClient.getContractEvents({
      address: POLLS_CONTRACT_ADDRESS,
      abi: POLLS_CONTRACT_ABI,
      fromBlock,
      toBlock: endBlock,
    });

    console.log(`Found ${logs.length} historical events`);

    // Process each event
    for (const log of logs) {
      try {
        switch (log.eventName) {
          case 'PollCreated':
            await this.handlePollCreated(log);
            break;
          case 'PollFunded':
            await this.handlePollFunded(log);
            break;
          case 'Voted':
            await this.handleVoted(log);
            break;
          case 'DistributionModeSet':
            await this.handleDistributionModeSet(log);
            break;
          case 'RewardDistributed':
            await this.handleRewardDistributed(log);
            break;
          case 'RewardClaimed':
            await this.handleRewardClaimed(log);
            break;
          case 'FundsWithdrawn':
            await this.handleFundsWithdrawn(log);
            break;
          case 'VotesBought':
            await this.handleVotesBought(log);
            break;
        }
      } catch (error) {
        console.error(`Error processing historical event ${log.eventName}:`, error);
      }
    }

    console.log('Historical sync complete');
  }
}

// Export singleton instance
export const eventListenerService = new EventListenerService();
