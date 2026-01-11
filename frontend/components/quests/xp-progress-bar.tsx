'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useLevelProgress, useUserLevel } from '@/hooks/use-user-level'
import { Star, TrendingUp } from 'lucide-react'

interface XpProgressBarProps {
  compact?: boolean
}

export function XpProgressBar({ compact = false }: XpProgressBarProps) {
  const { data: userLevel, isLoading } = useUserLevel()
  const levelProgress = useLevelProgress()

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-12 w-full" />
    ) : (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">Level {levelProgress.level}</div>
            <div className="text-xs text-muted-foreground">{levelProgress.title}</div>
          </div>
        </div>
        <div className="flex-1">
          <Progress value={levelProgress.percentage} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {levelProgress.currentXp} / {levelProgress.requiredXp} XP
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Level {levelProgress.level}</h3>
              <p className="text-muted-foreground">{levelProgress.title}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">{userLevel?.totalXp || 0} XP</span>
            </div>
            <p className="text-sm text-muted-foreground">Total earned</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Level {levelProgress.level + 1}</span>
            <span className="font-medium">
              {levelProgress.currentXp} / {levelProgress.requiredXp} XP
            </span>
          </div>
          <Progress value={levelProgress.percentage} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.max(0, levelProgress.requiredXp - levelProgress.currentXp)} XP until next level
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
