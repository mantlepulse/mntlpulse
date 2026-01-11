/**
 * Polls API Client
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PollFunding {
  token: string;
  amount: string;
  funder: string;
  timestamp: string;
}

export interface PollFundingsResponse {
  pollId: string;
  chainId: number;
  totalFunding: string;
  totalFundings: number;
  fundings: PollFunding[];
}

/**
 * Polls API Client
 */
export const pollsAPI = {
  /**
   * Get funding history for a poll from blockchain
   */
  async getPollFundings(chainId: number, pollId: string): Promise<PollFundingsResponse> {
    const { data } = await axios.get<PollFundingsResponse>(
      `${API_URL}/api/polls/blockchain/${chainId}/${pollId}/fundings`
    );
    return data;
  },
};

/**
 * Error handler helper
 */
export function handlePollsError(error: any): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.status === 404) {
      return 'Poll not found';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}
