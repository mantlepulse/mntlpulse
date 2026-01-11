/**
 * GraphQL queries for The Graph subgraph
 * Used to sync data from subgraph to local database on startup
 */

export const GET_GLOBAL_STATS = `
  query GetGlobalStats($id: ID!) {
    globalStats(id: $id) {
      totalPolls
      totalVotes
      totalFunding
      totalDistributions
      totalUsers
      totalVoters
      totalFunders
    }
  }
`;

export const GET_ALL_POLLS = `
  query GetAllPolls($first: Int!, $skip: Int!) {
    polls(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id
      pollId
      question
      options
      votes
      endTime
      isActive
      creator {
        id
      }
      createdAt
      totalFunding
      totalFundingAmount
      voteCount
      voterCount
      distributionMode
      fundingType
      status
    }
  }
`;

export const GET_ALL_USERS = `
  query GetAllUsers($first: Int!, $skip: Int!) {
    users(first: $first, skip: $skip) {
      id
      pollsCreatedCount
      totalVotes
      pollsParticipated
      totalRewards
      totalFunded
    }
  }
`;

export const GET_DAILY_STATS = `
  query GetDailyStats($first: Int!) {
    dailyStats(first: $first, orderBy: day, orderDirection: desc) {
      id
      day
      dailyPolls
      dailyVotes
      dailyFunding
      dailyDistributions
      dailyActiveUsers
    }
  }
`;

// Types for query responses
export interface GlobalStatsResponse {
  globalStats: {
    totalPolls: string;
    totalVotes: string;
    totalFunding: string;
    totalDistributions: string;
    totalUsers: string;
    totalVoters: string;
    totalFunders: string;
  } | null;
}

export interface SubgraphPoll {
  id: string;
  pollId: string;
  question: string;
  options: string[];
  votes: string[];
  endTime: string;
  isActive: boolean;
  creator: {
    id: string;
  };
  createdAt: string;
  totalFunding: string;
  totalFundingAmount: string;
  voteCount: string;
  voterCount: string;
  distributionMode: string;
  fundingType: string;
  status: string;
}

export interface PollsResponse {
  polls: SubgraphPoll[];
}

export interface SubgraphUser {
  id: string;
  pollsCreatedCount: string;
  totalVotes: string;
  pollsParticipated: string;
  totalRewards: string;
  totalFunded: string;
}

export interface UsersResponse {
  users: SubgraphUser[];
}

export interface DailyStatsItem {
  id: string;
  day: string;
  dailyPolls: string;
  dailyVotes: string;
  dailyFunding: string;
  dailyDistributions: string;
  dailyActiveUsers: string;
}

export interface DailyStatsResponse {
  dailyStats: DailyStatsItem[];
}
