import { pgTable, uuid, integer, text, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';

/**
 * Social account types that can be verified
 */
export const SocialType = {
  TWITTER: 'TWITTER',
  DISCORD: 'DISCORD',
  GITHUB: 'GITHUB',
  TELEGRAM: 'TELEGRAM',
} as const;

export type SocialType = typeof SocialType[keyof typeof SocialType];

/**
 * Verification method types
 */
export const VerificationType = {
  ZK: 'ZK',       // Zero-knowledge proof verification
  OAUTH: 'OAUTH', // OAuth social connection
} as const;

export type VerificationType = typeof VerificationType[keyof typeof VerificationType];

/**
 * Supported ZK verification providers
 */
export const ZKProvider = {
  RECLAIM: 'RECLAIM',       // Reclaim Protocol
  POLYGON_ID: 'POLYGON_ID', // Polygon ID
  ZKPASS: 'ZKPASS',         // zkPass
  WORLD_ID: 'WORLD_ID',     // World ID (proof of personhood)
} as const;

export type ZKProvider = typeof ZKProvider[keyof typeof ZKProvider];

/**
 * Provider display names (for ZK providers)
 */
export const ZK_PROVIDER_NAMES: Record<ZKProvider, string> = {
  RECLAIM: 'Reclaim Protocol',
  POLYGON_ID: 'Polygon ID',
  ZKPASS: 'zkPass',
  WORLD_ID: 'World ID',
};

/**
 * Verification type display names
 */
export const VERIFICATION_TYPE_NAMES: Record<VerificationType, string> = {
  ZK: 'ZK Proof',
  OAUTH: 'Social Connection',
};

/**
 * Social Verification schema - stores verifications for both ZK and OAuth
 * - ZK: stores nullifier from ZK proof (no personal data)
 * - OAuth: stores hashed social account ID (minimal data, sybil prevention)
 */
export const zkVerifications = pgTable('ZKVerification', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  address: text('address').notNull(), // User's wallet address (lowercase)
  socialType: text('socialType').notNull(), // 'TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM'
  verificationType: text('verificationType').notNull().default('ZK'), // 'ZK' | 'OAUTH'
  provider: text('provider').notNull(), // ZK: 'RECLAIM' | 'POLYGON_ID' | etc. OAuth: 'OAUTH'
  nullifier: text('nullifier').notNull(), // ZK: nullifier from proof. OAuth: hashed social account ID
  isActive: boolean('isActive').default(true).notNull(),
  verifiedAt: timestamp('verifiedAt').notNull(),
  expiresAt: timestamp('expiresAt'), // Optional expiration for time-limited verifications
  transactionHash: text('transactionHash'), // On-chain verification tx (if applicable)
  metadata: text('metadata'), // Optional JSON metadata (provider-specific, no PII)
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('ZKVerification_chainId_idx').on(table.chainId),
  addressIdx: index('ZKVerification_address_idx').on(table.address),
  nullifierIdx: index('ZKVerification_nullifier_idx').on(table.nullifier),
  socialTypeIdx: index('ZKVerification_socialType_idx').on(table.socialType),
  providerIdx: index('ZKVerification_provider_idx').on(table.provider),
  verificationTypeIdx: index('ZKVerification_verificationType_idx').on(table.verificationType),
  isActiveIdx: index('ZKVerification_isActive_idx').on(table.isActive),
  // Ensure nullifier is globally unique (sybil prevention across all providers and types)
  uniqueNullifier: unique('ZKVerification_nullifier_key').on(table.nullifier),
  // Ensure one verification per address per provider per social type per chain
  // This allows users to verify with multiple providers/methods
  uniqueAddressProviderSocial: unique('ZKVerification_address_provider_social_key').on(
    table.chainId,
    table.address,
    table.provider,
    table.socialType
  ),
}));

/**
 * Verification events log - audit trail for verifications
 */
export const zkVerificationEvents = pgTable('ZKVerificationEvent', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  address: text('address').notNull(),
  eventType: text('eventType').notNull(), // 'VERIFY' | 'REVOKE' | 'EXPIRE' | 'REFRESH'
  socialType: text('socialType').notNull(),
  verificationType: text('verificationType').notNull().default('ZK'), // 'ZK' | 'OAUTH'
  provider: text('provider').notNull(),
  transactionHash: text('transactionHash'),
  blockNumber: text('blockNumber'),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  chainIdIdx: index('ZKVerificationEvent_chainId_idx').on(table.chainId),
  addressIdx: index('ZKVerificationEvent_address_idx').on(table.address),
  eventTypeIdx: index('ZKVerificationEvent_eventType_idx').on(table.eventType),
  socialTypeIdx: index('ZKVerificationEvent_socialType_idx').on(table.socialType),
  providerIdx: index('ZKVerificationEvent_provider_idx').on(table.provider),
  verificationTypeIdx: index('ZKVerificationEvent_verificationType_idx').on(table.verificationType),
}));

/**
 * Verification stats cache - aggregate statistics by provider and type
 */
export const zkVerificationStats = pgTable('ZKVerificationStats', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  verificationType: text('verificationType'), // null = total, 'ZK' | 'OAUTH'
  provider: text('provider'), // null = total across all providers
  totalVerifications: integer('totalVerifications').default(0).notNull(),
  twitterVerifications: integer('twitterVerifications').default(0).notNull(),
  discordVerifications: integer('discordVerifications').default(0).notNull(),
  githubVerifications: integer('githubVerifications').default(0).notNull(),
  telegramVerifications: integer('telegramVerifications').default(0).notNull(),
  uniqueUsers: integer('uniqueUsers').default(0).notNull(), // Users with at least one verification
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  // Unique per chain + verification type + provider
  uniqueChainTypeProvider: unique('ZKVerificationStats_chain_type_provider_key').on(
    table.chainId,
    table.verificationType,
    table.provider
  ),
}));

/**
 * Provider configuration - admin can enable/disable providers
 */
export const zkProviderConfig = pgTable('ZKProviderConfig', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chainId').notNull(),
  provider: text('provider').notNull(), // 'RECLAIM' | 'POLYGON_ID' | 'ZKPASS' | 'WORLD_ID' | 'OAUTH'
  isEnabled: boolean('isEnabled').default(true).notNull(),
  displayName: text('displayName'),
  description: text('description'),
  configJson: text('configJson'), // Provider-specific config (API keys, etc. - encrypted)
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  uniqueChainProvider: unique('ZKProviderConfig_chain_provider_key').on(table.chainId, table.provider),
  providerIdx: index('ZKProviderConfig_provider_idx').on(table.provider),
}));

/**
 * OAuth state tokens - temporary storage for OAuth flow
 */
export const oauthStateTokens = pgTable('OAuthStateToken', {
  id: uuid('id').defaultRandom().primaryKey(),
  state: text('state').notNull().unique(), // Random state token for CSRF protection
  address: text('address').notNull(), // Wallet address initiating the OAuth flow
  chainId: integer('chainId').notNull(),
  socialType: text('socialType').notNull(), // 'TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM'
  redirectUrl: text('redirectUrl'), // Where to redirect after OAuth
  expiresAt: timestamp('expiresAt').notNull(), // State tokens expire after short period
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  stateIdx: index('OAuthStateToken_state_idx').on(table.state),
  addressIdx: index('OAuthStateToken_address_idx').on(table.address),
  expiresAtIdx: index('OAuthStateToken_expiresAt_idx').on(table.expiresAt),
}));

// Type exports
export type ZKVerification = typeof zkVerifications.$inferSelect;
export type NewZKVerification = typeof zkVerifications.$inferInsert;
export type ZKVerificationEvent = typeof zkVerificationEvents.$inferSelect;
export type NewZKVerificationEvent = typeof zkVerificationEvents.$inferInsert;
export type ZKVerificationStats = typeof zkVerificationStats.$inferSelect;
export type NewZKVerificationStats = typeof zkVerificationStats.$inferInsert;
export type ZKProviderConfig = typeof zkProviderConfig.$inferSelect;
export type NewZKProviderConfig = typeof zkProviderConfig.$inferInsert;
export type OAuthStateToken = typeof oauthStateTokens.$inferSelect;
export type NewOAuthStateToken = typeof oauthStateTokens.$inferInsert;
