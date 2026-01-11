# Multi-Network Balance Retrieval Feature

## Overview

The fund-poll-dialog now supports automatic wallet balance retrieval across multiple EVM networks, regardless of which network your wallet is currently connected to.

## Features

- ✅ **Multi-Network Support**: Query balances on any supported EVM network (Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Base)
- ✅ **Universal Address**: Uses your wallet address to query balance on any network via public RPC endpoints
- ✅ **Auto-Refresh**: Balances automatically update every 10 seconds
- ✅ **Max Button**: One-click button to auto-fill your entire balance
- ✅ **Real-time Updates**: Balance display updates while you're selecting networks

## Supported Networks

### Mainnets
- Ethereum Mainnet
- Base
- BNB Smart Chain (BSC)
- Polygon
- Arbitrum One
- Optimism
- Avalanche C-Chain

### Testnets
- Sepolia
- Base Sepolia
- BSC Testnet
- Polygon Mumbai
- Arbitrum Sepolia
- Optimism Sepolia
- Avalanche Fuji

## How It Works

1. **Connect Your Wallet**: Connect to any supported network (Base or Base Sepolia)
2. **Select Currency**: Choose the cryptocurrency you want to send (e.g., USDC, ETH, BNB)
3. **Select Deposit Network**: Choose the network you'll send from
4. **View Balance**: Your balance on the selected network appears automatically
5. **Use Max Button**: Click "Max" to auto-fill your entire balance
6. **Auto-Updates**: Balance refreshes every 10 seconds

## Technical Implementation

### Files Created

1. **`lib/utils/rpc-config.ts`**
   - Network configuration mapping
   - Chain IDs, native currencies, and public RPC endpoints
   - Helper functions for network lookup

2. **`lib/hooks/use-multi-network-balance.ts`**
   - Custom React hook for multi-network balance queries
   - Uses viem's `createPublicClient` with public RPC endpoints
   - Implements automatic retry and fallback logic
   - Configurable refetch intervals

### Files Modified

1. **`components/sideshift/fund-poll-dialog.tsx`**
   - Integrated balance display above amount input
   - Added "Max" button for quick balance filling
   - Shows loading state with spinning icon
   - Displays errors gracefully

## Usage Example

```tsx
import { useMultiNetworkBalance } from '@/lib/hooks/use-multi-network-balance'

const {
  balance,           // bigint | null
  formatted,         // string | null (human-readable)
  isLoading,         // boolean
  isError,           // boolean
  symbol,           // string (e.g., "ETH", "BNB", "MATIC")
} = useMultiNetworkBalance({
  address: '0x...',
  networkId: 'ethereum',
  refetchInterval: 10000, // 10 seconds
  enabled: true,
})
```

## Benefits

- **No Network Switching Required**: Query balances without prompting users to switch networks
- **Better UX**: Users can see their balance before initiating a shift
- **Reduced Errors**: "Max" button prevents overspending or insufficient balance errors
- **Real-time Updates**: Balances stay current during the conversion process

## Configuration

### Refetch Interval

Default: 10 seconds (aggressive)

To change the interval, modify the `refetchInterval` parameter:

```tsx
useMultiNetworkBalance({
  address,
  networkId,
  refetchInterval: 30000, // 30 seconds
})
```

### Adding New Networks

To add support for a new network:

1. Open `lib/utils/rpc-config.ts`
2. Add network configuration to `NETWORK_CONFIGS`:

```tsx
myNetwork: {
  chainId: 1234,
  name: 'My Network',
  nativeCurrency: {
    name: 'Token',
    symbol: 'TKN',
    decimals: 18,
  },
  rpcUrls: [
    'https://rpc.mynetwork.com',
    'https://backup-rpc.mynetwork.com',
  ],
}
```

## Error Handling

The hook implements robust error handling:

- **Multiple RPC Endpoints**: Tries backup RPCs if primary fails
- **Retry Logic**: Automatically retries failed requests (up to 2 times)
- **Graceful Degradation**: Shows error state without breaking UI
- **Timeout Protection**: 10-second timeout per RPC request

## Performance Considerations

- **Lightweight Queries**: Only queries balanceOf for tokens
- **Cached Results**: React Query caches responses (5-second stale time)
- **Minimal Re-renders**: Only updates when data actually changes
- **Parallel Requests**: Batches token balance and decimals queries

## SSR/Vercel Compatibility

To ensure the feature works correctly during Vercel's static site generation:

1. **Browser-Only Execution**: `useSupportedAssets()` hook includes `typeof window === 'undefined'` check
2. **Client Component**: `fund-poll-dialog.tsx` uses `'use client'` directive
3. **Conditional Queries**: All React Query hooks use `enabled` parameter to prevent execution during SSR

### Fix Applied (components/sideshift/fund-poll-dialog.tsx:88-93)

```typescript
// Only run in browser environment
if (typeof window === 'undefined') {
  setLoading(false);
  return;
}
```

This prevents the hook from attempting to fetch data during Vercel's build process while allowing it to work normally in the browser.

## Current Features

- ✅ **Native Token Balance Support**: ETH, BNB, MATIC, AVAX, etc.
- ✅ **ERC20 Token Balance Support**: USDC, USDT, DAI, and other stablecoins
- ✅ **Dynamic Token Contract Lookup**: Uses SideShift API to get contract addresses
- ✅ **Balance Unavailable Messaging**: Shows amber warning for unsupported token/network combinations
- ✅ **Currency Symbol Display**: Shows balance with token symbol (e.g., "Balance: 1.234567 USDC")

## Future Enhancements

Potential improvements for future versions:

- [ ] USD value display using price feeds
- [ ] Balance history tracking
- [ ] Gas estimation for max button (subtract estimated gas fees)
- [ ] Multi-token display (show balances for multiple tokens simultaneously)
