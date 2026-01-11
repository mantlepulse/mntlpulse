/**
 * Seed Membership Tiers
 * Seeds the default membership tier definitions
 */

import 'dotenv/config';
import { db } from '../db/client';
import { membershipTiers, TierRequirements } from '../db/schema';
import { eq } from 'drizzle-orm';

interface TierDefinition {
  slug: string;
  name: string;
  dailyVoteLimit: number;
  maxSeasonPoints: number;
  requirements: TierRequirements;
  displayOrder: number;
}

const TIER_DEFINITIONS: TierDefinition[] = [
  {
    slug: 'bronze',
    name: 'Bronze',
    dailyVoteLimit: 3,
    maxSeasonPoints: 1000,
    requirements: {
      pollsParticipated: 0,
      totalVotes: 0,
      pollsCreated: 0,
      seasonsCompleted: 0,
    },
    displayOrder: 1,
  },
  {
    slug: 'silver',
    name: 'Silver',
    dailyVoteLimit: 6,
    maxSeasonPoints: 2500,
    requirements: {
      pollsParticipated: 10,
      totalVotes: 50,
      pollsCreated: 0,
      seasonsCompleted: 0,
    },
    displayOrder: 2,
  },
  {
    slug: 'gold',
    name: 'Gold',
    dailyVoteLimit: 9,
    maxSeasonPoints: 5000,
    requirements: {
      pollsParticipated: 50,
      totalVotes: 200,
      pollsCreated: 1,
      seasonsCompleted: 0,
    },
    displayOrder: 3,
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    dailyVoteLimit: 12,
    maxSeasonPoints: 10000,
    requirements: {
      pollsParticipated: 100,
      totalVotes: 500,
      pollsCreated: 5,
      seasonsCompleted: 1,
    },
    displayOrder: 4,
  },
];

async function seedMembershipTiers() {
  console.log('🌱 Seeding membership tiers...');

  for (const tier of TIER_DEFINITIONS) {
    // Check if tier already exists
    const [existing] = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.slug, tier.slug))
      .limit(1);

    if (existing) {
      // Update existing tier
      await db
        .update(membershipTiers)
        .set({
          name: tier.name,
          dailyVoteLimit: tier.dailyVoteLimit,
          maxSeasonPoints: tier.maxSeasonPoints,
          requirements: tier.requirements,
          displayOrder: tier.displayOrder,
        })
        .where(eq(membershipTiers.slug, tier.slug));
      console.log(`  ✓ Updated tier: ${tier.name}`);
    } else {
      // Insert new tier
      await db.insert(membershipTiers).values(tier);
      console.log(`  ✓ Created tier: ${tier.name}`);
    }
  }

  console.log('✅ Membership tiers seeded successfully!');
  console.log('\nTier Summary:');
  console.log('─'.repeat(70));
  console.log(
    '| Tier     | Daily Votes | Max Points | Requirements                    |'
  );
  console.log('─'.repeat(70));
  for (const tier of TIER_DEFINITIONS) {
    const req = tier.requirements;
    const reqStr = `${req.pollsParticipated}p/${req.totalVotes}v/${req.pollsCreated}c/${req.seasonsCompleted}s`;
    console.log(
      `| ${tier.name.padEnd(8)} | ${String(tier.dailyVoteLimit).padEnd(11)} | ${String(tier.maxSeasonPoints).padEnd(10)} | ${reqStr.padEnd(31)} |`
    );
  }
  console.log('─'.repeat(70));
  console.log('\nRequirements key: p=polls participated, v=votes, c=polls created, s=seasons completed');
}

// Run the seed
seedMembershipTiers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed membership tiers:', error);
    process.exit(1);
  });
