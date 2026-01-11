/**
 * ZK Verification Panel
 * Multi-provider panel for managing ZK social account verifications
 * Supports: Reclaim Protocol, Polygon ID, zkPass, World ID
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ShieldCheck,
  ShieldX,
  Twitter,
  MessageCircle,
  Github,
  Send,
  Lock,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  Fingerprint,
  Globe,
  Sparkles,
} from "lucide-react"
import {
  useZKVerification,
  SocialType,
  ZKProvider,
  ZK_PROVIDER_NAMES,
  ZK_PROVIDERS,
  VERIFICATION_TYPE_NAMES,
  ProviderInfo,
} from "@/contexts/zk-verification-context"
import { useIsPremiumOrStaked } from "@/lib/contracts/premium-contract-utils"
import { useAccount } from "wagmi"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface SocialConfig {
  type: SocialType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const SOCIAL_CONFIG: SocialConfig[] = [
  {
    type: 'TWITTER',
    label: 'Twitter/X',
    icon: Twitter,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  {
    type: 'DISCORD',
    label: 'Discord',
    icon: MessageCircle,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    type: 'GITHUB',
    label: 'GitHub',
    icon: Github,
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-500/10',
  },
  {
    type: 'TELEGRAM',
    label: 'Telegram',
    icon: Send,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
]

interface ProviderConfig {
  provider: ZKProvider
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  description: string
}

const PROVIDER_CONFIG: Record<ZKProvider, ProviderConfig> = {
  RECLAIM: {
    provider: 'RECLAIM',
    icon: Fingerprint,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Verify using web2 credentials via Reclaim Protocol',
  },
  POLYGON_ID: {
    provider: 'POLYGON_ID',
    icon: ShieldCheck,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    description: 'Verify using Polygon ID verifiable credentials',
  },
  ZKPASS: {
    provider: 'ZKPASS',
    icon: Globe,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: 'Verify using zkPass attestations',
  },
  WORLD_ID: {
    provider: 'WORLD_ID',
    icon: Sparkles,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    description: 'Verify your unique human identity with World ID',
  },
}

interface ZKVerificationPanelProps {
  className?: string
  onVerificationComplete?: () => void
}

export function ZKVerificationPanel({
  className,
  onVerificationComplete,
}: ZKVerificationPanelProps) {
  const { address } = useAccount()
  const {
    isEnabled,
    status,
    detailedStatus,
    providers,
    oauthConfig,
    canAccessZKFeatures,
    submitVerification,
    refreshStatus,
    isVerifiedWith,
    startOAuthFlow,
    isOAuthVerified,
    disconnectOAuth,
  } = useZKVerification()
  const { data: isPremium, isLoading: isPremiumLoading } = useIsPremiumOrStaked(address)
  const [selectedProvider, setSelectedProvider] = useState<ZKProvider>('RECLAIM')
  const [verifyingType, setVerifyingType] = useState<SocialType | null>(null)
  const [connectingType, setConnectingType] = useState<SocialType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'zk' | 'oauth'>('overview')

  // Filter enabled providers
  const enabledProviders = providers.filter(p => p.enabled)

  // Don't render if feature is disabled
  if (!isEnabled) {
    return null
  }

  const handleVerify = async (socialType: SocialType) => {
    setError(null)
    setVerifyingType(socialType)

    try {
      // This is where you'd integrate with the selected ZK provider
      // The placeholder shows instructions for integration
      const providerName = ZK_PROVIDER_NAMES[selectedProvider]
      setError(
        `To verify ${SOCIAL_CONFIG.find(s => s.type === socialType)?.label} with ${providerName}, ` +
        `integrate the ${providerName} SDK and call submitVerification() with the proof nullifier.`
      )
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifyingType(null)
    }
  }

  const handleOAuthConnect = async (socialType: SocialType) => {
    setError(null)
    setConnectingType(socialType)

    try {
      const authUrl = await startOAuthFlow(socialType)
      if (authUrl) {
        // Redirect to OAuth provider
        window.location.href = authUrl
      } else {
        setError(`OAuth is not available for ${SOCIAL_CONFIG.find(s => s.type === socialType)?.label}`)
      }
    } catch (err) {
      setError('Failed to start connection. Please try again.')
    } finally {
      setConnectingType(null)
    }
  }

  const handleOAuthDisconnect = async (socialType: SocialType) => {
    setError(null)
    setConnectingType(socialType)

    try {
      const success = await disconnectOAuth(socialType)
      if (!success) {
        setError('Failed to disconnect account.')
      }
    } catch (err) {
      setError('Failed to disconnect. Please try again.')
    } finally {
      setConnectingType(null)
    }
  }

  const isTypeVerified = (type: SocialType): boolean => {
    return status[type.toLowerCase() as keyof typeof status] as boolean
  }

  const isTypeVerifiedWithProvider = (type: SocialType, provider: ZKProvider): boolean => {
    return isVerifiedWith(provider, type)
  }

  const getVerificationProviders = (type: SocialType): ZKProvider[] => {
    if (!detailedStatus?.byProvider) return []

    return ZK_PROVIDERS.filter(provider => {
      const providerData = detailedStatus.byProvider[provider]
      const socialKey = type.toLowerCase() as keyof typeof providerData
      return providerData[socialKey] as boolean
    })
  }

  const providerConfig = PROVIDER_CONFIG[selectedProvider]
  const ProviderIcon = providerConfig?.icon

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Identity Verification
          <Badge variant="secondary" className="ml-2">Beta</Badge>
        </CardTitle>
        <CardDescription>
          Verify your social accounts using ZK proofs or OAuth connection.
          Choose your preferred method - no personal data is stored.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Premium Gate */}
        {!isPremiumLoading && !isPremium ? (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                ZK verification is a premium feature. Subscribe or stake PULSE to unlock.
              </span>
              <Link href="/participant/membership">
                <Button variant="outline" size="sm">
                  Get Premium
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Error Alert */}
            {(error || status.error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || status.error}</AlertDescription>
              </Alert>
            )}

            {/* Tabs for Overview, ZK Verification, and OAuth Connection */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'zk' | 'oauth')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="zk">ZK Verify</TabsTrigger>
                <TabsTrigger value="oauth">Connect Accounts</TabsTrigger>
              </TabsList>

              {/* Overview Tab - Shows all verifications */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SOCIAL_CONFIG.map(({ type, label, icon: Icon, color, bgColor }) => {
                    const zkVerified = isTypeVerified(type)
                    const oauthVerified = isOAuthVerified(type)
                    const verified = zkVerified || oauthVerified
                    const verifiedProviders = getVerificationProviders(type)

                    const getStatusText = () => {
                      const methods: string[] = []
                      if (oauthVerified) methods.push('OAuth')
                      if (zkVerified && verifiedProviders.length > 0) {
                        methods.push(`${verifiedProviders.length} ZK provider(s)`)
                      }
                      if (methods.length === 0) return 'Not verified'
                      return `Verified via ${methods.join(' + ')}`
                    }

                    return (
                      <div
                        key={type}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          verified
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-border"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", bgColor)}>
                              <Icon className={cn("h-5 w-5", color)} />
                            </div>
                            <div>
                              <p className="font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">
                                {verified ? (
                                  <span className="text-emerald-600">
                                    {getStatusText()}
                                  </span>
                                ) : (
                                  'Not verified'
                                )}
                              </p>
                            </div>
                          </div>

                          {verified && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">Verification methods:</p>
                                  <ul className="text-xs mt-1">
                                    {oauthVerified && <li>• OAuth (Social Login)</li>}
                                    {verifiedProviders.map(p => (
                                      <li key={p}>• ZK: {ZK_PROVIDER_NAMES[p]}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* ZK Provider Tab - Verify with specific provider */}
              <TabsContent value="zk" className="space-y-4 mt-4">
                {/* Provider Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select ZK Provider</label>
                  <Select
                    value={selectedProvider}
                    onValueChange={(v) => setSelectedProvider(v as ZKProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZK_PROVIDERS.map((provider) => {
                        const config = PROVIDER_CONFIG[provider]
                        const providerInfo = providers.find(p => p.provider === provider)
                        const isDisabled = providerInfo && !providerInfo.enabled

                        return (
                          <SelectItem
                            key={provider}
                            value={provider}
                            disabled={isDisabled}
                          >
                            <div className="flex items-center gap-2">
                              <config.icon className={cn("h-4 w-4", config.color)} />
                              <span>{ZK_PROVIDER_NAMES[provider]}</span>
                              {isDisabled && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Coming soon
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider Info */}
                <div className={cn("p-3 rounded-lg border flex items-start gap-3", providerConfig?.bgColor)}>
                  {ProviderIcon && <ProviderIcon className={cn("h-5 w-5 mt-0.5", providerConfig?.color)} />}
                  <div>
                    <p className="text-sm font-medium">{ZK_PROVIDER_NAMES[selectedProvider]}</p>
                    <p className="text-xs text-muted-foreground">{providerConfig?.description}</p>
                  </div>
                </div>

                {/* Social Verification Grid for Selected Provider */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SOCIAL_CONFIG.map(({ type, label, icon: Icon, color, bgColor }) => {
                    const verifiedWithProvider = isTypeVerifiedWithProvider(type, selectedProvider)
                    const verifiedAny = isTypeVerified(type)
                    const isVerifying = verifyingType === type

                    return (
                      <div
                        key={type}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          verifiedWithProvider
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : verifiedAny
                            ? "border-yellow-500/30 bg-yellow-500/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", bgColor)}>
                              <Icon className={cn("h-5 w-5", color)} />
                            </div>
                            <div>
                              <p className="font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">
                                {verifiedWithProvider
                                  ? `Verified with ${ZK_PROVIDER_NAMES[selectedProvider]}`
                                  : verifiedAny
                                  ? 'Verified with other provider'
                                  : 'Not verified'}
                              </p>
                            </div>
                          </div>

                          {verifiedWithProvider ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerify(type)}
                              disabled={isVerifying || status.isLoading}
                            >
                              {isVerifying ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* OAuth Tab - Connect social accounts */}
              <TabsContent value="oauth" className="space-y-4 mt-4">
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-sm">
                    Connect your social accounts directly via OAuth. This is simpler than ZK verification
                    but still provides the same benefits without storing your personal data.
                  </AlertDescription>
                </Alert>

                {/* OAuth availability check */}
                {!oauthConfig?.enabled ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      OAuth connections are currently disabled.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SOCIAL_CONFIG.map(({ type, label, icon: Icon, color, bgColor }) => {
                      const oauthVerified = isOAuthVerified(type)
                      const zkVerified = isTypeVerified(type)
                      const isConnecting = connectingType === type
                      const isOAuthAvailable = oauthConfig?.socialTypes?.[type] || false

                      return (
                        <div
                          key={type}
                          className={cn(
                            "p-4 rounded-lg border transition-all",
                            oauthVerified
                              ? "border-emerald-500/50 bg-emerald-500/5"
                              : zkVerified
                              ? "border-yellow-500/30 bg-yellow-500/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", bgColor)}>
                                <Icon className={cn("h-5 w-5", color)} />
                              </div>
                              <div>
                                <p className="font-medium">{label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {oauthVerified
                                    ? 'Connected via OAuth'
                                    : zkVerified
                                    ? 'Verified via ZK'
                                    : isOAuthAvailable
                                    ? 'Click to connect'
                                    : 'Not available'}
                                </p>
                              </div>
                            </div>

                            {oauthVerified ? (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOAuthDisconnect(type)}
                                  disabled={isConnecting}
                                  className="text-destructive hover:text-destructive"
                                >
                                  {isConnecting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'Disconnect'
                                  )}
                                </Button>
                              </div>
                            ) : zkVerified ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge
                                      variant="outline"
                                      className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      ZK Verified
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Already verified via ZK proof</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : isOAuthAvailable ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOAuthConnect(type)}
                                disabled={isConnecting || status.isLoading}
                              >
                                {isConnecting ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Connect
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Coming soon
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Voting Weight Display */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-lg border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Voting Weight</p>
                  <p className="text-xs text-muted-foreground">
                    +1x weight for each unique verified social account
                  </p>
                </div>
                <div className="text-3xl font-bold text-emerald-600">
                  {status.votingWeight}x
                </div>
              </div>

              {/* Progress indicator */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Unique Social Verifications</span>
                  <span>{status.verificationCount} / 4</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all"
                    style={{ width: `${(status.verificationCount / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Provider Legend */}
            <div className="flex flex-wrap gap-2">
              {ZK_PROVIDERS.map((provider) => {
                const config = PROVIDER_CONFIG[provider]
                const providerInfo = providers.find(p => p.provider === provider)
                const isDisabled = providerInfo && !providerInfo.enabled

                return (
                  <TooltipProvider key={provider}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1",
                            isDisabled ? "opacity-50" : config.bgColor
                          )}
                        >
                          <config.icon className={cn("h-3 w-3", config.color)} />
                          {ZK_PROVIDER_NAMES[provider]}
                          {isDisabled && " (Soon)"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{config.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>

            {/* Benefits */}
            <div className="text-sm space-y-2">
              <p className="font-medium">Benefits of verification:</p>
              <ul className="text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Increased voting power ({status.votingWeight}x multiplier)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Access to ZK-protected polls
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Verified badge on profile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Reward eligibility for participating
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-3 w-3 text-blue-500" />
                  Multiple providers supported for flexibility
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact version for sidebars or smaller spaces
 */
export function ZKVerificationCompact({ className }: { className?: string }) {
  const { isEnabled, status, detailedStatus, canAccessZKFeatures, isOAuthVerified } = useZKVerification()

  if (!isEnabled) return null

  // Count OAuth verifications
  const oauthCount = SOCIAL_CONFIG.filter(s => isOAuthVerified(s.type)).length

  const isVerified = status.verificationCount > 0 || oauthCount > 0
  const totalVerified = Math.max(status.verificationCount, oauthCount)

  // Count ZK provider verifications
  const zkProviderCount = detailedStatus?.byProvider
    ? Object.values(detailedStatus.byProvider).filter(p => p.verificationCount > 0).length
    : 0

  const getStatusText = () => {
    const parts: string[] = []
    if (zkProviderCount > 0) parts.push(`${zkProviderCount} ZK provider(s)`)
    if (oauthCount > 0) parts.push(`${oauthCount} OAuth`)
    return parts.length > 0 ? parts.join(' • ') : ''
  }

  return (
    <div className={cn("p-4 rounded-lg border", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isVerified ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldX className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Identity Verification</p>
            <p className="text-xs text-muted-foreground">
              {isVerified
                ? `${totalVerified}/4 verified • ${getStatusText()}`
                : canAccessZKFeatures
                ? 'Not verified'
                : 'Premium required'
              }
            </p>
          </div>
        </div>
        {isVerified && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
            {status.votingWeight}x
          </Badge>
        )}
      </div>
    </div>
  )
}

/**
 * Provider selector component for poll creation
 */
interface ProviderSelectorProps {
  selectedProviders: ZKProvider[]
  onChange: (providers: ZKProvider[]) => void
  className?: string
}

export function ZKProviderSelector({
  selectedProviders,
  onChange,
  className,
}: ProviderSelectorProps) {
  const { providers } = useZKVerification()

  const toggleProvider = (provider: ZKProvider) => {
    if (selectedProviders.includes(provider)) {
      onChange(selectedProviders.filter(p => p !== provider))
    } else {
      onChange([...selectedProviders, provider])
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">Accepted ZK Providers</label>
      <p className="text-xs text-muted-foreground">
        Select which ZK providers participants can use to verify
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {ZK_PROVIDERS.map((provider) => {
          const config = PROVIDER_CONFIG[provider]
          const isSelected = selectedProviders.includes(provider)
          const providerInfo = providers.find(p => p.provider === provider)
          const isDisabled = providerInfo && !providerInfo.enabled

          return (
            <Button
              key={provider}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => toggleProvider(provider)}
              disabled={isDisabled}
              className={cn(
                "gap-1",
                isSelected && config.bgColor
              )}
            >
              <config.icon className={cn("h-3 w-3", isSelected ? "" : config.color)} />
              {ZK_PROVIDER_NAMES[provider]}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Social type selector component for poll creation
 */
interface SocialTypeSelectorProps {
  selectedTypes: SocialType[]
  onChange: (types: SocialType[]) => void
  className?: string
}

export function ZKSocialTypeSelector({
  selectedTypes,
  onChange,
  className,
}: SocialTypeSelectorProps) {
  const toggleType = (type: SocialType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type))
    } else {
      onChange([...selectedTypes, type])
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">Required Social Verifications</label>
      <p className="text-xs text-muted-foreground">
        Select which social accounts participants must verify
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {SOCIAL_CONFIG.map(({ type, label, icon: Icon, color, bgColor }) => {
          const isSelected = selectedTypes.includes(type)

          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => toggleType(type)}
              className={cn(
                "gap-1",
                isSelected && bgColor
              )}
            >
              <Icon className={cn("h-3 w-3", isSelected ? "" : color)} />
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
