/**
 * Sideshift API Client
 * Client for calling the Pulse backend API
 */

import axios from 'axios';
import { Address } from 'viem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CreateShiftParams {
  pollId?: string;
  userAddress: Address;
  purpose: 'fund_poll' | 'claim_reward' | 'bridge';
  sourceCoin: string;
  destCoin: string;
  sourceNetwork?: string;
  destNetwork?: string;
  sourceAmount?: string;
  refundAddress?: Address;
  chainId?: number;
}

export interface SupportedAsset {
  coin: string;
  name: string;
  networks: string[];
  tokenDetails?: {
    [network: string]: {
      contractAddress: string;
      decimals: number;
    };
  };
}

export interface SupportedAssetsResponse {
  assets: SupportedAsset[];
  lastUpdated: string;
}

export interface ShiftResponse {
  shift: {
    id: string;
    sideshiftOrderId: string;
    pollId: string;
    userAddress: Address;
    purpose: 'fund_poll' | 'claim_reward' | 'bridge';
    sourceAsset: string;
    destAsset: string;
    sourceNetwork: string;
    destNetwork: string;
    sourceAmount?: string;
    destAmount?: string;
    depositAddress: string;
    settleAddress: string;
    shiftType: 'fixed' | 'variable';
    status: string;
    createdAt: string;
    expiresAt: string;
  };
  sideshift: {
    orderId: string;
    depositAddress: string;
    depositCoin: string;
    depositNetwork: string;
    depositMin?: string;
    depositMax?: string;
    expiresAt: string;
  };
}

export interface ShiftStatusResponse {
  shift: ShiftResponse['shift'];
  sideshiftData: any;
}

export interface UserShiftsResponse {
  shifts: ShiftResponse['shift'][];
}

export interface PollShiftsResponse {
  shifts: ShiftResponse['shift'][];
}

export interface SideshiftPairInfo {
  min: string;            // Minimum deposit amount
  max: string;            // Maximum deposit amount
  rate: string;           // Exchange rate
  depositCoin: string;    // Source cryptocurrency
  settleCoin: string;     // Destination cryptocurrency
  depositNetwork: string; // Source blockchain network
  settleNetwork: string;  // Destination blockchain network
}

/**
 * Sideshift API Client
 */
export const sideshiftAPI = {
  /**
   * Get all supported cryptocurrencies
   */
  async getSupportedAssets(): Promise<SupportedAssetsResponse> {
    const { data } = await axios.get<SupportedAssetsResponse>(
      `${API_URL}/api/sideshift/supported-assets`
    );
    return data;
  },

  /**
   * Get pair information including min/max deposit amounts
   */
  async getPairInfo(
    depositCoin: string,
    settleCoin: string,
    depositNetwork?: string,
    settleNetwork?: string
  ): Promise<SideshiftPairInfo> {
    const params = new URLSearchParams();
    if (depositNetwork) params.append('depositNetwork', depositNetwork);
    if (settleNetwork) params.append('settleNetwork', settleNetwork);

    const { data } = await axios.get<SideshiftPairInfo>(
      `${API_URL}/api/sideshift/pair/${depositCoin}/${settleCoin}${params.toString() ? `?${params.toString()}` : ''}`
    );
    return data;
  },

  /**
   * Create a new shift order
   */
  async createShift(params: CreateShiftParams): Promise<ShiftResponse> {
    const { data } = await axios.post<ShiftResponse>(
      `${API_URL}/api/sideshift/create-shift`,
      params
    );
    return data;
  },

  /**
   * Get shift status by ID
   */
  async getShiftStatus(shiftId: string): Promise<ShiftStatusResponse> {
    const { data } = await axios.get<ShiftStatusResponse>(
      `${API_URL}/api/sideshift/shift-status/${shiftId}`
    );
    return data;
  },

  /**
   * Get all shifts for a user address
   */
  async getUserShifts(address: Address): Promise<UserShiftsResponse> {
    const { data } = await axios.get<UserShiftsResponse>(
      `${API_URL}/api/sideshift/user/${address}`
    );
    return data;
  },

  /**
   * Get all shifts for a poll
   */
  async getPollShifts(pollId: string): Promise<PollShiftsResponse> {
    const { data } = await axios.get<PollShiftsResponse>(
      `${API_URL}/api/sideshift/poll/${pollId}`
    );
    return data;
  },

  /**
   * Check backend health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; environment: string }> {
    const { data } = await axios.get(`${API_URL}/health`);
    return data;
  },

  /**
   * Link a funding transaction to a shift
   */
  async linkFundingTransaction(shiftId: string, fundingTxHash: string): Promise<{ success: boolean; shift: any }> {
    const { data } = await axios.post(`${API_URL}/api/sideshift/shift/${shiftId}/link-funding`, {
      fundingTxHash,
    });
    return data;
  },
};

/**
 * Error handler helper
 */
export function handleSideshiftError(error: any): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.status === 404) {
      return 'Resource not found';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}
