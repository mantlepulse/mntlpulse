/**
 * Seed script for quest definitions and level thresholds
 * Run with: npx tsx src/scripts/seed-quests.ts
 */

import { db } from '../db/client'
import { questDefinitions, badges, levelThresholds, QuestRequirement } from '../db/schema'

// Badge definitions
const badgeSeeds = [
  {
    slug: 'poll-pioneer',
    name: 'Poll Pioneer',
    description: 'Created your first poll',
    imageUrl: '/badges/poll-pioneer.svg',
    rarity: 'common',
  },
  {
    slug: 'voice-heard',
    name: 'Voice Heard',
    description: 'Received your first vote',
    imageUrl: '/badges/voice-heard.svg',
    rarity: 'common',
  },
  {
    slug: 'reward-pioneer',
    name: 'Reward Pioneer',
    description: 'Funded a poll with rewards',
    imageUrl: '/badges/reward-pioneer.svg',
    rarity: 'rare',
  },
  {
    slug: 'generous-creator',
    name: 'Generous Creator',
    description: 'Distributed rewards to participants',
    imageUrl: '/badges/generous-creator.svg',
    rarity: 'rare',
  },
  {
    slug: 'weekly-pulse',
    name: 'Weekly Pulse',
    description: 'Created 3 polls in a week',
    imageUrl: '/badges/weekly-pulse.svg',
    rarity: 'rare',
  },
  {
    slug: 'vote-magnet',
    name: 'Vote Magnet',
    description: 'Reached 100 total votes on your polls',
    imageUrl: '/badges/vote-magnet.svg',
    rarity: 'epic',
  },
  {
    slug: 'poll-master',
    name: 'Poll Master',
    description: 'Created 10 polls',
    imageUrl: '/badges/poll-master.svg',
    rarity: 'epic',
  },
  {
    slug: 'community-legend',
    name: 'Community Legend',
    description: 'Reached 1000 total votes on your polls',
    imageUrl: '/badges/community-legend.svg',
    rarity: 'legendary',
  },
]

// Level threshold definitions
const levelThresholdSeeds = [
  { level: 1, xpRequired: 0, title: 'Novice' },
  { level: 2, xpRequired: 100, title: 'Apprentice' },
  { level: 3, xpRequired: 300, title: 'Contributor' },
  { level: 4, xpRequired: 600, title: 'Builder' },
  { level: 5, xpRequired: 1000, title: 'Creator' },
  { level: 6, xpRequired: 1500, title: 'Influencer' },
  { level: 7, xpRequired: 2500, title: 'Leader' },
  { level: 8, xpRequired: 4000, title: 'Champion' },
  { level: 9, xpRequired: 6000, title: 'Master' },
  { level: 10, xpRequired: 10000, title: 'Legend' },
]

// Quest definitions (will be linked to badges after insertion)
const questSeeds: Array<{
  slug: string
  name: string
  description: string
  category: 'onboarding' | 'engagement' | 'milestone'
  xpReward: number
  badgeSlug?: string
  isRecurring: boolean
  recurringPeriod?: 'daily' | 'weekly' | 'monthly'
  requirements: QuestRequirement
  displayOrder: number
}> = [
  // Onboarding Quests
  {
    slug: 'first-poll',
    name: 'Poll Pioneer',
    description: 'Create your first poll',
    category: 'onboarding',
    xpReward: 100,
    badgeSlug: 'poll-pioneer',
    isRecurring: false,
    requirements: { type: 'poll_created', target: 1 },
    displayOrder: 1,
  },
  {
    slug: 'first-vote-received',
    name: 'Voice Heard',
    description: 'Get your first vote on a poll',
    category: 'onboarding',
    xpReward: 50,
    badgeSlug: 'voice-heard',
    isRecurring: false,
    requirements: { type: 'vote_received', target: 1 },
    displayOrder: 2,
  },
  {
    slug: 'first-funding',
    name: 'Reward Pioneer',
    description: 'Fund a poll with rewards',
    category: 'onboarding',
    xpReward: 200,
    badgeSlug: 'reward-pioneer',
    isRecurring: false,
    requirements: { type: 'poll_funded', target: 1 },
    displayOrder: 3,
  },
  {
    slug: 'first-distribution',
    name: 'Generous Creator',
    description: 'Distribute rewards to participants',
    category: 'onboarding',
    xpReward: 300,
    badgeSlug: 'generous-creator',
    isRecurring: false,
    requirements: { type: 'rewards_distributed', target: 1 },
    displayOrder: 4,
  },

  // Engagement Quests (Recurring)
  {
    slug: 'weekly-creator',
    name: 'Weekly Pulse',
    description: 'Create 3 polls this week',
    category: 'engagement',
    xpReward: 150,
    badgeSlug: 'weekly-pulse',
    isRecurring: true,
    recurringPeriod: 'weekly',
    requirements: { type: 'poll_created', target: 3, timeframe: 'weekly' },
    displayOrder: 10,
  },
  {
    slug: 'weekly-engagement',
    name: 'Community Builder',
    description: 'Get 50 votes on your polls this week',
    category: 'engagement',
    xpReward: 200,
    isRecurring: true,
    recurringPeriod: 'weekly',
    requirements: { type: 'vote_received', target: 50, timeframe: 'weekly' },
    displayOrder: 11,
  },

  // Milestone Quests
  {
    slug: 'vote-magnet-100',
    name: 'Vote Magnet',
    description: 'Reach 100 total votes on your polls',
    category: 'milestone',
    xpReward: 500,
    badgeSlug: 'vote-magnet',
    isRecurring: false,
    requirements: { type: 'vote_received', target: 100 },
    displayOrder: 20,
  },
  {
    slug: 'poll-master-10',
    name: 'Poll Master',
    description: 'Create 10 polls',
    category: 'milestone',
    xpReward: 300,
    badgeSlug: 'poll-master',
    isRecurring: false,
    requirements: { type: 'poll_created', target: 10 },
    displayOrder: 21,
  },
  {
    slug: 'community-legend-1000',
    name: 'Community Legend',
    description: 'Reach 1000 total votes on your polls',
    category: 'milestone',
    xpReward: 2000,
    badgeSlug: 'community-legend',
    isRecurring: false,
    requirements: { type: 'vote_received', target: 1000 },
    displayOrder: 22,
  },
]

async function seedBadges(): Promise<Map<string, string>> {
  console.log('Seeding badges...')
  const badgeMap = new Map<string, string>()

  for (const badge of badgeSeeds) {
    const [inserted] = await db
      .insert(badges)
      .values(badge)
      .onConflictDoUpdate({
        target: badges.slug,
        set: {
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          rarity: badge.rarity,
        },
      })
      .returning()

    if (inserted) {
      badgeMap.set(badge.slug, inserted.id)
      console.log(`  - ${badge.name} (${badge.rarity})`)
    }
  }

  return badgeMap
}

async function seedLevelThresholds(): Promise<void> {
  console.log('Seeding level thresholds...')

  for (const threshold of levelThresholdSeeds) {
    await db
      .insert(levelThresholds)
      .values(threshold)
      .onConflictDoUpdate({
        target: levelThresholds.level,
        set: {
          xpRequired: threshold.xpRequired,
          title: threshold.title,
        },
      })

    console.log(`  - Level ${threshold.level}: ${threshold.title} (${threshold.xpRequired} XP)`)
  }
}

async function seedQuests(badgeMap: Map<string, string>): Promise<void> {
  console.log('Seeding quest definitions...')

  for (const quest of questSeeds) {
    const badgeId = quest.badgeSlug ? badgeMap.get(quest.badgeSlug) : null

    await db
      .insert(questDefinitions)
      .values({
        slug: quest.slug,
        name: quest.name,
        description: quest.description,
        category: quest.category,
        xpReward: quest.xpReward,
        badgeId: badgeId || null,
        isRecurring: quest.isRecurring,
        recurringPeriod: quest.recurringPeriod || null,
        requirements: quest.requirements,
        displayOrder: quest.displayOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: questDefinitions.slug,
        set: {
          name: quest.name,
          description: quest.description,
          category: quest.category,
          xpReward: quest.xpReward,
          badgeId: badgeId || null,
          isRecurring: quest.isRecurring,
          recurringPeriod: quest.recurringPeriod || null,
          requirements: quest.requirements,
          displayOrder: quest.displayOrder,
        },
      })

    console.log(`  - ${quest.name} (${quest.category}, ${quest.xpReward} XP)`)
  }
}

async function main(): Promise<void> {
  console.log('Starting quest system seed...')
  console.log('')

  try {
    const badgeMap = await seedBadges()
    console.log('')

    await seedLevelThresholds()
    console.log('')

    await seedQuests(badgeMap)
    console.log('')

    console.log('Quest system seed complete!')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
