/**
 * Sideshift API routes
 */

import { Router, Request, Response } from 'express';
import { sideshiftService } from '../services/sideshift.service';
import { blockchainService } from '../services/blockchain.service';
import { shiftsService } from '../services/shifts.service';
import { preferencesService } from '../services/preferences.service';
import { createShiftSchema, webhookPayloadSchema } from '../utils/validators';
import { webhookAuth } from '../middleware/webhook-auth';
import { logger } from '../utils/logger';
import { Address } from 'viem';
import { apiLimiter, strictLimiter, webhookLimiter } from '../middleware/rate-limit';
import { getNetworkForChain } from '../config/chains';
import { getDefaultDestinationCoin } from '../utils/currency-utils';
import { getUserIp } from '../utils/request-utils';

const router = Router();

/**
 * GET /api/sideshift/supported-assets
 * Get list of supported cryptocurrencies
 */
router.get('/supported-assets', apiLimiter, async (req: Request, res: Response) => {
  try {
    const userIp = getUserIp(req);
    logger.info('Fetching supported assets', { userIp, headers: req.headers });
    const assets = await sideshiftService.getCoins(userIp);

    res.json({
      assets: assets.map((asset) => ({
        coin: asset.coin,
        name: asset.name,
        networks: asset.networks,
        tokenDetails: asset.tokenDetails,
      })),
      lastUpdated: new Date(),
    });
  } catch (error) {
    logger.error('Failed to get supported assets', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Failed to fetch supported assets' });
  }
});

/**
 * GET /api/sideshift/pair/:depositCoin/:settleCoin
 * Get pair information including min/max deposit amounts
 */
router.get('/pair/:depositCoin/:settleCoin', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { depositCoin, settleCoin } = req.params;
    const { depositNetwork, settleNetwork } = req.query;
    const userIp = getUserIp(req);
    console.log('depositNetwork', depositNetwork);
    console.log('settleNetwork', settleNetwork);
    console.log('depositCoin', depositCoin);
    console.log('settleCoin', settleCoin);

    // Get pair information from Sideshift
    const pairInfo = await sideshiftService.getPair(
      depositCoin,
      settleCoin,
      depositNetwork as string | undefined,
      settleNetwork as string | undefined,
      userIp
    );

    res.json({
      min: pairInfo.min,
      max: pairInfo.max,
      rate: pairInfo.rate,
      depositCoin: pairInfo.depositCoin,
      settleCoin: pairInfo.settleCoin,
      depositNetwork: pairInfo.depositNetwork,
      settleNetwork: pairInfo.settleNetwork,
    });
  } catch (error) {
    logger.error('Failed to get pair info', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Failed to fetch pair information' });
  }
});

/**
 * POST /api/sideshift/create-shift
 * Create a new shift order
 */
router.post('/create-shift', strictLimiter, async (req: Request, res: Response) => {
  try {
    // Extract user IP for SideShift API
    const userIp = getUserIp(req);

    // Validate request
    const data = createShiftSchema.parse(req.body);

    // Validate poll-related purposes
    if (data.purpose === 'fund_poll' || data.purpose === 'claim_reward') {
      // Require pollId for poll-related purposes
      if (!data.pollId) {
        return res.status(400).json({ error: 'pollId is required for this purpose' });
      }

      // Validate poll exists (using chainId if provided, otherwise env default)
      const pollExists = await blockchainService.validatePoll(data.pollId, data.chainId);
      if (!pollExists) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      // For claim_reward, verify poll has ended and has funds
      if (data.purpose === 'claim_reward') {
        const { canClaim, reason } = await blockchainService.canClaimRewards(data.pollId);
        if (!canClaim) {
          return res.status(400).json({ error: reason });
        }
      }
    }

    // For bridge purpose, validate networks are provided
    if (data.purpose === 'bridge') {
      if (!data.sourceNetwork) {
        return res.status(400).json({ error: 'sourceNetwork is required for bridge' });
      }
      if (!data.destNetwork) {
        return res.status(400).json({ error: 'destNetwork is required for bridge' });
      }
    }

    // Determine shift type (fixed if amount provided, variable otherwise)
    const shiftType = data.sourceAmount ? 'fixed' : 'variable';

    // Determine source and destination coins and networks based on purpose
    // We'll validate minimum amounts after determining the full coin/network configuration
    let sourceCoin = data.sourceCoin;
    let destCoin = data.destCoin;
    let sourceNetwork = data.sourceNetwork;
    let destNetwork = data.destNetwork;

    if (data.purpose === 'fund_poll') {
      // FUNDING: User deposits any token -> Convert to USDC/ETH on poll's chain

      // Get the chain where the poll is deployed (use provided chainId or env default)
      // pollId is guaranteed to exist due to validation above
      const pollChainId = blockchainService.getPollChain(data.pollId!, data.chainId);
      const pollNetwork = getNetworkForChain(pollChainId);

      // Destination network is always the poll's chain
      destNetwork = pollNetwork;

      // Destination coin: USDC for stablecoins, ETH for others
      if (!destCoin) {
        destCoin = getDefaultDestinationCoin(sourceCoin);
      }

      logger.info('Fund poll shift configuration', {
        pollId: data.pollId,
        pollChain: pollChainId,
        pollNetwork,
        sourceCoin,
        destCoin,
        destNetwork,
      });
    } else if (data.purpose === 'claim_reward') {
      // CLAIMING: Poll rewards (ETH on poll chain) -> Convert to user's preferred token/network

      // Get the chain where the poll is deployed (source of rewards, use provided chainId or env default)
      // pollId is guaranteed to exist due to validation above
      const pollChainId = blockchainService.getPollChain(data.pollId!, data.chainId);
      const pollNetwork = getNetworkForChain(pollChainId);

      // Source is always the poll's rewards (ETH on poll's chain)
      sourceCoin = 'ETH';
      sourceNetwork = pollNetwork;

      // Destination coin from user preferences or request
      if (!destCoin) {
        const preferences = await preferencesService.get(data.userAddress as Address);
        destCoin = preferences?.preferredToken || 'USDC';
      }

      logger.info('Claim reward shift configuration', {
        pollId: data.pollId,
        pollChain: pollChainId,
        pollNetwork,
        sourceCoin,
        destCoin,
        preferredToken: destCoin,
      });
    } else if (data.purpose === 'bridge') {
      // BRIDGE: User-specified source and destination for general bridging
      // Networks must be provided by user (validated above)

      logger.info('Bridge shift configuration', {
        sourceCoin,
        destCoin,
        sourceNetwork,
        destNetwork,
      });
    }

    // Get recommended networks if still not provided (for poll-related purposes)
    if (!sourceNetwork || !destNetwork) {
      const networks = await sideshiftService.getRecommendedNetworks(
        sourceCoin,
        destCoin,
        userIp
      );
      sourceNetwork = sourceNetwork || networks.defaultDepositNetwork;
      destNetwork = destNetwork || networks.defaultSettleNetwork;
    }

    // Validate minimum amount for fixed shifts before creating
    if (shiftType === 'fixed' && data.sourceAmount) {
      try {
        const pairInfo = await sideshiftService.getPair(
          sourceCoin,
          destCoin,
          sourceNetwork,
          destNetwork,
          userIp
        );

        const requestedAmount = parseFloat(data.sourceAmount);
        const minAmount = parseFloat(pairInfo.min);
        const maxAmount = parseFloat(pairInfo.max);

        if (requestedAmount < minAmount) {
          return res.status(400).json({
            error: `Amount too low. Minimum deposit: ${pairInfo.min} ${sourceCoin}`,
            details: {
              requestedAmount: data.sourceAmount,
              minimumAmount: pairInfo.min,
              maximumAmount: pairInfo.max,
              sourceCoin,
              destCoin,
            },
          });
        }

        if (requestedAmount > maxAmount) {
          return res.status(400).json({
            error: `Amount too high. Maximum deposit: ${pairInfo.max} ${sourceCoin}`,
            details: {
              requestedAmount: data.sourceAmount,
              minimumAmount: pairInfo.min,
              maximumAmount: pairInfo.max,
              sourceCoin,
              destCoin,
            },
          });
        }

        logger.info('Amount validation passed', {
          requestedAmount: data.sourceAmount,
          min: pairInfo.min,
          max: pairInfo.max,
          sourceCoin,
          destCoin,
        });
      } catch (error) {
        logger.warn('Could not validate amount limits, proceeding anyway', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with shift creation - SideShift will validate on their end
      }
    }

    // Create Sideshift order
    const shiftData = {
      settleAddress: data.userAddress, // User receives funds
      depositCoin: sourceCoin,
      settleCoin: destCoin,
      depositNetwork: sourceNetwork,
      settleNetwork: destNetwork,
      ...(shiftType === 'fixed' && data.sourceAmount
        ? { depositAmount: data.sourceAmount }
        : {}),
      ...(data.refundAddress ? { refundAddress: data.refundAddress } : {}),
    };
    const sideshiftOrder = await sideshiftService.createShift(shiftType, shiftData, userIp);

    // Store shift in database
    const storedShift = await shiftsService.create({
      sideshiftOrderId: sideshiftOrder.id,
      pollId: data.pollId || 'bridge', // Use 'bridge' placeholder for general bridges
      userAddress: data.userAddress as Address,
      purpose: data.purpose,
      sourceAsset: sourceCoin,
      destAsset: destCoin,
      sourceNetwork: sourceNetwork,
      destNetwork: destNetwork,
      sourceAmount: data.sourceAmount,
      depositAddress: sideshiftOrder.depositAddress,
      settleAddress: sideshiftOrder.settleAddress,
      shiftType: sideshiftOrder.type,
      status: sideshiftOrder.status,
      expiresAt: new Date(sideshiftOrder.expiresAt),
    });

    logger.info('Shift created', {
      shiftId: storedShift.id,
      orderId: sideshiftOrder.id,
      pollId: data.pollId,
      purpose: data.purpose,
    });

    res.status(201).json({
      shift: storedShift,
      sideshift: {
        orderId: sideshiftOrder.id,
        depositAddress: sideshiftOrder.depositAddress,
        depositCoin: sideshiftOrder.depositCoin,
        depositNetwork: sideshiftOrder.depositNetwork,
        depositMin: sideshiftOrder.depositMin,
        depositMax: sideshiftOrder.depositMax,
        expiresAt: sideshiftOrder.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Failed to create shift', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/sideshift/shift-status/:id
 * Get shift status
 */
router.get('/shift-status/:id', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userIp = getUserIp(req);

    // Get from our database
    const storedShift = await shiftsService.getById(id);
    if (!storedShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Get latest status from Sideshift
    const sideshiftData = await sideshiftService.getShift(storedShift.sideshiftOrderId, userIp);

    // Update our database if status changed
    if (sideshiftData.status !== storedShift.status) {
      await shiftsService.update(id, {
        status: sideshiftData.status,
      });
    }

    res.json({
      shift: storedShift,
      sideshiftData,
    });
  } catch (error) {
    logger.error('Failed to get shift status', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Failed to get shift status' });
  }
});

/**
 * POST /api/sideshift/webhook
 * Webhook endpoint for Sideshift callbacks
 */
router.post('/webhook', webhookLimiter, webhookAuth, async (req: Request, res: Response) => {
  try {
    const payload = webhookPayloadSchema.parse(req.body);

    logger.info('Webhook received', {
      orderId: payload.orderId,
      status: payload.status,
    });

    // Find shift in our database
    const shift = await shiftsService.getBySideshiftOrderId(payload.orderId);
    if (!shift) {
      logger.warn('Webhook for unknown shift', { orderId: payload.orderId });
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Update shift status
    await shiftsService.update(shift.id, {
      status: payload.status,
      depositTxHash: payload.depositHash as `0x${string}` | undefined,
      settleTxHash: payload.settleHash as `0x${string}` | undefined,
      ...(payload.status === 'settled' ? { completedAt: new Date() } : {}),
    });

    // Handle settled shifts
    if (payload.status === 'settled') {
      logger.info('Shift completed', {
        shiftId: shift.id,
        purpose: shift.purpose,
        pollId: shift.pollId,
      });

      // For claim_reward purpose, automatically withdraw funds from contract
      if (shift.purpose === 'claim_reward') {
        try {
          const { blockchainService } = await import('../services/blockchain.service');

          logger.info('Initiating automated reward withdrawal', {
            pollId: shift.pollId,
            recipient: shift.userAddress,
          });

          // Withdraw ETH (address(0)) - in the future, this could be extended to support multiple tokens
          const tokensToWithdraw = ['0x0000000000000000000000000000000000000000' as Address];

          const txHash = await blockchainService.withdrawFunds(
            shift.pollId,
            shift.userAddress as Address,
            tokensToWithdraw
          );

          logger.info('Automated withdrawal successful', {
            pollId: shift.pollId,
            recipient: shift.userAddress,
            txHash,
            tokens: tokensToWithdraw,
          });

          // Update shift with withdrawal transaction hash
          await shiftsService.update(shift.id, {
            contractTxHash: txHash,
          });
        } catch (error) {
          logger.error('Automated withdrawal failed', {
            error,
            pollId: shift.pollId,
            userAddress: shift.userAddress,
            suggestion: 'User will need to manually claim rewards',
          });
          // Don't fail the webhook - shift is still settled
          // User can manually claim if automated withdrawal fails
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/sideshift/user/:address
 * Get all shifts for a user
 */
router.get('/user/:address', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const shifts = await shiftsService.getByUserAddress(address as Address);
    res.json({ shifts });
  } catch (error) {
    logger.error('Failed to get user shifts', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Failed to get user shifts' });
  }
});

/**
 * GET /api/sideshift/poll/:pollId
 * Get all shifts for a poll
 */
router.get('/poll/:pollId', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const shifts = await shiftsService.getByPollId(pollId);
    res.json({ shifts });
  } catch (error) {
    logger.error('Failed to get poll shifts', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Failed to get poll shifts' });
  }
});

/**
 * POST /api/sideshift/shift/:shiftId/link-funding
 * Link a funding transaction to a shift
 */
router.post('/shift/:shiftId/link-funding', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { shiftId } = req.params;
    const { fundingTxHash } = req.body;

    if (!fundingTxHash) {
      return res.status(400).json({ error: 'fundingTxHash is required' });
    }

    // Get shift to verify it exists
    const shift = await shiftsService.getById(shiftId);
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Update shift with funding tx hash
    const updated = await shiftsService.update(shiftId, {
      fundingTxHash: fundingTxHash as `0x${string}`,
    });

    logger.info('Funding transaction linked to shift', {
      shiftId,
      fundingTxHash,
      pollId: shift.pollId,
    });

    res.json({
      success: true,
      shift: updated,
    });
  } catch (error) {
    logger.error('Failed to link funding transaction', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      details: error,
    });
    res.status(500).json({ error: 'Failed to link funding transaction' });
  }
});

export default router;
