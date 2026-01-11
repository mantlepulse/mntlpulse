/**
 * Environment configuration with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database - at least one must be provided
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Blockchain - Mantle Network
  MANTLE_MAINNET_RPC_URL: z.string().url().optional(),
  MANTLE_SEPOLIA_RPC_URL: z.string().url().optional(),
  MANTLE_MAINNET_POLLS_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  MANTLE_SEPOLIA_POLLS_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  // Staking contracts (optional - set when deployed)
  MANTLE_MAINNET_STAKING_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format').optional(),
  MANTLE_SEPOLIA_STAKING_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format').optional(),
  // Premium subscription contracts (optional - set when deployed)
  MANTLE_MAINNET_PREMIUM_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format').optional(),
  MANTLE_SEPOLIA_PREMIUM_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format').optional(),

  // Sideshift
  SIDESHIFT_AFFILIATE_ID: z.string().optional(),
  SIDESHIFT_SECRET: z.string().optional(),

  // CORS - Comma-separated list of frontend URLs
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Security
  WEBHOOK_SECRET: z.string().min(32),

  // Backend Wallet (for automated contract calls)
  BACKEND_PRIVATE_KEY: z.string().optional(),

  // ZK Verification (provider-agnostic)
  ZK_VERIFICATION_ENABLED: z.string().default('false').transform(v => v === 'true'),
  ZK_VERIFICATION_CONTRACT_MAINNET: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format').optional(),
  ZK_VERIFICATION_CONTRACT_SEPOLIA: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format').optional(),

  // OAuth Social Connections
  OAUTH_ENABLED: z.string().default('true').transform(v => v === 'true'),
  API_BASE_URL: z.string().url().optional(),

  // Twitter/X OAuth 2.0
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),

  // Discord OAuth
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Telegram Bot (for Login Widget)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    const env = envSchema.parse(process.env);

    // Validate that at least one database is configured
    if (!env.DATABASE_URL && !env.REDIS_URL) {
      throw new Error('Either DATABASE_URL or REDIS_URL must be provided');
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err: z.ZodIssue) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    env: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },
  database: {
    url: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  },
  blockchain: {
    mantleMainnetRpcUrl: env.MANTLE_MAINNET_RPC_URL,
    mantleSepoliaRpcUrl: env.MANTLE_SEPOLIA_RPC_URL,
    mantleMainnetPollsContract: env.MANTLE_MAINNET_POLLS_CONTRACT,
    mantleSepoliaPollsContract: env.MANTLE_SEPOLIA_POLLS_CONTRACT,
    mantleMainnetStakingContract: env.MANTLE_MAINNET_STAKING_CONTRACT,
    mantleSepoliaStakingContract: env.MANTLE_SEPOLIA_STAKING_CONTRACT,
    mantleMainnetPremiumContract: env.MANTLE_MAINNET_PREMIUM_CONTRACT,
    mantleSepoliaPremiumContract: env.MANTLE_SEPOLIA_PREMIUM_CONTRACT,
  },
  sideshift: {
    apiUrl: 'https://sideshift.ai/api/v2',
    affiliateId: env.SIDESHIFT_AFFILIATE_ID,
    secret: env.SIDESHIFT_SECRET,
  },
  cors: {
    origin: (() => {
      const urls = env.FRONTEND_URL.split(',').map(url => url.trim());
      // Validate each URL
      urls.forEach(url => {
        try {
          new URL(url);
        } catch (error) {
          throw new Error(`Invalid URL in FRONTEND_URL: ${url}`);
        }
      });
      return urls;
    })(),
  },
  security: {
    webhookSecret: env.WEBHOOK_SECRET,
  },
  backend: {
    privateKey: env.BACKEND_PRIVATE_KEY,
  },
  zkVerification: {
    enabled: env.ZK_VERIFICATION_ENABLED,
    contractMainnet: env.ZK_VERIFICATION_CONTRACT_MAINNET,
    contractSepolia: env.ZK_VERIFICATION_CONTRACT_SEPOLIA,
  },
  oauth: {
    enabled: env.OAUTH_ENABLED,
    apiBaseUrl: env.API_BASE_URL,
    twitter: {
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    },
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
      botUsername: env.TELEGRAM_BOT_USERNAME,
    },
  },
} as const;
