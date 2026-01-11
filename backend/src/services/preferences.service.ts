/**
 * User Preferences Service
 */

import { db } from '../db/client';
import { userPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Address } from 'viem';

export interface UserPreferenceData {
  preferredToken?: string;
  autoClaimEnabled?: boolean;
}

export class PreferencesService {
  /**
   * Get user preferences
   */
  async get(address: Address) {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.address, address.toLowerCase()))
      .limit(1);

    return prefs || null;
  }

  /**
   * Create or update user preferences
   */
  async upsert(address: Address, data: UserPreferenceData) {
    const existing = await this.get(address);

    if (existing) {
      // Update existing preferences
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.id, existing.id))
        .returning();

      return updated;
    } else {
      // Create new preferences
      const [created] = await db
        .insert(userPreferences)
        .values({
          address: address.toLowerCase(),
          preferredToken: data.preferredToken,
          autoClaimEnabled: data.autoClaimEnabled ?? false,
        })
        .returning();

      return created;
    }
  }

  /**
   * Update preferred token
   */
  async updatePreferredToken(address: Address, token: string) {
    return this.upsert(address, { preferredToken: token });
  }

  /**
   * Update auto-claim setting
   */
  async updateAutoClaim(address: Address, enabled: boolean) {
    return this.upsert(address, { autoClaimEnabled: enabled });
  }

  /**
   * Delete user preferences
   */
  async delete(address: Address) {
    const existing = await this.get(address);
    if (!existing) return false;

    await db
      .delete(userPreferences)
      .where(eq(userPreferences.id, existing.id));

    return true;
  }

  /**
   * Get all users with auto-claim enabled
   */
  async getAutoClaimUsers() {
    return db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.autoClaimEnabled, true));
  }

  /**
   * Get users by preferred token
   */
  async getByPreferredToken(token: string) {
    return db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.preferredToken, token));
  }
}

// Export singleton instance
export const preferencesService = new PreferencesService();
