'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Trophy, Target, Zap } from 'lucide-react'
import { QuestWithProgress } from '@/lib/api/quests-client'
import { cn } from '@/lib/utils'

interface QuestCardProps {
  quest: QuestWithProgress
  showCategory?: boolean
}

const categoryIcons = {
  onboarding: Target,
  engagement: Zap,
  milestone: Trophy,
}

const categoryColors = {
  onboarding: 'bg-blue-500/10 text-blue-500',
  engagement: 'bg-purple-500/10 text-purple-500',
  milestone: 'bg-amber-500/10 text-amber-500',
}

export function QuestCard({ quest, showCategory = false }: QuestCardProps) {
  const progress = quest.userProgress?.progress || 0
  const target = quest.userProgress?.target || quest.requirements.target
  const isCompleted = quest.userProgress?.isCompleted || false
  const progressPercentage = Math.min(100, (progress / target) * 100)

  const CategoryIcon = categoryIcons[quest.category as keyof typeof categoryIcons] || Target

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isCompleted && 'bg-muted/50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              isCompleted
                ? 'bg-green-500/10 text-green-500'
                : categoryColors[quest.category as keyof typeof categoryColors]
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <CategoryIcon className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{quest.name}</h4>
              {showCategory && (
                <Badge variant="outline" className="text-xs capitalize">
                  {quest.category}
                </Badge>
              )}
              {quest.isRecurring && (
                <Badge variant="secondary" className="text-xs">
                  {quest.recurringPeriod}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {quest.description}
            </p>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {progress} / {target}
                </span>
                <span className="font-medium text-primary">+{quest.xpReward} XP</span>
              </div>
              <Progress
                value={progressPercentage}
                className={cn('h-2', isCompleted && 'bg-green-500/20')}
              />
            </div>

            {/* Completed badge */}
            {isCompleted && quest.userProgress?.completedAt && (
              <p className="text-xs text-green-600 mt-2">
                Completed{' '}
                {new Date(quest.userProgress.completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
