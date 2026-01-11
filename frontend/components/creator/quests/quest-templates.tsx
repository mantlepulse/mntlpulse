'use client'

/**
 * Quest Templates Component
 * Predefined quest templates for quick quest creation
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Vote,
  Users,
  Trophy,
  Zap,
  Target,
  Share2,
  TrendingUp,
  Award,
  Sparkles,
  Clock,
} from 'lucide-react'
import { CreatorQuestType, CreatorQuestRequirementType } from '@/lib/api/creator-quests-client'

export interface QuestTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'engagement' | 'growth' | 'loyalty' | 'special'
  questType: CreatorQuestType
  requirementType: CreatorQuestRequirementType
  requirementTarget: number
  pointsReward: number
  maxCompletions?: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export const questTemplates: QuestTemplate[] = [
  // Engagement Templates
  {
    id: 'first-vote',
    name: 'First Vote',
    description: 'Reward users for casting their first vote on any of your polls',
    icon: <Vote className="w-5 h-5" />,
    category: 'engagement',
    questType: 'participation',
    requirementType: 'vote_on_polls',
    requirementTarget: 1,
    pointsReward: 10,
    difficulty: 'easy',
  },
  {
    id: 'active-voter',
    name: 'Active Voter',
    description: 'Encourage users to vote on 5 different polls',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'engagement',
    questType: 'participation',
    requirementType: 'vote_on_polls',
    requirementTarget: 5,
    pointsReward: 50,
    difficulty: 'medium',
  },
  {
    id: 'poll-enthusiast',
    name: 'Poll Enthusiast',
    description: 'For dedicated participants who vote on 10 polls',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'engagement',
    questType: 'participation',
    requirementType: 'vote_on_polls',
    requirementTarget: 10,
    pointsReward: 100,
    difficulty: 'hard',
  },
  {
    id: 'super-voter',
    name: 'Super Voter',
    description: 'Ultimate engagement quest - vote on 25 polls',
    icon: <Award className="w-5 h-5" />,
    category: 'engagement',
    questType: 'participation',
    requirementType: 'vote_on_polls',
    requirementTarget: 25,
    pointsReward: 250,
    difficulty: 'hard',
  },
  // Growth Templates
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Be among the first 10 voters on a poll',
    icon: <Clock className="w-5 h-5" />,
    category: 'growth',
    questType: 'engagement_goal',
    requirementType: 'first_n_voters',
    requirementTarget: 10,
    pointsReward: 25,
    maxCompletions: 10,
    difficulty: 'medium',
  },
  {
    id: 'first-50',
    name: 'First 50 Club',
    description: 'Exclusive reward for the first 50 voters',
    icon: <Trophy className="w-5 h-5" />,
    category: 'growth',
    questType: 'engagement_goal',
    requirementType: 'first_n_voters',
    requirementTarget: 50,
    pointsReward: 75,
    maxCompletions: 50,
    difficulty: 'medium',
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Be among the first 100 participants',
    icon: <Users className="w-5 h-5" />,
    category: 'growth',
    questType: 'engagement_goal',
    requirementType: 'first_n_voters',
    requirementTarget: 100,
    pointsReward: 50,
    maxCompletions: 100,
    difficulty: 'easy',
  },
  // Loyalty Templates
  {
    id: 'community-builder',
    name: 'Community Builder',
    description: 'Share a poll to help grow the community',
    icon: <Share2 className="w-5 h-5" />,
    category: 'loyalty',
    questType: 'participation',
    requirementType: 'share_poll',
    requirementTarget: 1,
    pointsReward: 20,
    difficulty: 'easy',
  },
  {
    id: 'social-champion',
    name: 'Social Champion',
    description: 'Share 5 polls across social platforms',
    icon: <Zap className="w-5 h-5" />,
    category: 'loyalty',
    questType: 'participation',
    requirementType: 'share_poll',
    requirementTarget: 5,
    pointsReward: 100,
    difficulty: 'medium',
  },
  // Special Templates
  {
    id: 'poll-explorer',
    name: 'Poll Explorer',
    description: 'Participate in 3 different polls to explore the platform',
    icon: <Target className="w-5 h-5" />,
    category: 'special',
    questType: 'participation',
    requirementType: 'participate_n_polls',
    requirementTarget: 3,
    pointsReward: 30,
    difficulty: 'easy',
  },
  {
    id: 'dedicated-participant',
    name: 'Dedicated Participant',
    description: 'Engage with 10 different polls',
    icon: <Award className="w-5 h-5" />,
    category: 'special',
    questType: 'participation',
    requirementType: 'participate_n_polls',
    requirementTarget: 10,
    pointsReward: 150,
    difficulty: 'hard',
  },
]

const categoryLabels: Record<string, { label: string; color: string }> = {
  engagement: { label: 'Engagement', color: 'bg-blue-500/10 text-blue-500' },
  growth: { label: 'Growth', color: 'bg-green-500/10 text-green-500' },
  loyalty: { label: 'Loyalty', color: 'bg-purple-500/10 text-purple-500' },
  special: { label: 'Special', color: 'bg-amber-500/10 text-amber-500' },
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-green-500/10 text-green-600' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-600' },
  hard: { label: 'Hard', color: 'bg-red-500/10 text-red-600' },
}

interface QuestTemplatesProps {
  onSelectTemplate: (template: QuestTemplate) => void
  selectedTemplateId?: string
}

export function QuestTemplates({ onSelectTemplate, selectedTemplateId }: QuestTemplatesProps) {
  const categories = ['engagement', 'growth', 'loyalty', 'special'] as const

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const templatesInCategory = questTemplates.filter((t) => t.category === category)
        if (templatesInCategory.length === 0) return null

        return (
          <div key={category}>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Badge className={`${categoryLabels[category].color} border-0`}>
                {categoryLabels[category].label}
              </Badge>
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {templatesInCategory.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplateId === template.id ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                  onClick={() => onSelectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          <Badge className={`${difficultyLabels[template.difficulty].color} border-0 text-xs`}>
                            {difficultyLabels[template.difficulty].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            {template.pointsReward} pts
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Target: {template.requirementTarget}
                          </span>
                          {template.maxCompletions && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Max: {template.maxCompletions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface QuestTemplateSelectorProps {
  onSelectTemplate: (template: QuestTemplate) => void
  onSkip: () => void
}

export function QuestTemplateSelector({ onSelectTemplate, onSkip }: QuestTemplateSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Start from a Template
        </CardTitle>
        <CardDescription>
          Choose a template to quickly create a quest, or start from scratch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuestTemplates onSelectTemplate={onSelectTemplate} />
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onSkip} className="w-full">
            Start from Scratch
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
