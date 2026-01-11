/**
 * Premium/Subscription API routes
 */

import { Router, Request, Response } from 'express';
import { premiumService } from '../services/premium.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address');
const chainIdSchema = z.coerce.number().int().positive();

/**
 * GET /api/premium/status/:address
 * Get complete premium status (subscription + staking)
 */
router.get('/status/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const status = await premiumService.getPremiumStatus(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      ...status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get premium status', { error });
    res.status(500).json({ error: 'Failed to fetch premium status' });
  }
});

/**
 * GET /api/premium/subscription/:address
 * Get subscription details for an address
 */
router.get('/subscription/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const subscription = await premiumService.getByAddress(chainId, validatedAddress);

    if (!subscription) {
      return res.json({
        address: validatedAddress,
        chainId,
        subscription: null,
        hasActiveSubscription: false,
      });
    }

    const hasActive = await premiumService.hasActiveSubscription(chainId, validatedAddress);

    // Calculate time remaining
    let timeRemaining: number | null = null;
    if (subscription.tier === 'LIFETIME') {
      timeRemaining = -1; // -1 indicates lifetime (never expires)
    } else if (subscription.expirationTime) {
      timeRemaining = Math.max(0, subscription.expirationTime.getTime() - Date.now());
    }

    res.json({
      address: validatedAddress,
      chainId,
      subscription: {
        tier: subscription.tier,
        purchaseTime: subscription.purchaseTime,
        expirationTime: subscription.expirationTime,
        isActive: subscription.isActive,
        timeRemaining,
      },
      hasActiveSubscription: hasActive,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get subscription', { error });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /api/premium/:address/events
 * Get subscription events for an address
 */
router.get('/:address/events', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const events = await premiumService.getEvents(chainId, validatedAddress, limit);

    res.json({
      address: validatedAddress,
      chainId,
      events,
      meta: {
        limit,
        count: events.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get subscription events', { error });
    res.status(500).json({ error: 'Failed to fetch subscription events' });
  }
});

/**
 * GET /api/premium/check/:address
 * Quick check if address has premium access (any method)
 */
router.get('/check/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const isPremium = await premiumService.isPremiumOrStaked(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      isPremium,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to check premium access', { error });
    res.status(500).json({ error: 'Failed to check premium access' });
  }
});

/**
 * GET /api/premium/stats
 * Get global subscription statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const stats = await premiumService.getStats(chainId);

    res.json({
      chainId,
      stats: {
        totalSubscribers: stats.totalSubscribers,
        monthlySubscribers: stats.monthlySubscribers,
        annualSubscribers: stats.annualSubscribers,
        lifetimeSubscribers: stats.lifetimeSubscribers,
        totalRevenue: stats.totalRevenue,
      },
    });
  } catch (error) {
    logger.error('Failed to get subscription stats', { error });
    res.status(500).json({ error: 'Failed to fetch subscription statistics' });
  }
});

/**
 * GET /api/premium/tiers
 * Get subscription tier information
 */
router.get('/tiers', async (_req: Request, res: Response) => {
  try {
    // Return tier pricing and durations
    // These should match the smart contract values
    res.json({
      tiers: [
        {
          id: 'MONTHLY',
          name: 'Monthly',
          price: '1000000000000000000000', // 1,000 PULSE
          priceFormatted: '1,000 PULSE',
          duration: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
          durationFormatted: '30 days',
        },
        {
          id: 'ANNUAL',
          name: 'Annual',
          price: '10000000000000000000000', // 10,000 PULSE
          priceFormatted: '10,000 PULSE',
          duration: 365 * 24 * 60 * 60 * 1000, // 365 days in ms
          durationFormatted: '365 days',
          savings: '17%',
        },
        {
          id: 'LIFETIME',
          name: 'Lifetime',
          price: '50000000000000000000000', // 50,000 PULSE
          priceFormatted: '50,000 PULSE',
          duration: null,
          durationFormatted: 'Forever',
        },
      ],
      staking: {
        minimumForPremium: '10000000000000000000000', // 10,000 PULSE
        minimumFormatted: '10,000 PULSE',
        description: 'Stake PULSE to unlock premium features and earn rewards',
      },
    });
  } catch (error) {
    logger.error('Failed to get tier info', { error });
    res.status(500).json({ error: 'Failed to fetch tier information' });
  }
});

export default router;
