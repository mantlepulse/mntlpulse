/**
 * Quests Service
 * Manages quest progress, badges, and user levels
 */

import { db } from '../db/client'
import {
  questDefinitions,
  userQuests,
  badges,
  userBadges,
  userLevels,
  levelThresholds,
  leaderboard,
  QuestRequirement,
} from '../db/schema'
import { eq, desc, and, isNull, sql, asc } from 'drizzle-orm'
import { Address } from 'viem'

export class QuestsService {
  /**
   * Get all active quest definitions
   */
  async getAllQuests() {
    return db
      .select()
      .from(questDefinitions)
      .where(eq(questDefinitions.isActive, true))
      .orderBy(asc(questDefinitions.displayOrder))
  }

  /**
   * Get quests by category
   */
  async getQuestsByCategory(category: string) {
    return db
      .select()
      .from(questDefinitions)
      .where(
        and(
          eq(questDefinitions.isActive, true),
          eq(questDefinitions.category, category)
        )
      )
      .orderBy(asc(questDefinitions.displayOrder))
  }

  /**
   * Get user's quest progress for all quests
   */
  async getUserQuestProgress(address: Address) {
    const normalizedAddress = address.toLowerCase()

    // Get all active quests with user's progress
    const quests = await db
      .select({
        quest: questDefinitions,
        progress: userQuests,
      })
      .from(questDefinitions)
      .leftJoin(
        userQuests,
        and(
          eq(userQuests.questId, questDefinitions.id),
          eq(userQuests.address, normalizedAddress)
        )
      )
      .where(eq(questDefinitions.isActive, true))
      .orderBy(asc(questDefinitions.displayOrder))

    return quests.map(({ quest, progress }) => ({
      ...quest,
      userProgress: progress
        ? {
            progress: progress.progress,
            target: progress.target,
            isCompleted: progress.isCompleted,
            completedAt: progress.completedAt,
          }
        : null,
    }))
  }

  /**
   * Get user's active (uncompleted) quests
   */
  async getActiveQuests(address: Address) {
    const normalizedAddress = address.toLowerCase()

    const quests = await db
      .select({
        quest: questDefinitions,
        progress: userQuests,
      })
      .from(questDefinitions)
      .leftJoin(
        userQuests,
        and(
          eq(userQuests.questId, questDefinitions.id),
          eq(userQuests.address, normalizedAddress)
        )
      )
      .where(eq(questDefinitions.isActive, true))
      .orderBy(asc(questDefinitions.displayOrder))

    // Filter to only uncompleted quests
    return quests
      .filter(({ progress }) => !progress?.isCompleted)
      .map(({ quest, progress }) => ({
        ...quest,
        userProgress: progress
          ? {
              progress: progress.progress,
              target: progress.target,
            }
          : null,
      }))
  }

  /**
   * Get user's completed quests
   */
  async getCompletedQuests(address: Address) {
    const normalizedAddress = address.toLowerCase()

    return db
      .select({
        quest: questDefinitions,
        progress: userQuests,
      })
      .from(userQuests)
      .innerJoin(questDefinitions, eq(questDefinitions.id, userQuests.questId))
      .where(
        and(
          eq(userQuests.address, normalizedAddress),
          eq(userQuests.isCompleted, true)
        )
      )
      .orderBy(desc(userQuests.completedAt))
  }

  /**
   * Check and update quest progress for a user
   * This is called when blockchain events occur
   */
  async checkProgress(address: Address): Promise<{
    questsCompleted: string[]
    xpEarned: number
    badgesEarned: string[]
  }> {
    const normalizedAddress = address.toLowerCase()

    // Get user's current stats from leaderboard
    const [stats] = await db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.address, normalizedAddress))
      .limit(1)

    if (!stats) {
      return { questsCompleted: [], xpEarned: 0, badgesEarned: [] }
    }

    // Get all active quests
    const activeQuests = await db
      .select()
      .from(questDefinitions)
      .where(eq(questDefinitions.isActive, true))

    const questsCompleted: string[] = []
    let xpEarned = 0
    const badgesEarned: string[] = []

    for (const quest of activeQuests) {
      const requirement = quest.requirements as QuestRequirement

      // Calculate current progress based on requirement type
      let currentProgress = 0
      switch (requirement.type) {
        case 'poll_created':
          currentProgress = stats.pollsCreated
          break
        case 'vote_received':
          currentProgress = stats.totalVotes
          break
        case 'polls_participated':
          currentProgress = stats.pollsParticipated
          break
        // Add more types as needed
        default:
          continue
      }

      // Get or create user quest progress
      let [userQuestProgress] = await db
        .select()
        .from(userQuests)
        .where(
          and(
            eq(userQuests.address, normalizedAddress),
            eq(userQuests.questId, quest.id),
            // For non-recurring quests, check without period
            quest.isRecurring ? sql`true` : isNull(userQuests.periodStart)
          )
        )
        .limit(1)

      if (!userQuestProgress) {
        // Create new progress entry
        const [inserted] = await db
          .insert(userQuests)
          .values({
            address: normalizedAddress,
            questId: quest.id,
            progress: Math.min(currentProgress, requirement.target),
            target: requirement.target,
            isCompleted: currentProgress >= requirement.target,
            completedAt: currentProgress >= requirement.target ? new Date() : null,
            periodStart: quest.isRecurring ? this.getPeriodStart(quest.recurringPeriod) : null,
          })
          .returning()

        userQuestProgress = inserted

        if (currentProgress >= requirement.target) {
          questsCompleted.push(quest.name)
          xpEarned += quest.xpReward

          // Award badge if applicable
          if (quest.badgeId) {
            const badgeName = await this.awardBadge(normalizedAddress, quest.badgeId)
            if (badgeName) {
              badgesEarned.push(badgeName)
            }
          }
        }
      } else if (!userQuestProgress.isCompleted && currentProgress >= requirement.target) {
        // Update existing progress and mark as completed
        await db
          .update(userQuests)
          .set({
            progress: requirement.target,
            isCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userQuests.id, userQuestProgress.id))

        questsCompleted.push(quest.name)
        xpEarned += quest.xpReward

        // Award badge if applicable
        if (quest.badgeId) {
          const badgeName = await this.awardBadge(normalizedAddress, quest.badgeId)
          if (badgeName) {
            badgesEarned.push(badgeName)
          }
        }
      } else if (!userQuestProgress.isCompleted) {
        // Update progress only
        await db
          .update(userQuests)
          .set({
            progress: Math.min(currentProgress, requirement.target),
            updatedAt: new Date(),
          })
          .where(eq(userQuests.id, userQuestProgress.id))
      }
    }

    // Award XP if any earned
    if (xpEarned > 0) {
      await this.awardXp(normalizedAddress, xpEarned)
    }

    return { questsCompleted, xpEarned, badgesEarned }
  }

  /**
   * Award XP to a user and update their level
   */
  async awardXp(address: string, amount: number): Promise<void> {
    const normalizedAddress = address.toLowerCase()

    // Get or create user level
    let [userLevel] = await db
      .select()
      .from(userLevels)
      .where(eq(userLevels.address, normalizedAddress))
      .limit(1)

    if (!userLevel) {
      const [inserted] = await db
        .insert(userLevels)
        .values({
          address: normalizedAddress,
          totalXp: amount,
          level: 1,
        })
        .returning()
      userLevel = inserted
    } else {
      const newXp = userLevel.totalXp + amount
      await db
        .update(userLevels)
        .set({
          totalXp: newXp,
          updatedAt: new Date(),
        })
        .where(eq(userLevels.id, userLevel.id))
      userLevel.totalXp = newXp
    }

    // Calculate new level
    const thresholds = await db
      .select()
      .from(levelThresholds)
      .orderBy(desc(levelThresholds.level))

    for (const threshold of thresholds) {
      if (userLevel.totalXp >= threshold.xpRequired) {
        if (userLevel.level < threshold.level) {
          await db
            .update(userLevels)
            .set({
              level: threshold.level,
              updatedAt: new Date(),
            })
            .where(eq(userLevels.id, userLevel.id))
        }
        break
      }
    }
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(address: string, badgeId: string): Promise<string | null> {
    const normalizedAddress = address.toLowerCase()

    // Check if user already has this badge
    const [existing] = await db
      .select()
      .from(userBadges)
      .where(
        and(
          eq(userBadges.address, normalizedAddress),
          eq(userBadges.badgeId, badgeId)
        )
      )
      .limit(1)

    if (existing) {
      return null // Already has badge
    }

    // Award badge
    await db.insert(userBadges).values({
      address: normalizedAddress,
      badgeId,
    })

    // Get badge name for return
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.id, badgeId))
      .limit(1)

    return badge?.name || null
  }

  /**
   * Get user's XP and level info
   */
  async getUserLevel(address: Address) {
    const normalizedAddress = address.toLowerCase()

    const [userLevel] = await db
      .select()
      .from(userLevels)
      .where(eq(userLevels.address, normalizedAddress))
      .limit(1)

    const thresholds = await db
      .select()
      .from(levelThresholds)
      .orderBy(asc(levelThresholds.level))

    if (!userLevel) {
      return {
        address: normalizedAddress,
        totalXp: 0,
        level: 1,
        currentLevelTitle: thresholds[0]?.title || 'Novice',
        nextLevelXp: thresholds[1]?.xpRequired || 100,
        xpToNextLevel: thresholds[1]?.xpRequired || 100,
      }
    }

    const currentThreshold = thresholds.find(t => t.level === userLevel.level)
    const nextThreshold = thresholds.find(t => t.level === userLevel.level + 1)

    return {
      address: normalizedAddress,
      totalXp: userLevel.totalXp,
      level: userLevel.level,
      currentLevelTitle: currentThreshold?.title || 'Unknown',
      nextLevelXp: nextThreshold?.xpRequired || null,
      xpToNextLevel: nextThreshold
        ? nextThreshold.xpRequired - userLevel.totalXp
        : 0,
    }
  }

  /**
   * Get XP leaderboard
   */
  async getXpLeaderboard(limit: number = 10, offset: number = 0) {
    return db
      .select()
      .from(userLevels)
      .orderBy(desc(userLevels.totalXp))
      .limit(limit)
      .offset(offset)
  }

  /**
   * Get all badges
   */
  async getAllBadges() {
    return db.select().from(badges)
  }

  /**
   * Get user's badges
   */
  async getUserBadges(address: Address) {
    const normalizedAddress = address.toLowerCase()

    return db
      .select({
        badge: badges,
        earnedAt: userBadges.earnedAt,
        claimed: userBadges.claimed,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.address, normalizedAddress))
      .orderBy(desc(userBadges.earnedAt))
  }

  /**
   * Get all level thresholds
   */
  async getLevelThresholds() {
    return db
      .select()
      .from(levelThresholds)
      .orderBy(asc(levelThresholds.level))
  }

  /**
   * Helper to get period start timestamp for recurring quests
   */
  private getPeriodStart(period: string | null): Date | null {
    if (!period) return null

    const now = new Date()

    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'weekly':
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        return new Date(now.getFullYear(), now.getMonth(), diff)
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      default:
        return null
    }
  }
}

// Export singleton instance
export const questsService = new QuestsService()
