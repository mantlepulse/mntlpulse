/**
 * OAuth Social Connection Routes
 * Endpoints for OAuth-based social account verification
 * Supports: Twitter, Discord, GitHub, Telegram
 */

import { Router, Request, Response } from 'express';
import { oauthSocialService } from '../services/oauth-social.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { config } from '../config/env';

const router = Router();

// Validation schemas
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address');
const chainIdSchema = z.coerce.number().int().positive();
const socialTypeSchema = z.enum(['TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM']);

/**
 * GET /api/oauth/config
 * Get OAuth configuration and available social types
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const availableSocialTypes = oauthSocialService.getAvailableSocialTypes();

    res.json({
      enabled: config.oauth.enabled,
      availableSocialTypes,
      socialTypes: {
        TWITTER: oauthSocialService.isOAuthConfigured('TWITTER'),
        DISCORD: oauthSocialService.isOAuthConfigured('DISCORD'),
        GITHUB: oauthSocialService.isOAuthConfigured('GITHUB'),
        TELEGRAM: oauthSocialService.isOAuthConfigured('TELEGRAM'),
      },
    });
  } catch (error) {
    logger.error('Failed to get OAuth config', { error });
    res.status(500).json({ error: 'Failed to fetch OAuth configuration' });
  }
});

/**
 * POST /api/oauth/connect
 * Start OAuth flow for a social account
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    if (!config.oauth.enabled) {
      return res.status(503).json({ error: 'OAuth connections are currently disabled' });
    }

    const { address, socialType, chainId, redirectUrl } = req.body;

    // Validate inputs
    const validatedAddress = addressSchema.parse(address);
    const validatedSocialType = socialTypeSchema.parse(socialType);
    const validatedChainId = chainIdSchema.parse(chainId || 8453);
    const validatedRedirectUrl = redirectUrl || `${config.cors.origin[0]}/participant/verification`;

    // Check if OAuth is configured for this social type
    if (!oauthSocialService.isOAuthConfigured(validatedSocialType)) {
      return res.status(400).json({
        error: `OAuth is not configured for ${validatedSocialType}`,
      });
    }

    // Start OAuth flow
    const result = await oauthSocialService.startOAuthFlow(
      validatedChainId,
      validatedAddress,
      validatedSocialType,
      validatedRedirectUrl
    );

    if (!result) {
      return res.status(500).json({ error: 'Failed to start OAuth flow' });
    }

    res.json({
      success: true,
      authorizationUrl: result.authorizationUrl,
      state: result.state,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.issues });
    }
    logger.error('Failed to start OAuth flow', { error });
    res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

/**
 * GET /api/oauth/callback/twitter
 * Twitter OAuth callback
 */
router.get('/callback/twitter', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('Twitter OAuth error', { error: oauthError });
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=missing_params`);
    }

    const result = await oauthSocialService.processOAuthCallback(
      'TWITTER',
      code as string,
      state as string
    );

    if (result.success) {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?connected=twitter`);
    } else {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(result.error || 'unknown')}`);
    }
  } catch (error) {
    logger.error('Twitter OAuth callback error', { error });
    res.redirect(`${config.cors.origin[0]}/participant/verification?error=callback_failed`);
  }
});

/**
 * GET /api/oauth/callback/discord
 * Discord OAuth callback
 */
router.get('/callback/discord', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('Discord OAuth error', { error: oauthError });
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=missing_params`);
    }

    const result = await oauthSocialService.processOAuthCallback(
      'DISCORD',
      code as string,
      state as string
    );

    if (result.success) {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?connected=discord`);
    } else {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(result.error || 'unknown')}`);
    }
  } catch (error) {
    logger.error('Discord OAuth callback error', { error });
    res.redirect(`${config.cors.origin[0]}/participant/verification?error=callback_failed`);
  }
});

/**
 * GET /api/oauth/callback/github
 * GitHub OAuth callback
 */
router.get('/callback/github', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('GitHub OAuth error', { error: oauthError });
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=missing_params`);
    }

    const result = await oauthSocialService.processOAuthCallback(
      'GITHUB',
      code as string,
      state as string
    );

    if (result.success) {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?connected=github`);
    } else {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(result.error || 'unknown')}`);
    }
  } catch (error) {
    logger.error('GitHub OAuth callback error', { error });
    res.redirect(`${config.cors.origin[0]}/participant/verification?error=callback_failed`);
  }
});

/**
 * GET /api/oauth/callback/telegram
 * Telegram Login Widget callback
 */
router.get('/callback/telegram', async (req: Request, res: Response) => {
  try {
    const { state, id, first_name, username, auth_date, hash } = req.query;

    if (!state || !id || !auth_date || !hash) {
      return res.redirect(`${config.cors.origin[0]}/participant/verification?error=missing_params`);
    }

    const result = await oauthSocialService.processTelegramAuth(state as string, {
      id: parseInt(id as string, 10),
      first_name: first_name as string,
      username: username as string | undefined,
      auth_date: parseInt(auth_date as string, 10),
      hash: hash as string,
    });

    if (result.success) {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?connected=telegram`);
    } else {
      const redirectUrl = result.redirectUrl || `${config.cors.origin[0]}/participant/verification`;
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(result.error || 'unknown')}`);
    }
  } catch (error) {
    logger.error('Telegram OAuth callback error', { error });
    res.redirect(`${config.cors.origin[0]}/participant/verification?error=callback_failed`);
  }
});

/**
 * GET /api/oauth/status/:address
 * Get OAuth verification status for an address
 */
router.get('/status/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const validatedAddress = addressSchema.parse(address);
    const chainId = chainIdSchema.parse(req.query.chainId || 8453);

    const status = await oauthSocialService.getOAuthStatus(chainId, validatedAddress);

    res.json({
      address: validatedAddress,
      chainId,
      verificationType: 'OAUTH',
      ...status,
      verificationCount: Object.values(status).filter(Boolean).length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    logger.error('Failed to get OAuth status', { error });
    res.status(500).json({ error: 'Failed to fetch OAuth status' });
  }
});

/**
 * DELETE /api/oauth/disconnect
 * Disconnect a social account
 */
router.delete('/disconnect', async (req: Request, res: Response) => {
  try {
    const { address, socialType, chainId } = req.body;

    const validatedAddress = addressSchema.parse(address);
    const validatedSocialType = socialTypeSchema.parse(socialType);
    const validatedChainId = chainIdSchema.parse(chainId || 8453);

    const success = await oauthSocialService.revokeOAuthVerification(
      validatedChainId,
      validatedAddress,
      validatedSocialType
    );

    if (success) {
      res.json({
        success: true,
        message: `${validatedSocialType} disconnected successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Connection not found or already disconnected',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    logger.error('Failed to disconnect social account', { error });
    res.status(500).json({ error: 'Failed to disconnect social account' });
  }
});

export default router;
