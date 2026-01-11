'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUserBadges } from '@/hooks/use-badges'
import { Award, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

const rarityColors = {
  common: 'bg-slate-500/10 border-slate-500/30 text-slate-500',
  rare: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  epic: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
  legendary: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
}

const rarityGlow = {
  common: '',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-amber-500/40 shadow-lg',
}

interface BadgeShowcaseProps {
  compact?: boolean
  maxDisplay?: number
}

export function BadgeShowcase({ compact = false, maxDisplay = 8 }: BadgeShowcaseProps) {
  const { data: badges, isLoading, error } = useUserBadges()

  if (error) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Failed to load badges
      </div>
    )
  }

  if (isLoading) {
    return compact ? (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-10 h-10 rounded-full" />
        ))}
      </div>
    ) : (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayBadges = badges?.slice(0, maxDisplay) || []
  const remainingCount = (badges?.length || 0) - maxDisplay

  if (compact) {
    if (displayBadges.length === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>No badges yet</span>
        </div>
      )
    }

    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {displayBadges.map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center',
                    rarityColors[badge.rarity as keyof typeof rarityColors],
                    rarityGlow[badge.rarity as keyof typeof rarityGlow]
                  )}
                >
                  <Award className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              +{remainingCount}
            </div>
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Badges Earned
          <span className="text-muted-foreground font-normal text-sm">
            ({badges?.length || 0})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayBadges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Complete quests to earn badges!</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {displayBadges.map((badge) => (
                <Tooltip key={badge.id}>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        'aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 p-2 transition-all hover:scale-105',
                        rarityColors[badge.rarity as keyof typeof rarityColors],
                        rarityGlow[badge.rarity as keyof typeof rarityGlow]
                      )}
                    >
                      <Award className="w-6 h-6" />
                      <span className="text-xs font-medium truncate w-full text-center">
                        {badge.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                      <p className="text-xs capitalize">
                        Rarity: <span className="font-medium">{badge.rarity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
