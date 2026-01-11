/**
 * RPC Configuration for Multi-Network Balance Queries
 * Maps SideShift network identifiers to chain IDs and public RPC endpoints
 */

export interface NetworkConfig {
  chainId: number
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string[]
}

/**
 * Network configuration mapping
 * Uses free public RPC endpoints for balance queries
 */
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  // Ethereum Networks
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.ankr.com/eth_sepolia',
      'https://ethereum-sepolia.publicnode.com',
    ],
  },

  // Mantle Networks
  mantle: {
    chainId: 5000,
    name: 'Mantle',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.mantle.xyz',
      'https://mantle.publicnode.com',
    ],
  },
  mantleSepolia: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.sepolia.mantle.xyz',
    ],
  },

  // BSC Networks
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com',
    ],
  },
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: [
      'https://bsc-testnet.publicnode.com',
      'https://rpc.ankr.com/bsc_testnet_chapel',
    ],
  },

  // Polygon Networks
  polygon: {
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.llamarpc.com',
    ],
  },
  polygonMumbai: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.ankr.com/polygon_mumbai',
      'https://polygon-mumbai.blockpi.network/v1/rpc/public',
    ],
  },

  // Arbitrum Networks
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum.llamarpc.com',
    ],
  },
  arbitrumSepolia: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://arbitrum-sepolia.publicnode.com',
    ],
  },

  // Optimism Networks
  optimism: {
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
      'https://optimism.llamarpc.com',
    ],
  },
  optimismSepolia: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://sepolia.optimism.io',
      'https://optimism-sepolia.publicnode.com',
    ],
  },

  // Avalanche Networks
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
      'https://avalanche.publicnode.com',
    ],
  },
  avalancheFuji: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: [
      'https://api.avax-test.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche_fuji',
    ],
  },
}

/**
 * Get network configuration by network identifier
 */
export function getNetworkConfig(networkId: string): NetworkConfig | undefined {
  return NETWORK_CONFIGS[networkId]
}

/**
 * Get chain ID for a network
 */
export function getChainId(networkId: string): number | undefined {
  return NETWORK_CONFIGS[networkId]?.chainId
}

/**
 * Get native currency symbol for a network
 */
export function getNativeCurrencySymbol(networkId: string): string {
  return NETWORK_CONFIGS[networkId]?.nativeCurrency.symbol || 'ETH'
}

/**
 * Check if a network is supported for balance queries
 */
export function isNetworkSupported(networkId: string): boolean {
  return networkId in NETWORK_CONFIGS
}
