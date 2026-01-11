'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { QuestCard } from './quest-card'
import { useQuestsByCategory } from '@/hooks/use-quests'
import { Target, Zap, Trophy, ListTodo } from 'lucide-react'

export function QuestList() {
  const { data: questsByCategory, isLoading, error } = useQuestsByCategory()
  const [activeTab, setActiveTab] = useState('all')

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load quests. Please try again.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  const onboardingQuests = questsByCategory?.onboarding || []
  const engagementQuests = questsByCategory?.engagement || []
  const milestoneQuests = questsByCategory?.milestone || []
  const allQuests = [...onboardingQuests, ...engagementQuests, ...milestoneQuests]

  const tabs = [
    {
      id: 'all',
      label: 'All Quests',
      icon: ListTodo,
      quests: allQuests,
      count: allQuests.length,
    },
    {
      id: 'onboarding',
      label: 'Getting Started',
      icon: Target,
      quests: onboardingQuests,
      count: onboardingQuests.length,
    },
    {
      id: 'engagement',
      label: 'Weekly',
      icon: Zap,
      quests: engagementQuests,
      count: engagementQuests.length,
    },
    {
      id: 'milestone',
      label: 'Milestones',
      icon: Trophy,
      quests: milestoneQuests,
      count: milestoneQuests.length,
    },
  ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex items-center gap-2"
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="text-xs text-muted-foreground">({tab.count})</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.quests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quests available in this category.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tab.quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  showCategory={tab.id === 'all'}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
