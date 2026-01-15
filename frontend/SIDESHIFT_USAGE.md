# Sideshift Integration Usage Guide

## Components Overview

You now have the following components ready to use:

### 1. API Client
- **Location**: `lib/api/sideshift-client.ts`
- Direct API communication with backend

### 2. React Hooks
- **Location**: `hooks/use-sideshift.ts`
- `useSideshift()` - Create and manage shifts
- `useSupportedAssets()` - Get list of supported cryptocurrencies
- `useShiftMonitor()` - Monitor shift status with auto-polling
- `useUserShifts()` - Get user's shift history
- `usePollShifts()` - Get poll's shift history

### 3. UI Components
- **Location**: `components/sideshift/`
- `CurrencySelector` - Dropdown to select cryptocurrency
- `FundPollDialog` - Modal for funding polls
- `ClaimRewardsDialog` - Modal for claiming rewards
- `ShiftMonitor` - Real-time shift status display

## Quick Integration Examples

### Example 1: Add "Fund with Crypto" to Poll Card

Update `components/poll-card.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { FundPollDialog } from '@/components/sideshift';
import { Button } from '@/components/ui/button';

export function PollCard({ poll }: { poll: any }) {
  const [fundDialogOpen, setFundDialogOpen] = useState(false);

  return (
    <div className="poll-card">
      {/* Your existing poll card content */}

      <Button
        onClick={() => setFundDialogOpen(true)}
        variant="outline"
      >
        Fund with Crypto
      </Button>

      <FundPollDialog
        pollId={poll.id}
        open={fundDialogOpen}
        onOpenChange={setFundDialogOpen}
        onSuccess={() => {
          // Refresh poll data
          console.log('Poll funded successfully!');
        }}
      />
    </div>
  );
}
```

### Example 2: Add "Claim Rewards" to Poll Detail Page

Update `app/dapp/poll/[id]/page.tsx` or wherever you show poll details:

```typescript
'use client';

import { useState } from 'react';
import { ClaimRewardsDialog } from '@/components/sideshift';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';

export function PollDetailPage({ pollId }: { pollId: string }) {
  const { address } = useAccount();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  // Your poll data fetching logic here
  const poll = {}; // Your poll data
  const userReward = "0.5"; // Calculate user's reward
  const canClaim = true; // Check if user can claim

  return (
    <div>
      {/* Your existing poll detail content */}

      {canClaim && (
        <>
          <Button onClick={() => setClaimDialogOpen(true)}>
            Claim Rewards
          </Button>

          <ClaimRewardsDialog
            pollId={pollId}
            rewardAmount={userReward}
            open={claimDialogOpen}
            onOpenChange={setClaimDialogOpen}
            onSuccess={() => {
              // Refresh poll data or redirect
              console.log('Rewards claimed!');
            }}
          />
        </>
      )}
    </div>
  );
}
```

### Example 3: Show User's Shift History

Create a new page or component:

```typescript
'use client';

import { useAccount } from 'wagmi';
import { useUserShifts } from '@/hooks/use-sideshift';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function UserShiftsHistory() {
  const { address } = useAccount();
  const { shifts, loading, error, refresh } = useUserShifts(address);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Shift History</h2>

      {shifts.map((shift) => (
        <Card key={shift.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {shift.sourceAsset} → {shift.destAsset}
              <Badge>{shift.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p>Purpose: {shift.purpose}</p>
              <p>Amount: {shift.sourceAmount || 'Variable'}</p>
              <p>Created: {new Date(shift.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Example 4: Monitor Shift Status

```typescript
'use client';

import { ShiftMonitor } from '@/components/sideshift';

export function MyComponent({ shiftId }: { shiftId: string }) {
  return (
    <div>
      <h3>Shift Status</h3>
      <ShiftMonitor
        shiftId={shiftId}
        onComplete={() => {
          console.log('Shift completed!');
        }}
      />
    </div>
  );
}
```

### Example 5: Custom Currency Selector

```typescript
'use client';

import { useState } from 'react';
import { CurrencySelector } from '@/components/sideshift';

export function MyForm() {
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');

  return (
    <div>
      <CurrencySelector
        label="Choose your currency"
        value={selectedCurrency}
        onChange={setSelectedCurrency}
        placeholder="Select..."
      />

      <p>You selected: {selectedCurrency}</p>
    </div>
  );
}
```

### Example 6: Using Hooks Directly

```typescript
'use client';

import { useSideshift, useSupportedAssets } from '@/hooks/use-sideshift';
import { useAccount } from 'wagmi';

export function CustomShiftComponent() {
  const { address } = useAccount();
  const { createShift, loading } = useSideshift();
  const { assets } = useSupportedAssets();

  const handleCreateShift = async () => {
    const result = await createShift({
      pollId: '1',
      userAddress: address!,
      purpose: 'fund_poll',
      sourceCoin: 'BTC',
      destCoin: 'ETH',
      sourceAmount: '0.001',
    });

    if (result) {
      console.log('Shift created:', result);
      console.log('Deposit to:', result.sideshift.depositAddress);
    }
  };

  return (
    <div>
      <button onClick={handleCreateShift} disabled={loading}>
        Create Shift
      </button>
    </div>
  );
}
```

## API Reference

### `useSideshift()`

```typescript
const { createShift, getShiftStatus, loading, error } = useSideshift();
```

**Methods:**
- `createShift(params)` - Create new shift order
- `getShiftStatus(shiftId)` - Get current shift status

### `useSupportedAssets()`

```typescript
const { assets, loading, error } = useSupportedAssets();
```

**Returns:**
- `assets` - Array of supported cryptocurrencies
- `loading` - Loading state
- `error` - Error message if any

### `useShiftMonitor(shiftId, intervalMs?)`

```typescript
const { status, shiftData, loading, error } = useShiftMonitor(shiftId, 5000);
```

**Parameters:**
- `shiftId` - Shift ID to monitor
- `intervalMs` - Polling interval (default: 5000ms)

**Returns:**
- `status` - Current shift status
- `shiftData` - Full shift data
- Auto-polls until shift reaches final state

### `useUserShifts(address)`

```typescript
const { shifts, loading, error, refresh } = useUserShifts(address);
```

### `usePollShifts(pollId)`

```typescript
const { shifts, loading, error, refresh } = usePollShifts(pollId);
```

## Component Props

### `<CurrencySelector>`

```typescript
interface CurrencySelectorProps {
  value: string;              // Selected currency code
  onChange: (value: string) => void;
  label?: string;             // Optional label
  placeholder?: string;       // Placeholder text
  disabled?: boolean;         // Disable selector
  className?: string;         // Additional CSS classes
}
```

### `<FundPollDialog>`

```typescript
interface FundPollDialogProps {
  pollId: string;             // Poll to fund
  open: boolean;              // Dialog open state
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;     // Called when funding succeeds
}
```

### `<ClaimRewardsDialog>`

```typescript
interface ClaimRewardsDialogProps {
  pollId: string;             // Poll to claim from
  rewardAmount: string;       // Reward amount in ETH
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;     // Called when claim succeeds
}
```

### `<ShiftMonitor>`

```typescript
interface ShiftMonitorProps {
  shiftId: string;            // Shift to monitor
  className?: string;
  onComplete?: () => void;    // Called when shift settles
}
```

## Testing

### 1. Start Backend API
```bash
cd mntlpulse-api
npm run dev
# Server runs on http://localhost:3001
```

### 2. Start Frontend
```bash
cd mntlpulse-app
npm run dev
# App runs on http://localhost:3000
```

### 3. Test Flow
1. Open a poll
2. Click "Fund with Crypto"
3. Select currency (e.g., BTC)
4. Enter amount
5. Get deposit address
6. Monitor status

## Troubleshooting

### Backend not connecting
- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Ensure backend is running
- Check CORS settings in backend

### Currencies not loading
- Check backend is running
- Check Sideshift API is accessible
- Check browser console for errors

### Shift status not updating
- `useShiftMonitor` polls every 5 seconds by default
- Check backend webhook is configured
- Verify shift ID is correct

## Next Steps

1. ✅ Components are ready to use
2. Integrate into your existing pages
3. Test the full flow locally
4. Deploy backend API
5. Update production environment variables
6. Test in production

## Examples in Your Codebase

Based on your existing structure, here are the files you'll likely want to update:

- `components/poll-card.tsx` - Add "Fund with Crypto" button
- `app/dapp/poll/[id]/page.tsx` - Add claim rewards functionality
- `components/poll-creation-form.tsx` - Optionally show funding options
- Create `app/dapp/shifts/page.tsx` - Show user's shift history

All components are fully typed with TypeScript and integrate with your existing UI components!
