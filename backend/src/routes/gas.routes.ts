/**
 * Gas estimation API routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { gasService } from '../services/gas.service';
import { Address } from 'viem';

const router = Router();

// Validation schema for fee estimation request
const estimateFeeSchema = z.object({
  chainId: z.number().int().positive(),
  amount: z.string(),
  tokenAddress: z.string().optional(),
});

/**
 * GET /api/gas/estimate-funding-fee
 * Estimate gas fee for funding a poll
 */
router.get('/estimate-funding-fee', async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const { chainId, amount, tokenAddress } = estimateFeeSchema.parse({
      chainId: parseInt(req.query.chainId as string),
      amount: req.query.amount as string,
      tokenAddress: req.query.tokenAddress as string | undefined,
    });

    // Get fee estimate
    const estimate = await gasService.estimateFundingFee(
      chainId,
      amount,
      tokenAddress as Address | undefined
    );

    res.json(estimate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.issues,
      });
    }

    console.error('Failed to estimate gas fee:', error);
    res.status(500).json({
      error: 'Failed to estimate gas fee',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/gas/current-status
 * Get current gas fee status for a chain
 */
router.get('/current-status', async (req: Request, res: Response) => {
  try {
    const chainId = parseInt(req.query.chainId as string);

    if (!chainId || isNaN(chainId)) {
      return res.status(400).json({ error: 'Invalid chainId parameter' });
    }

    // Use a standard amount for status check (0.01 ETH)
    const estimate = await gasService.estimateFundingFee(chainId, '0.01');

    res.json({
      chainId,
      status: estimate.status,
      recommendation: estimate.recommendation,
      typicalFeeUSD: estimate.typicalFeeUSD,
      currentFeeUSD: estimate.estimatedFeeUSD,
    });
  } catch (error) {
    console.error('Failed to get gas status:', error);
    res.status(500).json({
      error: 'Failed to get gas status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
