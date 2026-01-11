/**
 * Shifts Service for managing SideShift order data
 */

import { db } from '../db/client';
import { shifts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Address } from 'viem';

export interface ShiftData {
  sideshiftOrderId: string;
  pollId: string;
  userAddress: Address;
  purpose: string;
  sourceAsset: string;
  destAsset: string;
  sourceNetwork: string;
  destNetwork: string;
  sourceAmount?: string;
  depositAddress: string;
  settleAddress: string;
  shiftType: string;
  status: string;
  expiresAt: Date;
  depositTxHash?: `0x${string}`;
  settleTxHash?: `0x${string}`;
  completedAt?: Date;
}

export class ShiftsService {
  /**
   * Create a new shift record
   */
  async create(data: ShiftData) {
    const [shift] = await db
      .insert(shifts)
      .values({
        sideshiftOrderId: data.sideshiftOrderId,
        pollId: data.pollId,
        userAddress: data.userAddress,
        purpose: data.purpose,
        sourceAsset: data.sourceAsset,
        destAsset: data.destAsset,
        sourceNetwork: data.sourceNetwork,
        destNetwork: data.destNetwork,
        sourceAmount: data.sourceAmount,
        depositAddress: data.depositAddress,
        settleAddress: data.settleAddress,
        shiftType: data.shiftType,
        status: data.status,
        expiresAt: data.expiresAt,
        depositTxHash: data.depositTxHash,
        settleTxHash: data.settleTxHash,
        completedAt: data.completedAt,
      })
      .returning();

    return shift;
  }

  /**
   * Get shift by ID
   */
  async getById(id: string) {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, id))
      .limit(1);

    return shift || null;
  }

  /**
   * Get shift by SideShift order ID
   */
  async getBySideshiftOrderId(orderId: string) {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.sideshiftOrderId, orderId))
      .limit(1);

    return shift || null;
  }

  /**
   * Get all shifts for a user
   */
  async getByUserAddress(address: Address) {
    return db
      .select()
      .from(shifts)
      .where(eq(shifts.userAddress, address.toLowerCase()));
  }

  /**
   * Get all shifts for a poll
   */
  async getByPollId(pollId: string) {
    return db.select().from(shifts).where(eq(shifts.pollId, pollId));
  }

  /**
   * Update shift data
   */
  async update(
    id: string,
    data: Partial<{
      status: string;
      depositTxHash: `0x${string}`;
      settleTxHash: `0x${string}`;
      contractTxHash: `0x${string}`;
      fundingTxHash: `0x${string}`;
      completedAt: Date;
    }>
  ) {
    const [updated] = await db
      .update(shifts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, id))
      .returning();

    return updated;
  }

  /**
   * Get all pending shifts
   */
  async getPending() {
    return db
      .select()
      .from(shifts)
      .where(eq(shifts.status, 'pending'));
  }

  /**
   * Get shifts by status
   */
  async getByStatus(status: string) {
    return db.select().from(shifts).where(eq(shifts.status, status));
  }
}

// Export singleton instance
export const shiftsService = new ShiftsService();
