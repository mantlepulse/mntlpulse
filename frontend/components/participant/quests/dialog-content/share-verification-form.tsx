'use client'

/**
 * Share Verification Form Component
 * Form for users to submit proof of sharing a poll
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Twitter,
  Facebook,
  Linkedin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'

// Farcaster icon (custom)
const FarcasterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.24 2H5.76A3.76 3.76 0 002 5.76v12.48A3.76 3.76 0 005.76 22h12.48A3.76 3.76 0 0022 18.24V5.76A3.76 3.76 0 0018.24 2zm-1.2 15.2h-2.4v-4.8h-5.28v4.8H7v-10.4h2.4v3.6h5.28v-3.6h2.4v10.4z" />
  </svg>
)

export type SharePlatform = 'twitter' | 'facebook' | 'linkedin' | 'farcaster'

interface SharePlatformConfig {
  id: SharePlatform
  name: string
  icon: React.ReactNode
  color: string
  shareUrl: (url: string, text: string) => string
  urlPattern: RegExp
  urlHint: string
}

const platforms: SharePlatformConfig[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: <Twitter className="w-5 h-5" />,
    color: 'hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/50',
    shareUrl: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    urlPattern: /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/,
    urlHint: 'e.g., https://twitter.com/user/status/123...',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'hover:bg-blue-600/10 hover:text-blue-600 hover:border-blue-600/50',
    shareUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    urlPattern: /^https?:\/\/(www\.)?facebook\.com\/.+/,
    urlHint: 'e.g., https://facebook.com/user/posts/123...',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'hover:bg-blue-700/10 hover:text-blue-700 hover:border-blue-700/50',
    shareUrl: (url, text) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    urlPattern: /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update)\/.+/,
    urlHint: 'e.g., https://linkedin.com/posts/...',
  },
  {
    id: 'farcaster',
    name: 'Farcaster',
    icon: <FarcasterIcon className="w-5 h-5" />,
    color: 'hover:bg-purple-600/10 hover:text-purple-600 hover:border-purple-600/50',
    shareUrl: (url, text) =>
      `https://warpcast.com/~/compose?text=${encodeURIComponent(text + ' ' + url)}`,
    urlPattern: /^https?:\/\/warpcast\.com\/\w+\/0x[a-f0-9]+/,
    urlHint: 'e.g., https://warpcast.com/user/0x123...',
  },
]

interface ShareVerificationFormProps {
  pollUrl: string
  pollTitle: string
  onSubmit: (platform: SharePlatform, shareUrl: string) => Promise<void>
  isSubmitting?: boolean
}

export function ShareVerificationForm({
  pollUrl,
  pollTitle,
  onSubmit,
  isSubmitting = false,
}: ShareVerificationFormProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<SharePlatform | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasShared, setHasShared] = useState(false)

  const selectedPlatformConfig = platforms.find(p => p.id === selectedPlatform)

  const handlePlatformClick = (platform: SharePlatformConfig) => {
    setSelectedPlatform(platform.id)
    setError(null)
    setShareUrl('')
  }

  const handleShareClick = (platform: SharePlatformConfig) => {
    const shareText = `Check out this poll: ${pollTitle}`
    const url = platform.shareUrl(pollUrl, shareText)
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
    setHasShared(true)
    setSelectedPlatform(platform.id)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const validateUrl = (url: string): boolean => {
    if (!selectedPlatformConfig) return false
    return selectedPlatformConfig.urlPattern.test(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedPlatform) {
      setError('Please select a platform')
      return
    }

    if (!shareUrl.trim()) {
      setError('Please enter your share URL')
      return
    }

    if (!validateUrl(shareUrl)) {
      setError(`Invalid URL format for ${selectedPlatformConfig?.name}. ${selectedPlatformConfig?.urlHint}`)
      return
    }

    try {
      await onSubmit(selectedPlatform, shareUrl)
    } catch (err) {
      setError('Failed to submit. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Share the Poll */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            Share the Poll
          </CardTitle>
          <CardDescription>
            Choose a platform to share the poll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Poll Link */}
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate flex-1">
              {pollUrl}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Platform Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((platform) => (
              <Button
                key={platform.id}
                variant="outline"
                className={`justify-start gap-2 ${platform.color} ${
                  selectedPlatform === platform.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleShareClick(platform)}
              >
                {platform.icon}
                <span className="flex-1 text-left">{platform.name}</span>
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Submit Proof */}
      <Card className={!hasShared ? 'opacity-50' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            Submit Your Share Link
          </CardTitle>
          <CardDescription>
            Paste the URL of your shared post for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Platform used</Label>
              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <Button
                    key={platform.id}
                    type="button"
                    variant={selectedPlatform === platform.id ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                    onClick={() => handlePlatformClick(platform)}
                    disabled={!hasShared}
                  >
                    {platform.icon}
                    {platform.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="share-url">Share URL</Label>
              <Input
                id="share-url"
                placeholder={selectedPlatformConfig?.urlHint || 'Paste your share URL here...'}
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                disabled={!selectedPlatform || !hasShared}
              />
              {selectedPlatformConfig && (
                <p className="text-xs text-muted-foreground">
                  {selectedPlatformConfig.urlHint}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!selectedPlatform || !shareUrl || isSubmitting || !hasShared}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
