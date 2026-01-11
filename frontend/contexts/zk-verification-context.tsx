/**
 * ZK Verification Context
 * Multi-provider context for managing ZK identity verification status
 * Supports: Reclaim Protocol, Polygon ID, zkPass, World ID
 */

"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { useAccount, useChainId } from "wagmi"

export type SocialType = 'TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM'
export type ZKProvider = 'RECLAIM' | 'POLYGON_ID' | 'ZKPASS' | 'WORLD_ID'
export type VerificationType = 'ZK' | 'OAUTH'

export const ZK_PROVIDER_NAMES: Record<ZKProvider, string> = {
  RECLAIM: 'Reclaim Protocol',
  POLYGON_ID: 'Polygon ID',
  ZKPASS: 'zkPass',
  WORLD_ID: 'World ID',
}

export const VERIFICATION_TYPE_NAMES: Record<VerificationType, string> = {
  ZK: 'ZK Proof',
  OAUTH: 'Social Connection',
}

export const SOCIAL_TYPES: SocialType[] = ['TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM']
export const ZK_PROVIDERS: ZKProvider[] = ['RECLAIM', 'POLYGON_ID', 'ZKPASS', 'WORLD_ID']

// Provider info with verification status
export interface ProviderVerification {
  provider: ZKProvider
  providerName: string
  twitter: boolean
  discord: boolean
  github: boolean
  telegram: boolean
  verificationCount: number
}

// Simple verification status (any provider)
export interface ZKVerificationStatus {
  twitter: boolean
  discord: boolean
  github: boolean
  telegram: boolean
  verificationCount: number
  votingWeight: number
  isLoading: boolean
  error: string | null
}

// OAuth verification status
export interface OAuthVerificationStatus {
  twitter: boolean
  discord: boolean
  github: boolean
  telegram: boolean
  verificationCount: number
}

// Detailed status with per-provider breakdown
export interface DetailedVerificationStatus extends ZKVerificationStatus {
  byProvider: Record<ZKProvider, ProviderVerification>
  oauth: OAuthVerificationStatus
  byType: {
    ZK: OAuthVerificationStatus
    OAUTH: OAuthVerificationStatus
  }
}

// OAuth config
export interface OAuthConfig {
  enabled: boolean
  availableSocialTypes: SocialType[]
  socialTypes: Record<SocialType, boolean>
}

// Provider configuration
export interface ProviderInfo {
  provider: ZKProvider
  name: string
  enabled: boolean
  description?: string
}

export interface ZKVerificationConfig {
  enabled: boolean
  supportedSocialTypes: SocialType[]
  supportedProviders: ProviderInfo[]
  premiumRequired: boolean
}

interface ZKVerificationContextType {
  isEnabled: boolean
  status: ZKVerificationStatus
  detailedStatus: DetailedVerificationStatus | null
  config: ZKVerificationConfig | null
  oauthConfig: OAuthConfig | null
  providers: ProviderInfo[]
  canAccessZKFeatures: boolean
  refreshStatus: () => Promise<void>
  refreshDetailedStatus: () => Promise<void>
  submitVerification: (
    socialType: SocialType,
    provider: ZKProvider,
    nullifier: string,
    transactionHash?: string,
    metadata?: Record<string, any>
  ) => Promise<boolean>
  checkMeetsRequirements: (
    requiredProviders?: ZKProvider[],
    requiredSocialTypes?: SocialType[]
  ) => Promise<boolean>
  isVerifiedWith: (provider: ZKProvider, socialType: SocialType) => boolean
  // OAuth functions
  startOAuthFlow: (socialType: SocialType, redirectUrl?: string) => Promise<string | null>
  isOAuthVerified: (socialType: SocialType) => boolean
  disconnectOAuth: (socialType: SocialType) => Promise<boolean>
}

const DEFAULT_STATUS: ZKVerificationStatus = {
  twitter: false,
  discord: false,
  github: false,
  telegram: false,
  verificationCount: 0,
  votingWeight: 1,
  isLoading: false,
  error: null,
}

const DEFAULT_PROVIDER_VERIFICATION: ProviderVerification = {
  provider: 'RECLAIM',
  providerName: 'Reclaim Protocol',
  twitter: false,
  discord: false,
  github: false,
  telegram: false,
  verificationCount: 0,
}

const DEFAULT_OAUTH_VERIFICATION: OAuthVerificationStatus = {
  twitter: false,
  discord: false,
  github: false,
  telegram: false,
  verificationCount: 0,
}

const createDefaultDetailedStatus = (): DetailedVerificationStatus => ({
  ...DEFAULT_STATUS,
  byProvider: {
    RECLAIM: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'RECLAIM', providerName: 'Reclaim Protocol' },
    POLYGON_ID: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'POLYGON_ID', providerName: 'Polygon ID' },
    ZKPASS: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'ZKPASS', providerName: 'zkPass' },
    WORLD_ID: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'WORLD_ID', providerName: 'World ID' },
  },
  oauth: { ...DEFAULT_OAUTH_VERIFICATION },
  byType: {
    ZK: { ...DEFAULT_OAUTH_VERIFICATION },
    OAUTH: { ...DEFAULT_OAUTH_VERIFICATION },
  },
})

const DEFAULT_CONFIG: ZKVerificationConfig = {
  enabled: false,
  supportedSocialTypes: ['TWITTER', 'DISCORD', 'GITHUB', 'TELEGRAM'],
  supportedProviders: [],
  premiumRequired: true,
}

// Feature flag from environment
const FEATURE_ENABLED = process.env.NEXT_PUBLIC_ZK_VERIFICATION_ENABLED === 'true'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const ZKVerificationContext = createContext<ZKVerificationContextType | undefined>(undefined)

export function ZKVerificationProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [status, setStatus] = useState<ZKVerificationStatus>(DEFAULT_STATUS)
  const [detailedStatus, setDetailedStatus] = useState<DetailedVerificationStatus | null>(null)
  const [config, setConfig] = useState<ZKVerificationConfig | null>(null)
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [canAccessZKFeatures, setCanAccessZKFeatures] = useState(false)

  // Fetch configuration and providers on mount
  useEffect(() => {
    if (!FEATURE_ENABLED) {
      setConfig({ ...DEFAULT_CONFIG, enabled: false })
      return
    }

    const fetchConfig = async () => {
      try {
        const [configResponse, providersResponse, oauthResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/zk-verification/config?chainId=${chainId}`),
          fetch(`${API_BASE_URL}/api/zk-verification/providers?chainId=${chainId}`),
          fetch(`${API_BASE_URL}/api/oauth/config`),
        ])

        if (configResponse.ok) {
          const data = await configResponse.json()
          setConfig({
            enabled: data.enabled,
            supportedSocialTypes: data.supportedSocialTypes,
            supportedProviders: data.supportedProviders || [],
            premiumRequired: data.requirements?.premiumRequired ?? true,
          })
        }

        if (providersResponse.ok) {
          const data = await providersResponse.json()
          setProviders(data.providers || [])
        }

        if (oauthResponse.ok) {
          const data = await oauthResponse.json()
          setOauthConfig({
            enabled: data.enabled,
            availableSocialTypes: data.availableSocialTypes || [],
            socialTypes: data.socialTypes || {
              TWITTER: false,
              DISCORD: false,
              GITHUB: false,
              TELEGRAM: false,
            },
          })
        }
      } catch (error) {
        console.error('Failed to fetch verification config:', error)
        setConfig(DEFAULT_CONFIG)
      }
    }

    fetchConfig()
  }, [chainId])

  // Fetch simple verification status
  const refreshStatus = useCallback(async () => {
    if (!address || !FEATURE_ENABLED) return

    setStatus(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/zk-verification/status/${address}?chainId=${chainId}`
      )

      if (response.ok) {
        const data = await response.json()
        setStatus({
          twitter: data.twitter ?? false,
          discord: data.discord ?? false,
          github: data.github ?? false,
          telegram: data.telegram ?? false,
          verificationCount: data.verificationCount ?? 0,
          votingWeight: data.votingWeight ?? 1,
          isLoading: false,
          error: null,
        })
        setCanAccessZKFeatures(data.canAccessZKFeatures ?? false)
      } else {
        const errorData = await response.json()
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: errorData.error || 'Failed to fetch verification status',
        }))
      }
    } catch (error) {
      console.error('Failed to fetch ZK verification status:', error)
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error fetching verification status',
      }))
    }
  }, [address, chainId])

  // Fetch detailed verification status with per-provider breakdown
  const refreshDetailedStatus = useCallback(async () => {
    if (!address || !FEATURE_ENABLED) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/zk-verification/status/${address}/detailed?chainId=${chainId}`
      )

      if (response.ok) {
        const data = await response.json()

        // Build byProvider map from response
        const byProvider: Record<ZKProvider, ProviderVerification> = {
          RECLAIM: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'RECLAIM', providerName: 'Reclaim Protocol' },
          POLYGON_ID: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'POLYGON_ID', providerName: 'Polygon ID' },
          ZKPASS: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'ZKPASS', providerName: 'zkPass' },
          WORLD_ID: { ...DEFAULT_PROVIDER_VERIFICATION, provider: 'WORLD_ID', providerName: 'World ID' },
        }

        if (data.byProvider) {
          for (const [providerKey, providerData] of Object.entries(data.byProvider)) {
            const provider = providerKey as ZKProvider
            const pData = providerData as any
            if (byProvider[provider]) {
              byProvider[provider] = {
                provider,
                providerName: ZK_PROVIDER_NAMES[provider],
                twitter: pData.twitter ?? false,
                discord: pData.discord ?? false,
                github: pData.github ?? false,
                telegram: pData.telegram ?? false,
                verificationCount: pData.verificationCount ?? pData.count ?? 0,
              }
            }
          }
        }

        // Parse OAuth data
        const oauthData = data.oauth || {}
        const oauth: OAuthVerificationStatus = {
          twitter: oauthData.twitter ?? false,
          discord: oauthData.discord ?? false,
          github: oauthData.github ?? false,
          telegram: oauthData.telegram ?? false,
          verificationCount: oauthData.count ?? 0,
        }

        // Parse byType data
        const zkTypeData = data.byType?.ZK || {}
        const oauthTypeData = data.byType?.OAUTH || {}
        const byType = {
          ZK: {
            twitter: zkTypeData.twitter ?? false,
            discord: zkTypeData.discord ?? false,
            github: zkTypeData.github ?? false,
            telegram: zkTypeData.telegram ?? false,
            verificationCount: zkTypeData.count ?? 0,
          },
          OAUTH: {
            twitter: oauthTypeData.twitter ?? false,
            discord: oauthTypeData.discord ?? false,
            github: oauthTypeData.github ?? false,
            telegram: oauthTypeData.telegram ?? false,
            verificationCount: oauthTypeData.count ?? 0,
          },
        }

        setDetailedStatus({
          twitter: data.twitter ?? false,
          discord: data.discord ?? false,
          github: data.github ?? false,
          telegram: data.telegram ?? false,
          verificationCount: data.verificationCount ?? 0,
          votingWeight: data.votingWeight ?? 1,
          isLoading: false,
          error: null,
          byProvider,
          oauth,
          byType,
        })
      }
    } catch (error) {
      console.error('Failed to fetch detailed ZK verification status:', error)
    }
  }, [address, chainId])

  // Refresh both statuses when address or chain changes
  useEffect(() => {
    if (isConnected && address && FEATURE_ENABLED) {
      refreshStatus()
      refreshDetailedStatus()
    } else {
      setStatus(DEFAULT_STATUS)
      setDetailedStatus(null)
      setCanAccessZKFeatures(false)
    }
  }, [isConnected, address, chainId, refreshStatus, refreshDetailedStatus])

  // Submit a verification proof
  const submitVerification = useCallback(async (
    socialType: SocialType,
    provider: ZKProvider,
    nullifier: string,
    transactionHash?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    if (!address || !FEATURE_ENABLED) return false

    try {
      const response = await fetch(`${API_BASE_URL}/api/zk-verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          socialType,
          provider,
          nullifier,
          transactionHash,
          chainId,
          metadata,
        }),
      })

      if (response.ok) {
        // Refresh both statuses after successful verification
        await Promise.all([refreshStatus(), refreshDetailedStatus()])
        return true
      } else {
        const errorData = await response.json()
        setStatus(prev => ({
          ...prev,
          error: errorData.error || 'Verification failed',
        }))
        return false
      }
    } catch (error) {
      console.error('Failed to submit verification:', error)
      setStatus(prev => ({
        ...prev,
        error: 'Network error submitting verification',
      }))
      return false
    }
  }, [address, chainId, refreshStatus, refreshDetailedStatus])

  // Check if user meets specific requirements
  const checkMeetsRequirements = useCallback(async (
    requiredProviders?: ZKProvider[],
    requiredSocialTypes?: SocialType[]
  ): Promise<boolean> => {
    if (!address || !FEATURE_ENABLED) return false

    try {
      const response = await fetch(`${API_BASE_URL}/api/zk-verification/meets-requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          requiredProviders,
          requiredSocialTypes,
          chainId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.meetsRequirements ?? false
      }
      return false
    } catch (error) {
      console.error('Failed to check requirements:', error)
      return false
    }
  }, [address, chainId])

  // Check if verified with specific provider and social type
  const isVerifiedWith = useCallback((provider: ZKProvider, socialType: SocialType): boolean => {
    if (!detailedStatus?.byProvider) return false

    const providerData = detailedStatus.byProvider[provider]
    if (!providerData) return false

    const socialKey = socialType.toLowerCase() as keyof ProviderVerification
    return providerData[socialKey] as boolean
  }, [detailedStatus])

  // Start OAuth flow for a social type
  const startOAuthFlow = useCallback(async (
    socialType: SocialType,
    redirectUrl?: string
  ): Promise<string | null> => {
    if (!address || !oauthConfig?.enabled) return null

    try {
      const response = await fetch(`${API_BASE_URL}/api/oauth/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          socialType,
          chainId,
          redirectUrl: redirectUrl || window.location.href,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.authorizationUrl || null
      }
      return null
    } catch (error) {
      console.error('Failed to start OAuth flow:', error)
      return null
    }
  }, [address, chainId, oauthConfig])

  // Check if OAuth verified for a social type
  const isOAuthVerified = useCallback((socialType: SocialType): boolean => {
    if (!detailedStatus?.oauth) return false
    const socialKey = socialType.toLowerCase() as keyof OAuthVerificationStatus
    return detailedStatus.oauth[socialKey] as boolean
  }, [detailedStatus])

  // Disconnect OAuth for a social type
  const disconnectOAuth = useCallback(async (socialType: SocialType): Promise<boolean> => {
    if (!address) return false

    try {
      const response = await fetch(`${API_BASE_URL}/api/oauth/disconnect`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          socialType,
          chainId,
        }),
      })

      if (response.ok) {
        await Promise.all([refreshStatus(), refreshDetailedStatus()])
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to disconnect OAuth:', error)
      return false
    }
  }, [address, chainId, refreshStatus, refreshDetailedStatus])

  const value: ZKVerificationContextType = {
    isEnabled: FEATURE_ENABLED && (config?.enabled ?? false),
    status,
    detailedStatus,
    config,
    oauthConfig,
    providers,
    canAccessZKFeatures,
    refreshStatus,
    refreshDetailedStatus,
    submitVerification,
    checkMeetsRequirements,
    isVerifiedWith,
    // OAuth
    startOAuthFlow,
    isOAuthVerified,
    disconnectOAuth,
  }

  return (
    <ZKVerificationContext.Provider value={value}>
      {children}
    </ZKVerificationContext.Provider>
  )
}

export function useZKVerification() {
  const context = useContext(ZKVerificationContext)
  if (context === undefined) {
    throw new Error("useZKVerification must be used within a ZKVerificationProvider")
  }
  return context
}

/**
 * Hook to check if a specific social type is verified (any provider)
 */
export function useIsZKVerified(socialType: SocialType): boolean {
  const { status } = useZKVerification()

  switch (socialType) {
    case 'TWITTER':
      return status.twitter
    case 'DISCORD':
      return status.discord
    case 'GITHUB':
      return status.github
    case 'TELEGRAM':
      return status.telegram
    default:
      return false
  }
}

/**
 * Hook to check if verified with a specific provider
 */
export function useIsZKVerifiedWithProvider(provider: ZKProvider, socialType: SocialType): boolean {
  const { isVerifiedWith } = useZKVerification()
  return isVerifiedWith(provider, socialType)
}

/**
 * Hook to get voting weight
 */
export function useZKVotingWeight(): number {
  const { status } = useZKVerification()
  return status.votingWeight
}

/**
 * Hook to get enabled providers
 */
export function useEnabledProviders(): ProviderInfo[] {
  const { providers } = useZKVerification()
  return providers.filter(p => p.enabled)
}

/**
 * Hook to get verification status by provider
 */
export function useProviderVerification(provider: ZKProvider): ProviderVerification | null {
  const { detailedStatus } = useZKVerification()
  return detailedStatus?.byProvider?.[provider] ?? null
}

/**
 * Hook to get OAuth verification status
 */
export function useOAuthVerification(): OAuthVerificationStatus | null {
  const { detailedStatus } = useZKVerification()
  return detailedStatus?.oauth ?? null
}

/**
 * Hook to check if OAuth is available for a social type
 */
export function useIsOAuthAvailable(socialType: SocialType): boolean {
  const { oauthConfig } = useZKVerification()
  return oauthConfig?.enabled && oauthConfig?.availableSocialTypes?.includes(socialType) || false
}
