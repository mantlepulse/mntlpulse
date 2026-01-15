/**
 * GraphQL queries for The Graph subgraph
 */

import { gql } from '@apollo/client'

/**
 * Fragment for poll fields
 * Note: creator is a User entity, so we fetch the id (which is the address)
 */
const POLL_FIELDS = gql`
  fragment PollFields on Poll {
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
    totalFundingAmount
    status
    fundingType
    votingType
    totalVotesBought
  }
`

/**
 * Get a single poll by ID
 */
export const GET_POLL = gql`
  ${POLL_FIELDS}
  query GetPoll($id: ID!) {
    poll(id: $id) {
      ...PollFields
    }
  }
`

/**
 * Get multiple polls with filtering and pagination
 */
export const GET_POLLS = gql`
  ${POLL_FIELDS}
  query GetPolls(
    $first: Int = 20
    $skip: Int = 0
    $orderBy: Poll_orderBy = createdAt
    $orderDirection: OrderDirection = desc
    $where: Poll_filter
  ) {
    polls(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      ...PollFields
    }
  }
`

/**
 * Get active polls only
 */
export const GET_ACTIVE_POLLS = gql`
  ${POLL_FIELDS}
  query GetActivePolls(
    $first: Int = 20
    $skip: Int = 0
    $orderBy: Poll_orderBy = createdAt
    $orderDirection: OrderDirection = desc
  ) {
    polls(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { isActive: true }
    ) {
      ...PollFields
    }
  }
`

/**
 * Get global statistics
 * Note: The ID is "global" encoded as hex bytes (0x676c6f62616c)
 */
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "0x676c6f62616c") {
      totalPolls
      totalVotes
      totalFunding
      totalDistributions
      totalUsers
      totalVoters
      totalFunders
      whitelistedTokens
    }
  }
`

/**
 * Get daily statistics
 */
export const GET_DAILY_STATS = gql`
  query GetDailyStats($first: Int = 30) {
    dailyStats(
      first: $first
      orderBy: day
      orderDirection: desc
    ) {
      id
      day
      dailyPolls
      dailyVotes
      dailyFunding
      dailyDistributions
      dailyActiveUsers
    }
  }
`

/**
 * Get poll fundings
 */
export const GET_POLL_FUNDINGS = gql`
  query GetPollFundings(
    $pollId: ID!
    $first: Int = 100
    $orderBy: Funding_orderBy = timestamp
    $orderDirection: OrderDirection = desc
  ) {
    fundings(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { poll: $pollId }
    ) {
      id
      poll {
        id
      }
      funder {
        id
      }
      token {
        id
        symbol
        decimals
      }
      amount
      timestamp
      transactionHash
    }
  }
`

/**
 * Get user's votes
 */
export const GET_USER_VOTES = gql`
  query GetUserVotes(
    $user: Bytes!
    $first: Int = 100
    $skip: Int = 0
  ) {
    votes(
      first: $first
      skip: $skip
      where: { voter: $user }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      poll {
        id
        pollId
        question
      }
      voter {
        id
      }
      optionIndex
      timestamp
      transactionHash
    }
  }
`

/**
 * Get user's fundings with full poll details
 */
export const GET_USER_FUNDINGS = gql`
  query GetUserFundings(
    $user: Bytes!
    $first: Int = 100
  ) {
    fundings(
      first: $first
      where: { funder: $user }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      poll {
        id
        pollId
        question
        options
        votes
        endTime
        isActive
        totalFundingAmount
        voteCount
        voterCount
        status
        fundingType
      }
      funder {
        id
      }
      token {
        id
        symbol
        decimals
      }
      amount
      timestamp
      transactionHash
    }
  }
`

/**
 * Get user's distributions (refunds, claims, rewards)
 */
export const GET_USER_DISTRIBUTIONS = gql`
  query GetUserDistributions(
    $user: Bytes!
    $first: Int = 100
  ) {
    distributions(
      first: $first
      where: { recipient: $user }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      poll {
        id
        pollId
        question
      }
      recipient {
        id
      }
      token {
        id
        symbol
        decimals
      }
      amount
      eventType
      timestamp
      transactionHash
    }
  }
`

/**
 * Get voters for a specific poll
 * Used for bulk distribution to get list of recipients
 */
export const GET_POLL_VOTERS = gql`
  query GetPollVoters(
    $pollId: ID!
    $first: Int = 1000
  ) {
    votes(
      first: $first
      where: { poll: $pollId }
      orderBy: timestamp
      orderDirection: asc
    ) {
      id
      voter {
        id
      }
      optionIndex
      timestamp
      transactionHash
    }
  }
`

/**
 * Get user statistics by address
 * Used for creator dashboard and user profile
 */
export const GET_USER_STATS = gql`
  query GetUserStats($id: ID!) {
    user(id: $id) {
      id
      address
      pollsCreatedCount
      totalVotes
      pollsParticipated
      totalRewards
      totalFunded
      firstSeenAt
      lastSeenAt
    }
  }
`

/**
 * Get polls created by a specific address
 * Used for creator dashboard
 */
export const GET_POLLS_BY_CREATOR = gql`
  query GetPollsByCreator(
    $creator: Bytes!
    $first: Int = 100
    $skip: Int = 0
    $orderBy: Poll_orderBy = createdAt
    $orderDirection: OrderDirection = desc
  ) {
    polls(
      where: { creator: $creator }
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
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
      totalFunding
      totalFundingAmount
      fundingToken {
        id
        symbol
        decimals
      }
      voteCount
      voterCount
      distributionMode
      fundingType
      status
      createdAt
      votingType
      totalVotesBought
    }
  }
`

/**
 * Get closed polls created by a specific address
 * Used for creator manage page - closed polls tab
 */
export const GET_CLOSED_POLLS_BY_CREATOR = gql`
  query GetClosedPollsByCreator(
    $creator: Bytes!
    $first: Int = 100
    $skip: Int = 0
    $orderBy: Poll_orderBy = createdAt
    $orderDirection: OrderDirection = desc
  ) {
    polls(
      where: { creator: $creator, isActive: false }
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
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
      totalFunding
      totalFundingAmount
      fundingToken {
        id
        symbol
        decimals
      }
      voteCount
      voterCount
      distributionMode
      fundingType
      status
      createdAt
      votingType
    }
  }
`
