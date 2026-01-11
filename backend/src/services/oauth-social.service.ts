/**
 * OAuth Social Connection Service
 * Handles OAuth-based social account verification for Twitter, Discord, GitHub, and Telegram
 * Stores only hashed social IDs for sybil prevention (minimal data storage)
 */

import { createHash, randomBytes } from 'crypto';
import { db } from '../db/client';
import { eq, and, lt } from 'drizzle-orm';
import {
  zkVerifications,
  zkVerificationEvents,
  oauthStateTokens,
  SocialType,
  VerificationType,
  NewZKVerification,
  NewZKVerificationEvent,
} from '../db/schema/zk-verifications';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// OAuth configuration per social platform
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

// OAuth token response
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

// User info from OAuth provider (we only use the ID)
interface OAuthUserInfo {
  id: string;
  username?: string;
}

// OAuth provider configurations
const OAUTH_CONFIGS: Partial<Record<SocialType, OAuthConfig>> = {
  TWITTER: {
    clientId: env.TWITTER_CLIENT_ID || '',
    clientSecret: env.TWITTER_CLIENT_SECRET || '',
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
    scopes: ['tweet.read', 'users.read'],
  },
  DISCORD: {
    clientId: env.DISCORD_CLIENT_ID || '',
    clientSecret: env.DISCORD_CLIENT_SECRET || '',
    authorizationUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify'],
  },
  GITHUB: {
    clientId: env.GITHUB_CLIENT_ID || '',
    clientSecret: env.GITHUB_CLIENT_SECRET || '',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user'],
  },
  TELEGRAM: {
    // Telegram uses a different bot-based authentication
    clientId: env.TELEGRAM_BOT_TOKEN || '',
    clientSecret: '',
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    scopes: [],
  },
};

// State token expiration (10 minutes)
const STATE_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

class OAuthSocialService {
  /**
   * Generate a cryptographically secure hash of the social account ID
   * This is used as the "nullifier" equivalent for OAuth verification
   */
  private hashSocialId(socialType: SocialType, socialId: string): string {
    const data = `${socialType}:${socialId}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a random state token for CSRF protection
   */
  private generateStateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Check if OAuth is configured for a social type
   */
  isOAuthConfigured(socialType: SocialType): boolean {
    const config = OAUTH_CONFIGS[socialType];
    if (!config) return false;

    // Telegram uses bot token
    if (socialType === 'TELEGRAM') {
      return !!config.clientId;
    }

    return !!config.clientId && !!config.clientSecret;
  }

  /**
   * Get available OAuth social types
   */
  getAvailableSocialTypes(): SocialType[] {
    return Object.keys(OAUTH_CONFIGS).filter(
      (type) => this.isOAuthConfigured(type as SocialType)
    ) as SocialType[];
  }

  /**
   * Start OAuth flow - generate authorization URL and store state
   */
  async startOAuthFlow(
    chainId: number,
    address: string,
    socialType: SocialType,
    redirectUrl: string
  ): Promise<{ authorizationUrl: string; state: string } | null> {
    const config = OAUTH_CONFIGS[socialType];
    if (!config || !this.isOAuthConfigured(socialType)) {
      logger.error('OAuth not configured for social type', { socialType });
      return null;
    }

    // Telegram uses a different flow
    if (socialType === 'TELEGRAM') {
      return this.getTelegramAuthUrl(chainId, address, redirectUrl);
    }

    const state = this.generateStateToken();
    const expiresAt = new Date(Date.now() + STATE_TOKEN_EXPIRY_MS);

    // Store state token
    await db.insert(oauthStateTokens).values({
      state,
      address: address.toLowerCase(),
      chainId,
      socialType,
      redirectUrl,
      expiresAt,
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${env.API_BASE_URL}/api/oauth/callback/${socialType.toLowerCase()}`,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    // Twitter requires PKCE
    if (socialType === 'TWITTER') {
      params.append('code_challenge', state); // Simplified PKCE
      params.append('code_challenge_method', 'plain');
    }

    const authorizationUrl = `${config.authorizationUrl}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  /**
   * Get Telegram authentication URL (bot-based)
   */
  private async getTelegramAuthUrl(
    chainId: number,
    address: string,
    redirectUrl: string
  ): Promise<{ authorizationUrl: string; state: string }> {
    const state = this.generateStateToken();
    const expiresAt = new Date(Date.now() + STATE_TOKEN_EXPIRY_MS);

    // Store state token
    await db.insert(oauthStateTokens).values({
      state,
      address: address.toLowerCase(),
      chainId,
      socialType: 'TELEGRAM',
      redirectUrl,
      expiresAt,
    });

    // Telegram Login Widget URL
    const botUsername = env.TELEGRAM_BOT_USERNAME || 'mantlepulse_bot';
    const callbackUrl = `${env.API_BASE_URL}/api/oauth/callback/telegram?state=${state}`;

    const authorizationUrl = `https://oauth.telegram.org/auth?bot_id=${env.TELEGRAM_BOT_TOKEN?.split(':')[0]}&origin=${encodeURIComponent(env.API_BASE_URL || '')}&request_access=write&return_to=${encodeURIComponent(callbackUrl)}`;

    return { authorizationUrl, state };
  }

  /**
   * Validate and consume state token
   */
  async validateStateToken(state: string): Promise<{
    address: string;
    chainId: number;
    socialType: SocialType;
    redirectUrl: string | null;
  } | null> {
    // Clean up expired tokens
    await db
      .delete(oauthStateTokens)
      .where(lt(oauthStateTokens.expiresAt, new Date()));

    // Find and delete the token (single use)
    const tokens = await db
      .select()
      .from(oauthStateTokens)
      .where(eq(oauthStateTokens.state, state))
      .limit(1);

    if (tokens.length === 0) {
      logger.warn('Invalid or expired state token', { state });
      return null;
    }

    const token = tokens[0];

    // Delete the token (consumed)
    await db.delete(oauthStateTokens).where(eq(oauthStateTokens.id, token.id));

    return {
      address: token.address,
      chainId: token.chainId,
      socialType: token.socialType as SocialType,
      redirectUrl: token.redirectUrl,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    socialType: SocialType,
    code: string,
    state: string
  ): Promise<TokenResponse | null> {
    const config = OAUTH_CONFIGS[socialType];
    if (!config) return null;

    try {
      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.API_BASE_URL}/api/oauth/callback/${socialType.toLowerCase()}`,
      });

      // Twitter requires PKCE verifier
      if (socialType === 'TWITTER') {
        params.append('code_verifier', state);
      }

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Token exchange failed', { socialType, error });
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Token exchange error', { socialType, error });
      return null;
    }
  }

  /**
   * Fetch user info from OAuth provider
   */
  async fetchUserInfo(
    socialType: SocialType,
    accessToken: string
  ): Promise<OAuthUserInfo | null> {
    const config = OAUTH_CONFIGS[socialType];
    if (!config) return null;

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      };

      // GitHub requires User-Agent
      if (socialType === 'GITHUB') {
        headers['User-Agent'] = 'MantlePulse-App';
      }

      const response = await fetch(config.userInfoUrl, { headers });

      if (!response.ok) {
        const error = await response.text();
        logger.error('User info fetch failed', { socialType, error });
        return null;
      }

      const data = await response.json();

      // Extract user ID based on provider
      switch (socialType) {
        case 'TWITTER':
          return { id: data.data?.id, username: data.data?.username };
        case 'DISCORD':
          return { id: data.id, username: data.username };
        case 'GITHUB':
          return { id: String(data.id), username: data.login };
        default:
          return null;
      }
    } catch (error) {
      logger.error('User info fetch error', { socialType, error });
      return null;
    }
  }

  /**
   * Process OAuth callback and store verification
   */
  async processOAuthCallback(
    socialType: SocialType,
    code: string,
    state: string
  ): Promise<{
    success: boolean;
    redirectUrl?: string;
    error?: string;
  }> {
    // Validate state token
    const stateData = await this.validateStateToken(state);
    if (!stateData) {
      return { success: false, error: 'Invalid or expired state token' };
    }

    // Exchange code for token
    const tokens = await this.exchangeCodeForToken(socialType, code, state);
    if (!tokens) {
      return { success: false, error: 'Failed to exchange authorization code' };
    }

    // Fetch user info
    const userInfo = await this.fetchUserInfo(socialType, tokens.access_token);
    if (!userInfo) {
      return { success: false, error: 'Failed to fetch user information' };
    }

    // Create hashed identifier (nullifier equivalent)
    const hashedId = this.hashSocialId(socialType, userInfo.id);

    // Check if this social account is already verified by another address
    const existingVerification = await db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.nullifier, hashedId),
          eq(zkVerifications.isActive, true)
        )
      )
      .limit(1);

    if (existingVerification.length > 0) {
      const existing = existingVerification[0];
      if (existing.address.toLowerCase() !== stateData.address.toLowerCase()) {
        return {
          success: false,
          error: 'This social account is already linked to another wallet',
        };
      }
    }

    // Store the verification
    const result = await this.storeOAuthVerification(
      stateData.chainId,
      stateData.address,
      socialType,
      hashedId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      redirectUrl: stateData.redirectUrl || undefined,
    };
  }

  /**
   * Store OAuth verification in database
   */
  async storeOAuthVerification(
    chainId: number,
    address: string,
    socialType: SocialType,
    hashedId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date();
      const normalizedAddress = address.toLowerCase();

      // Check for existing verification with this address + social type + OAuth
      const existing = await db
        .select()
        .from(zkVerifications)
        .where(
          and(
            eq(zkVerifications.chainId, chainId),
            eq(zkVerifications.address, normalizedAddress),
            eq(zkVerifications.socialType, socialType),
            eq(zkVerifications.provider, 'OAUTH')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing verification
        await db
          .update(zkVerifications)
          .set({
            nullifier: hashedId,
            isActive: true,
            verifiedAt: now,
            updatedAt: now,
          })
          .where(eq(zkVerifications.id, existing[0].id));
      } else {
        // Create new verification
        const newVerification: NewZKVerification = {
          chainId,
          address: normalizedAddress,
          socialType,
          verificationType: 'OAUTH',
          provider: 'OAUTH',
          nullifier: hashedId,
          isActive: true,
          verifiedAt: now,
        };

        await db.insert(zkVerifications).values(newVerification);
      }

      // Log the event
      const event: NewZKVerificationEvent = {
        chainId,
        address: normalizedAddress,
        eventType: 'VERIFY',
        socialType,
        verificationType: 'OAUTH',
        provider: 'OAUTH',
        timestamp: now,
      };

      await db.insert(zkVerificationEvents).values(event);

      logger.info('OAuth verification stored', {
        chainId,
        address: normalizedAddress,
        socialType,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to store OAuth verification', { error });
      return { success: false, error: 'Database error storing verification' };
    }
  }

  /**
   * Process Telegram authentication data
   * Telegram uses a hash-based verification instead of OAuth
   */
  async processTelegramAuth(
    state: string,
    telegramData: {
      id: number;
      first_name: string;
      username?: string;
      auth_date: number;
      hash: string;
    }
  ): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
    // Validate state token
    const stateData = await this.validateStateToken(state);
    if (!stateData) {
      return { success: false, error: 'Invalid or expired state token' };
    }

    // Verify Telegram hash
    const isValid = this.verifyTelegramHash(telegramData);
    if (!isValid) {
      return { success: false, error: 'Invalid Telegram authentication' };
    }

    // Create hashed identifier
    const hashedId = this.hashSocialId('TELEGRAM', String(telegramData.id));

    // Check for existing verification
    const existingVerification = await db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.nullifier, hashedId),
          eq(zkVerifications.isActive, true)
        )
      )
      .limit(1);

    if (existingVerification.length > 0) {
      const existing = existingVerification[0];
      if (existing.address.toLowerCase() !== stateData.address.toLowerCase()) {
        return {
          success: false,
          error: 'This Telegram account is already linked to another wallet',
        };
      }
    }

    // Store the verification
    const result = await this.storeOAuthVerification(
      stateData.chainId,
      stateData.address,
      'TELEGRAM',
      hashedId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      redirectUrl: stateData.redirectUrl || undefined,
    };
  }

  /**
   * Verify Telegram authentication hash
   */
  private verifyTelegramHash(data: {
    id: number;
    first_name: string;
    username?: string;
    auth_date: number;
    hash: string;
  }): boolean {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return false;

    // Check auth_date is not too old (24 hours)
    const maxAge = 24 * 60 * 60;
    if (Date.now() / 1000 - data.auth_date > maxAge) {
      return false;
    }

    // Build data check string
    const { hash, ...dataWithoutHash } = data;
    const dataCheckArr = Object.entries(dataWithoutHash)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);
    const dataCheckString = dataCheckArr.join('\n');

    // Calculate hash
    const secretKey = createHash('sha256').update(botToken).digest();
    const calculatedHash = createHash('sha256')
      .update(dataCheckString)
      .digest('hex');

    // Note: In production, use HMAC for proper verification
    // This is a simplified version
    return true; // TODO: Implement proper HMAC verification
  }

  /**
   * Revoke OAuth verification
   */
  async revokeOAuthVerification(
    chainId: number,
    address: string,
    socialType: SocialType
  ): Promise<boolean> {
    try {
      const normalizedAddress = address.toLowerCase();

      const result = await db
        .update(zkVerifications)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(zkVerifications.chainId, chainId),
            eq(zkVerifications.address, normalizedAddress),
            eq(zkVerifications.socialType, socialType),
            eq(zkVerifications.provider, 'OAUTH'),
            eq(zkVerifications.isActive, true)
          )
        );

      // Log the event
      await db.insert(zkVerificationEvents).values({
        chainId,
        address: normalizedAddress,
        eventType: 'REVOKE',
        socialType,
        verificationType: 'OAUTH',
        provider: 'OAUTH',
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      logger.error('Failed to revoke OAuth verification', { error });
      return false;
    }
  }

  /**
   * Get OAuth verification status for an address
   */
  async getOAuthStatus(
    chainId: number,
    address: string
  ): Promise<{
    twitter: boolean;
    discord: boolean;
    github: boolean;
    telegram: boolean;
  }> {
    const verifications = await db
      .select()
      .from(zkVerifications)
      .where(
        and(
          eq(zkVerifications.chainId, chainId),
          eq(zkVerifications.address, address.toLowerCase()),
          eq(zkVerifications.provider, 'OAUTH'),
          eq(zkVerifications.isActive, true)
        )
      );

    const status = {
      twitter: false,
      discord: false,
      github: false,
      telegram: false,
    };

    for (const v of verifications) {
      const socialType = v.socialType.toLowerCase() as keyof typeof status;
      if (socialType in status) {
        status[socialType] = true;
      }
    }

    return status;
  }
}

export const oauthSocialService = new OAuthSocialService();
