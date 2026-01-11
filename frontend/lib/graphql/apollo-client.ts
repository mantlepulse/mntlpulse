/**
 * Network-aware Apollo Client for The Graph subgraph queries
 * Switches between Mantle Mainnet and Mantle Sepolia endpoints
 */

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'

// Subgraph endpoints for different networks
const SUBGRAPH_URLS = {
  // Mantle Mainnet (chainId: 5000)
  5000: process.env.NEXT_PUBLIC_SUBGRAPH_URL_MANTLE_MAINNET ||
        'https://subgraph.mantle.xyz/subgraphs/name/mantlepulse-mainnet',

  // Mantle Sepolia (chainId: 5003)
  5003: process.env.NEXT_PUBLIC_SUBGRAPH_URL_MANTLE_SEPOLIA ||
         'https://subgraph.mantle.xyz/subgraphs/name/mantlepulse-sepolia',
} as const

type SupportedChainId = keyof typeof SUBGRAPH_URLS

/**
 * Get subgraph URL for a specific chain
 */
export function getSubgraphUrl(chainId: number): string {
  const url = SUBGRAPH_URLS[chainId as SupportedChainId]

  if (!url) {
    console.warn(`No subgraph URL configured for chainId ${chainId}, falling back to Mantle Sepolia`)
    return SUBGRAPH_URLS[5003]
  }

  return url
}

/**
 * Create an Apollo Client instance for a specific network
 */
export function createApolloClient(chainId: number) {
  const uri = getSubgraphUrl(chainId)

  console.log(`[Apollo Client] Creating client for chainId ${chainId}:`, uri)

  return new ApolloClient({
    link: new HttpLink({
      uri,
      fetch,
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            polls: {
              // Merge strategy for paginated polls
              keyArgs: ['where', 'orderBy', 'orderDirection'],
              merge(existing = [], incoming) {
                return [...existing, ...incoming]
              },
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
      query: {
        fetchPolicy: 'cache-first',
      },
    },
  })
}

/**
 * Default Apollo Client instance
 * Uses Mantle Sepolia by default (testnet)
 */
export const apolloClient = createApolloClient(5003)

/**
 * Check if a chain has subgraph support
 */
export function isChainSupported(chainId: number): chainId is SupportedChainId {
  return chainId in SUBGRAPH_URLS
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(SUBGRAPH_URLS).map(Number)
}
