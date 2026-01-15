# SideShift AI Integration Documentation

## Overview

Mantle Pulse integrates with [SideShift.ai](https://sideshift.ai) to enable cryptocurrency conversion for two primary use cases:

1. **Fund Polls with Any Crypto** - Users can fund polls using Bitcoin, USDT, or 100+ other cryptocurrencies, which are automatically converted to ETH/Base network tokens
2. **Claim Rewards in Preferred Crypto** - Poll participants can claim their rewards in their preferred cryptocurrency instead of receiving ETH

SideShift AI acts as a non-custodial crypto-to-crypto exchange service that facilitates these conversions through their API.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│   User      │────────▶│   Frontend   │────────▶│   Backend    │────────▶│  SideShift  │
│  (Wallet)   │         │ (Next.js App)│         │  (Express)   │         │  AI API     │
└─────────────┘         └──────────────┘         └──────────────┘         └─────────────┘
      │                         │                         │                         │
      │                         │                         │      Webhook            │
      │                         │                         │◀────────────────────────┘
      │                         │                         │
      │  Deposit Crypto         │                         │
      │──────────────────────────────────────────────────▶│
      │                         │                         │
      │  Receive Converted      │                         │
      │◀──────────────────────────────────────────────────┘
```

## Integration Points in Frontend

### 1. API Client
**File:** `lib/api/sideshift-client.ts`

**Purpose:** Axios-based HTTP client for backend communication

**Methods:**
```typescript
sideshiftAPI.getSupportedAssets()
sideshiftAPI.createShift(params)
sideshiftAPI.getShiftStatus(shiftId)
sideshiftAPI.getUserShifts(address)
sideshiftAPI.getPollShifts(pollId)
sideshiftAPI.healthCheck()
```

**Configuration:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### 2. React Hooks
**File:** `hooks/use-sideshift.ts`

#### `useSideshift()`
Main hook for creating and managing shifts

**Usage:**
```typescript
const { createShift, loading, error } = useSideshift();

const shift = await createShift({
  pollId: '1',
  userAddress: '0x...',
  purpose: 'fund_poll',
  sourceCoin: 'BTC',
  destCoin: 'ETH',
  sourceAmount: '0.001'
});
```

**Returns:**
- `createShift(params)` - Function to initiate shift
- `loading` - Boolean indicating request in progress
- `error` - Error message if request failed

#### `useSupportedAssets()`
Auto-fetches available cryptocurrencies on mount

**Usage:**
```typescript
const { assets, loading, error, refetch } = useSupportedAssets();

// assets = [
//   { coin: 'BTC', name: 'Bitcoin', networks: ['bitcoin', 'lightning'] },
//   { coin: 'ETH', name: 'Ethereum', networks: ['ethereum'] },
//   ...
// ]
```

**Features:**
- Automatically loads on component mount
- Cached in component state
- Manual refresh with `refetch()`
- Toast notifications on error

#### `useShiftMonitor(shiftId, intervalMs?)`
Polls for shift status updates every N milliseconds (default: 5000ms)

**Usage:**
```typescript
const { shift, loading, error, stopMonitoring } = useShiftMonitor('shift-123', 5000);

// Shift object updates automatically
// {
//   id: 'shift-123',
//   status: 'processing',
//   depositAddress: '0x...',
//   depositTxHash: '0x...',
//   settleTxHash: null,
//   ...
// }
```

**Features:**
- Automatic polling every 5 seconds (configurable)
- Stops when status reaches terminal state (`settled`, `refunded`, `expired`)
- Optional `onComplete` callback
- Manual stop with `stopMonitoring()`

**Status Progression:**
```
waiting → processing → settling → settled
   │                                  │
   └─────▶ refund ────▶ refunded     │
                                      │
                  expired ◀───────────┘
```

#### `useUserShifts(address)`
Fetches all shifts for a user with manual refresh

**Usage:**
```typescript
const { shifts, loading, error, refetch } = useUserShifts('0x742d35...');
```

#### `usePollShifts(pollId)`
Fetches all shifts for a poll with manual refresh

**Usage:**
```typescript
const { shifts, loading, error, refetch } = usePollShifts('1');
```

### 3. UI Components

#### Currency Selector
**File:** `components/sideshift/currency-selector.tsx`

**Purpose:** Dropdown component for selecting cryptocurrency

**Props:**
```typescript
interface CurrencySelectorProps {
  value: string;              // Selected coin code (e.g., 'BTC')
  onValueChange: (coin: string) => void;
  disabled?: boolean;
}
```

**Features:**
- Auto-loads supported assets using `useSupportedAssets()`
- Search/filter functionality
- Displays coin name and symbol
- Loading state while fetching assets
- Error handling with fallback

**Usage:**
```tsx
<CurrencySelector
  value={selectedCoin}
  onValueChange={setSelectedCoin}
/>
```

#### Fund Poll Dialog
**File:** `components/sideshift/fund-poll-dialog.tsx`

**Purpose:** Modal dialog for funding polls with cryptocurrency

**Props:**
```typescript
interface FundPollDialogProps {
  poll: Poll;                 // Poll object from contract
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**User Flow:**
1. User clicks "Fund with Crypto" button
2. Dialog opens with currency selector
3. User selects source cryptocurrency (BTC, USDT, etc.)
4. User enters amount (optional - uses variable rate if omitted)
5. User clicks "Get Deposit Address"
6. System creates shift via backend API
7. Dialog shows deposit address with QR code
8. User sends crypto from their wallet
9. Real-time status monitor displays progress
10. Success message when conversion completes

**Features:**
- Two-step UI: selection → deposit/monitoring
- QR code for deposit address
- Copy address button
- Real-time status updates via `useShiftMonitor`
- Transaction hash links to block explorer
- Error handling and retry
- Auto-closes on success

**Integration Point:**
```tsx
// In poll card or detail page
<FundPollDialog
  poll={poll}
  open={isFundDialogOpen}
  onOpenChange={setIsFundDialogOpen}
/>
```

#### Claim Rewards Dialog
**File:** `components/sideshift/claim-rewards-dialog.tsx`

**Purpose:** Modal dialog for claiming rewards in preferred cryptocurrency

**Props:**
```typescript
interface ClaimRewardsDialogProps {
  poll: Poll;                 // Poll object with reward info
  userAddress: string;        // Connected wallet address
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**User Flow:**
1. Poll ends, user has rewards to claim
2. User clicks "Claim Rewards"
3. Dialog shows available reward amount in ETH
4. User selects desired cryptocurrency (USDT, BTC, etc.)
5. User clicks "Claim in [Currency]"
6. System creates variable-rate shift
7. **Backend processes withdrawal** (TODO: automated)
8. Real-time status monitoring
9. Success with transaction details

**Features:**
- Displays claimable reward amount
- Currency selector for destination token
- Variable rate (market rate at time of conversion)
- Real-time status updates
- Transaction hash display
- Estimated receive amount

**Current Limitation:**
Backend doesn't automatically call `contract.withdrawFunds()`. This requires manual intervention or backend wallet implementation.

#### Shift Monitor
**File:** `components/sideshift/shift-monitor.tsx`

**Purpose:** Reusable component for displaying shift status with real-time updates

**Props:**
```typescript
interface ShiftMonitorProps {
  shiftId: string;
  onComplete?: () => void;    // Callback when shift completes
  intervalMs?: number;        // Polling interval (default: 5000)
}
```

**Features:**
- Visual status indicators (icons, colors)
- Auto-updates every 5 seconds
- Transaction hash links to block explorers
- Callback on completion
- Loading and error states
- Automatic polling stop on terminal status

**Status Display:**
- `waiting` - ⏳ Waiting for deposit (blue)
- `processing` - 🔄 Processing conversion (yellow)
- `settling` - 📤 Sending to recipient (yellow)
- `settled` - ✓ Complete (green)
- `refund` - ⚠️ Refunding (orange)
- `refunded` - ↩️ Refunded (orange)
- `expired` - ⏰ Expired (red)

**Usage:**
```tsx
<ShiftMonitor
  shiftId={shift.id}
  onComplete={() => {
    toast({ title: 'Shift completed!' });
    refetchPolls();
  }}
/>
```

## Data Flow Diagrams

### Flow 1: Fund Poll with Crypto (BTC → ETH)

```
User wants to fund poll with 0.001 BTC
         │
         ▼
[Frontend: FundPollDialog]
         │ User selects BTC, enters 0.001
         ▼
  const { createShift } = useSideshift();

  await createShift({
    pollId: '1',
    userAddress: '0xUSER',
    purpose: 'fund_poll',
    sourceCoin: 'BTC',
    destCoin: 'ETH',
    sourceAmount: '0.001'
  })
         │
         ▼
[API Client: sideshiftAPI.createShift()]
  POST /api/sideshift/create-shift
         │
         ▼
[Backend processes request]
  - Validates poll exists
  - Creates SideShift order
  - Stores in database
         │
         ▼
[Response returned to frontend]
  {
    id: 'shift-uuid',
    depositAddress: 'bc1q...',
    status: 'waiting',
    expiresAt: '2024-01-01T12:00:00Z'
  }
         │
         ▼
[Frontend: Display deposit UI]
  "Send 0.001 BTC to: bc1q..."
  [QR Code] [Copy Button]
         │
         ▼
[useShiftMonitor starts polling]
  Every 5 seconds:
    GET /api/sideshift/shift-status/shift-uuid
         │
         ▼
  Status updates displayed in real-time:
  waiting → processing → settling → settled
         │
         ▼
[onComplete callback triggered]
  Show success message
  User can now manually fund poll with received ETH
```

### Flow 2: Claim Rewards (ETH → USDT)

```
Poll ended, user has 0.5 ETH rewards
         │
         ▼
[Frontend: ClaimRewardsDialog]
  Available: 0.5 ETH
  User selects: USDT
         │
         ▼
  const { createShift } = useSideshift();

  await createShift({
    pollId: '1',
    userAddress: '0xUSER',
    purpose: 'claim_reward',
    sourceCoin: 'ETH',
    destCoin: 'USDT'
    // No amount = variable rate
  })
         │
         ▼
[API Client: POST to backend]
         │
         ▼
[Backend creates SideShift order]
  Returns deposit address
         │
         ▼
[Backend TODO: Auto-withdraw]
  Should call: contract.withdrawFunds(
    pollId: 1,
    recipient: sideshiftDepositAddress
  )
         │
         ▼
[Frontend: Monitor status]
  useShiftMonitor displays progress
         │
         ▼
  Status: waiting → processing → settled
         │
         ▼
[Success notification]
  "Claimed 0.5 ETH as ~1,850 USDT"
  [View Transaction]
```

### Flow 3: Real-Time Status Monitoring

```
[Component mounts with shift ID]
         │
         ▼
[useShiftMonitor hook initializes]
  setInterval(() => {
    fetchStatus()
  }, 5000)
         │
         ▼
[Every 5 seconds]
         │
         ▼
  sideshiftAPI.getShiftStatus(shiftId)
    ↓
  GET /api/sideshift/shift-status/shift-uuid
    ↓
  [Backend fetches from database + SideShift API]
    ↓
  Returns updated shift data
         │
         ▼
[Frontend updates state]
  setShift(updatedData)
         │
         ▼
[UI re-renders with new status]
  - Icon changes
  - Color changes
  - Progress indicator updates
  - Transaction hashes appear
         │
         ▼
[Check if terminal status reached]
  if (status in ['settled', 'refunded', 'expired']) {
    clearInterval()
    onComplete?.()
  }
```

## Environment Variables

### Frontend (`.env.local`)

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# For production
# NEXT_PUBLIC_API_URL=https://api.mntlpulse.com

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=8453                  # Base Mainnet
# NEXT_PUBLIC_CHAIN_ID=84532               # Base Sepolia (testnet)
```

## Component Integration Examples

### Example 1: Poll Card with Fund Button

```tsx
// components/poll-card.tsx
import { useState } from 'react';
import { FundPollDialog } from './sideshift/fund-poll-dialog';

export function PollCard({ poll }: { poll: Poll }) {
  const [isFundDialogOpen, setIsFundDialogOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <h3>{poll.question}</h3>
        <p>Total Funding: {poll.totalFunding} ETH</p>

        <Button onClick={() => setIsFundDialogOpen(true)}>
          Fund with Crypto
        </Button>

        <FundPollDialog
          poll={poll}
          open={isFundDialogOpen}
          onOpenChange={setIsFundDialogOpen}
        />
      </CardContent>
    </Card>
  );
}
```

### Example 2: Claim Rewards in User Dashboard

```tsx
// app/dashboard/page.tsx
import { useAccount } from 'wagmi';
import { ClaimRewardsDialog } from '@/components/sideshift/claim-rewards-dialog';

export default function Dashboard() {
  const { address } = useAccount();
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  return (
    <div>
      <h1>My Rewards</h1>

      {eligiblePolls.map(poll => (
        <div key={poll.id}>
          <p>Poll #{poll.id}: {poll.rewardAmount} ETH</p>
          <Button onClick={() => setSelectedPoll(poll)}>
            Claim Rewards
          </Button>
        </div>
      ))}

      {selectedPoll && (
        <ClaimRewardsDialog
          poll={selectedPoll}
          userAddress={address!}
          open={!!selectedPoll}
          onOpenChange={(open) => !open && setSelectedPoll(null)}
        />
      )}
    </div>
  );
}
```

### Example 3: Shift History Display

```tsx
// app/history/page.tsx
import { useAccount } from 'wagmi';
import { useUserShifts } from '@/hooks/use-sideshift';
import { ShiftMonitor } from '@/components/sideshift/shift-monitor';

export default function ShiftHistory() {
  const { address } = useAccount();
  const { shifts, loading, refetch } = useUserShifts(address);

  if (loading) return <div>Loading shifts...</div>;

  return (
    <div>
      <h1>My Conversion History</h1>
      <Button onClick={refetch}>Refresh</Button>

      {shifts.map(shift => (
        <Card key={shift.id}>
          <CardHeader>
            <CardTitle>
              {shift.sourceAsset} → {shift.destAsset}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftMonitor
              shiftId={shift.id}
              onComplete={() => {
                refetch();
                toast({ title: 'Shift completed!' });
              }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Example 4: Custom Currency Selection

```tsx
// app/custom-fund/page.tsx
import { useState } from 'react';
import { CurrencySelector } from '@/components/sideshift/currency-selector';
import { useSideshift } from '@/hooks/use-sideshift';

export default function CustomFund() {
  const [sourceCoin, setSourceCoin] = useState('BTC');
  const [amount, setAmount] = useState('');
  const { createShift, loading } = useSideshift();

  const handleFund = async () => {
    const shift = await createShift({
      pollId: '1',
      userAddress: '0x...',
      purpose: 'fund_poll',
      sourceCoin,
      destCoin: 'ETH',
      sourceAmount: amount
    });

    if (shift) {
      console.log('Deposit to:', shift.depositAddress);
    }
  };

  return (
    <div>
      <CurrencySelector
        value={sourceCoin}
        onValueChange={setSourceCoin}
      />

      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />

      <Button onClick={handleFund} disabled={loading}>
        {loading ? 'Creating shift...' : 'Get Deposit Address'}
      </Button>
    </div>
  );
}
```

## Error Handling

### Common Errors in Frontend

#### 1. "Failed to fetch supported assets"
**Cause:** Backend API unreachable or SideShift API down
**User Impact:** Currency selector shows empty
**Handling:** Display error message, provide retry button

```tsx
const { assets, error, refetch } = useSupportedAssets();

{error && (
  <Alert variant="destructive">
    <AlertTitle>Error loading cryptocurrencies</AlertTitle>
    <AlertDescription>
      {error}
      <Button onClick={refetch}>Retry</Button>
    </AlertDescription>
  </Alert>
)}
```

#### 2. "Poll does not exist"
**Cause:** Invalid poll ID or poll not indexed
**User Impact:** Cannot create shift
**Handling:** Show error, validate poll ID before opening dialog

#### 3. "Poll has not ended yet"
**Cause:** Attempting to claim rewards before end time
**User Impact:** Cannot claim
**Handling:** Disable claim button, show countdown to end time

```tsx
const canClaim = poll.endTime < Date.now() && poll.totalFunding > 0;

<Button disabled={!canClaim}>
  {canClaim ? 'Claim Rewards' : `Ends in ${timeRemaining}`}
</Button>
```

#### 4. "Shift creation failed"
**Cause:** Network error, validation failure, or SideShift API error
**User Impact:** Deposit address not generated
**Handling:** Toast error notification, allow retry

```tsx
const { createShift } = useSideshift();

try {
  const shift = await createShift(params);
} catch (error) {
  toast({
    variant: 'destructive',
    title: 'Failed to create shift',
    description: error.message
  });
}
```

#### 5. "Shift expired"
**Cause:** User didn't deposit within 10-15 minute window
**User Impact:** Deposit address no longer valid
**Handling:** Show expired status, offer to create new shift

```tsx
{shift.status === 'expired' && (
  <Alert>
    <AlertTitle>Shift Expired</AlertTitle>
    <AlertDescription>
      This deposit address has expired.
      <Button onClick={createNewShift}>Create New Shift</Button>
    </AlertDescription>
  </Alert>
)}
```

### Error Toast Patterns

All hooks use consistent toast notifications:

```tsx
// Success
toast({
  title: 'Shift created',
  description: 'Deposit address generated'
});

// Error
toast({
  variant: 'destructive',
  title: 'Error',
  description: error.message
});

// Info
toast({
  title: 'Shift completed',
  description: 'Funds received successfully'
});
```

## Testing Guide

### 1. Local Development

```bash
# Start backend API first
cd ../mntlpulse-api
npm run dev

# Start frontend
cd mntlpulse-app
npm run dev

# Open http://localhost:3000
```

### 2. Test Fund Poll Flow

1. Navigate to polls page
2. Click "Fund with Crypto" on any poll
3. Select "BTC" from currency dropdown
4. Enter amount: `0.001`
5. Click "Get Deposit Address"
6. Verify deposit address displays with QR code
7. Copy address
8. Send small amount from testnet wallet
9. Watch status update in real-time
10. Verify success notification

### 3. Test Claim Rewards Flow

1. Create a test poll with past end time
2. Fund the poll with test ETH
3. Navigate to rewards page
4. Click "Claim Rewards"
5. Select "USDT" as destination currency
6. Click "Claim in USDT"
7. Monitor status updates
8. Verify completion (currently requires manual backend intervention)

### 4. Test Currency Selector

1. Open any dialog with currency selector
2. Click dropdown
3. Verify 100+ currencies load
4. Test search functionality
5. Select different currencies
6. Verify selection persists

### 5. Test Shift Monitor

1. Create a shift
2. Observe initial "waiting" status
3. Make deposit
4. Watch status progress: waiting → processing → settling → settled
5. Verify transaction hashes appear
6. Click transaction links to verify block explorer opens

### 6. Test Error Scenarios

```tsx
// Test network error
// Stop backend and try to create shift

// Test invalid poll ID
// Use non-existent poll ID

// Test expired shift
// Wait 15 minutes after creating shift without depositing
```

## Current Limitations

### 1. Manual Poll Funding (Frontend)
**Issue:** After receiving converted ETH from SideShift, users must manually call `fundPollWithETH()` from their wallet

**Current Flow:**
```
User deposits BTC → SideShift converts → User receives ETH → User manually funds poll
```

**Desired Flow:**
```
User deposits BTC → SideShift converts → Backend auto-funds poll → Done
```

**Workaround:** Instruct users to fund poll after receiving ETH notification

### 2. Manual Reward Withdrawal (Backend)
**Issue:** Backend cannot automatically call `contract.withdrawFunds()` when user claims rewards

**Impact:** Claim flow is incomplete without backend wallet

**Temporary Solution:** Poll creator must manually withdraw to SideShift deposit address

### 3. No User Preferences
**Issue:** Users must select cryptocurrency every time

**Desired:** Save preferred currency (e.g., "always claim in USDT")

**Wave 2 Feature:** Will be implemented with user preferences system

### 4. No Shift History Page
**Current:** Shifts only visible during active conversion

**Desired:** Dedicated page showing all past conversions

**Workaround:** Use `useUserShifts()` hook in custom component

### 5. No Analytics
**Current:** No tracking of popular currencies or conversion rates

**Wave 2 Feature:** Analytics dashboard will include SideShift metrics

## Best Practices

### 1. Always Use Hooks
```tsx
// ✓ Good
const { createShift } = useSideshift();
await createShift(params);

// ✗ Bad
import axios from 'axios';
await axios.post('/api/sideshift/create-shift', params);
```

### 2. Handle Loading States
```tsx
const { createShift, loading } = useSideshift();

<Button disabled={loading}>
  {loading ? 'Creating shift...' : 'Get Deposit Address'}
</Button>
```

### 3. Use Shift Monitor for Status
```tsx
// ✓ Good - Automatic updates
<ShiftMonitor shiftId={shift.id} />

// ✗ Bad - Manual polling
useEffect(() => {
  const interval = setInterval(() => {
    fetch(`/api/shift-status/${shiftId}`);
  }, 5000);
}, []);
```

### 4. Provide User Feedback
```tsx
const { createShift } = useSideshift();

const handleCreate = async () => {
  try {
    const shift = await createShift(params);
    toast({ title: 'Shift created successfully' });
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Failed to create shift',
      description: error.message
    });
  }
};
```

### 5. Validate Before API Calls
```tsx
// Check poll exists and is valid
const { poll } = usePoll(pollId);

if (!poll) {
  return <div>Poll not found</div>;
}

// Check poll ended before allowing claim
const canClaim = poll.endTime < Date.now();

<ClaimRewardsDialog
  poll={poll}
  disabled={!canClaim}
/>
```

## Support Resources

### Internal Documentation
- **Backend Integration:** `../mntlpulse-api/SIDESHIFTAI.md`
- **Usage Guide:** `SIDESHIFT_USAGE.md`
- **Integration Status:** `FRONTEND_INTEGRATION_COMPLETE.md`

### External Resources
- **SideShift AI Docs:** https://sideshift.ai/api
- **SideShift Status:** https://status.sideshift.ai
- **Supported Assets:** https://sideshift.ai/coins

### Getting Help

**Backend Issues:**
- Check `mntlpulse-api` logs
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is running

**Frontend Issues:**
- Check browser console for errors
- Verify wallet is connected
- Check network (Base Mainnet or Sepolia)

**SideShift Issues:**
- Check shift status via API
- Verify deposit was sent to correct address
- Check SideShift status page

---

## Summary

The SideShift AI integration in the frontend is complete and production-ready with:

✅ Comprehensive React hooks for all operations
✅ Polished UI components (dialogs, selectors, monitors)
✅ Real-time status monitoring
✅ Error handling and user feedback
✅ Support for 100+ cryptocurrencies

**Pending for full automation:**
- Backend wallet for automated contract calls
- User preference storage
- Shift history page
- Analytics integration

All components follow React best practices and integrate seamlessly with the Mantle Pulse application architecture.
