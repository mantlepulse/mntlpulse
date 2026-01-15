/**
 * Analytics API client for Mantle Pulse
 * Fetches analytics data from the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface PollStats {
  totalDistributed: string;
  distributionCount: number;
  uniqueRecipients: number;
}

export interface Distribution {
  id: number;
  pollId: number;
  recipient: string;
  amount: string;
  token: string;
  txHash: string;
  eventType: string;
  timestamp: Date;
}

export interface Funding {
  token: string;
  amount: string;
  funder: string;
  timestamp: Date;
}

export interface PollTrendItem {
  date: string;
  pollsCreated: number;
}

export interface DistributionTrendItem {
  date: string;
  distributionCount: number;
  totalAmount: string;
}

export interface AnalyticsTrends {
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  polls: PollTrendItem[];
  distributions: DistributionTrendItem[];
}

export interface CreatorOverview {
  totalPolls: number;
  activePolls: number;
  totalResponses: number;
  totalFunded: string;
}

/**
 * Fetch poll statistics
 */
export async function fetchPollStats(pollId: number): Promise<PollStats> {
  const response = await fetch(`${API_BASE_URL}/polls/${pollId}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch poll stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch distribution history for a poll
 */
export async function fetchPollDistributions(pollId: number): Promise<Distribution[]> {
  const response = await fetch(`${API_BASE_URL}/polls/${pollId}/distributions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch distributions: ${response.statusText}`);
  }
  const data = await response.json();
  return data.distributions || [];
}

/**
 * Fetch funding history for a poll
 */
export async function fetchPollFundings(
  chainId: number,
  pollId: number
): Promise<{ totalFunding: string; fundings: Funding[] }> {
  const response = await fetch(
    `${API_BASE_URL}/polls/blockchain/${chainId}/${pollId}/fundings`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch fundings: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch analytics trends over time
 */
export async function fetchAnalyticsTrends(
  chainId?: number,
  days: number = 7
): Promise<AnalyticsTrends> {
  const params = new URLSearchParams({ days: days.toString() });
  if (chainId) {
    params.append('chainId', chainId.toString());
  }

  const response = await fetch(`${API_BASE_URL}/analytics/trends?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trends: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch user-specific statistics from leaderboard
 */
export async function fetchUserStats(address: string): Promise<{
  address: string;
  totalRewards: string;
  pollsParticipated: number;
  totalVotes: number;
  pollsCreated: number;
  rankings: {
    rewards: number;
    votes: number;
    creators: number;
    participation: number;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/leaderboard/user/${address}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Compare multiple polls
 */
export async function comparePoll(pollIds: number[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analytics/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pollIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to compare polls: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch all distributions for a creator across all their polls
 */
export async function fetchCreatorDistributions(
  creatorAddress: string,
  chainId: number
): Promise<Distribution[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/creator/${creatorAddress}/distributions?chainId=${chainId}`
    );

    if (!response.ok) {
      // If API endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        console.warn('Creator distributions endpoint not found, returning empty array');
        return [];
      }
      throw new Error(`Failed to fetch creator distributions: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert timestamp strings to Date objects
    return (data.distributions || []).map((dist: any) => ({
      ...dist,
      timestamp: new Date(dist.timestamp),
    }));
  } catch (error) {
    console.error('Error fetching creator distributions:', error);
    // Return empty array as fallback
    return [];
  }
}
