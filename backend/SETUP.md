# BasePulse API Setup Guide

Complete guide for setting up and integrating the Sideshift AI backend.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server will start on http://localhost:3001
```

## Environment Configuration

The `.env` file is already configured for development. For production:

```bash
# Generate a secure webhook secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env with the generated secret
WEBHOOK_SECRET=<your-generated-secret>
```

### Important Environment Variables

- `PULSECHAIN_RPC_URL` - RPC endpoint for PulseChain
- `WEBHOOK_SECRET` - Secret for webhook signature verification (min 32 chars)
- `FRONTEND_URL` - Your frontend URL for CORS
- `SIDESHIFT_AFFILIATE_ID` - (Optional) Your Sideshift affiliate ID

## API Endpoints

### 1. Get Supported Assets

```http
GET /api/sideshift/supported-assets
```

Returns list of all cryptocurrencies supported by Sideshift.

**Response:**
```json
{
  "assets": [
    {
      "coin": "BTC",
      "name": "Bitcoin",
      "networks": ["bitcoin"]
    }
  ],
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### 2. Create Shift

```http
POST /api/sideshift/create-shift
```

**Request Body:**
```json
{
  "pollId": "1",
  "userAddress": "0x...",
  "purpose": "fund_poll",
  "sourceCoin": "BTC",
  "destCoin": "ETH",
  "sourceAmount": "0.001"  // Optional, for fixed-rate shifts
}
```

**Response:**
```json
{
  "shift": {
    "id": "uuid",
    "sideshiftOrderId": "...",
    "depositAddress": "bc1q...",
    "status": "waiting"
  },
  "sideshift": {
    "orderId": "...",
    "depositAddress": "bc1q...",
    "depositCoin": "BTC",
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

### 3. Get Shift Status

```http
GET /api/sideshift/shift-status/:id
```

Returns current status of a shift.

### 4. Webhook Endpoint

```http
POST /api/sideshift/webhook
```

Sideshift will POST here when shift status changes. Requires valid signature.

### 5. Get User's Shifts

```http
GET /api/sideshift/user/:address
```

### 6. Get Poll's Shifts

```http
GET /api/sideshift/poll/:pollId
```

## Integration Flow

### Scenario 1: Poll Funding with BTC

```
1. Frontend: User selects BTC to fund poll
   ↓
2. Frontend → POST /api/sideshift/create-shift
   {
     "pollId": "1",
     "userAddress": "0x...",
     "purpose": "fund_poll",
     "sourceCoin": "BTC",
     "destCoin": "ETH"
   }
   ↓
3. Backend: Creates Sideshift order
   ↓
4. Frontend: Displays BTC deposit address
   ↓
5. User: Sends BTC to deposit address
   ↓
6. Sideshift: Processes shift → Sends webhook
   ↓
7. Backend: Receives webhook → Updates status
   ↓
8. Backend: When settled, sends ETH to poll contract
   ↓
9. Frontend: Poll shows new funding
```

### Scenario 2: Claim Rewards in USDT

```
1. Poll ends, winner wants USDT
   ↓
2. Frontend → POST /api/sideshift/create-shift
   {
     "pollId": "1",
     "userAddress": "0x...",
     "purpose": "claim_reward",
     "sourceCoin": "ETH",
     "destCoin": "USDT"
   }
   ↓
3. Backend: Validates poll ended + has funds
   ↓
4. Backend: Creates Sideshift order
   ↓
5. Backend: Calls contract.withdrawFunds(pollId, sideshiftDepositAddress)
   ↓
6. Sideshift: Receives ETH → Sends USDT to user
   ↓
7. Webhook: Confirms completion
   ↓
8. Frontend: Shows success
```

## Frontend Integration

### Install API Client

```bash
# In basepulse-app directory
npm install axios
```

### Create API Client

```typescript
// lib/api/sideshift-client.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const sideshiftAPI = {
  getSupportedAssets: async () => {
    const { data } = await axios.get(`${API_URL}/api/sideshift/supported-assets`);
    return data;
  },

  createShift: async (params: {
    pollId: string;
    userAddress: string;
    purpose: 'fund_poll' | 'claim_reward';
    sourceCoin: string;
    destCoin: string;
    sourceAmount?: string;
  }) => {
    const { data } = await axios.post(`${API_URL}/api/sideshift/create-shift`, params);
    return data;
  },

  getShiftStatus: async (shiftId: string) => {
    const { data } = await axios.get(`${API_URL}/api/sideshift/shift-status/${shiftId}`);
    return data;
  },

  getUserShifts: async (address: string) => {
    const { data } = await axios.get(`${API_URL}/api/sideshift/user/${address}`);
    return data;
  },
};
```

### Example React Component

```typescript
// components/claim-rewards-modal.tsx
'use client';

import { useState } from 'react';
import { sideshiftAPI } from '@/lib/api/sideshift-client';
import { useAccount } from 'wagmi';

export function ClaimRewardsModal({ pollId }: { pollId: string }) {
  const { address } = useAccount();
  const [selectedCoin, setSelectedCoin] = useState('USDT');
  const [shift, setShift] = useState(null);

  const handleClaim = async () => {
    const result = await sideshiftAPI.createShift({
      pollId,
      userAddress: address!,
      purpose: 'claim_reward',
      sourceCoin: 'ETH',
      destCoin: selectedCoin,
    });

    setShift(result.shift);
    // Poll for status updates or use webhooks
  };

  return (
    <div>
      <select value={selectedCoin} onChange={(e) => setSelectedCoin(e.target.value)}>
        <option value="USDT">USDT</option>
        <option value="BTC">Bitcoin</option>
        <option value="USDC">USDC</option>
      </select>

      <button onClick={handleClaim}>
        Claim in {selectedCoin}
      </button>

      {shift && (
        <div>
          Processing... Status: {shift.status}
        </div>
      )}
    </div>
  );
}
```

## Database Setup (Production)

Currently using in-memory storage. For production, implement PostgreSQL:

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY,
  sideshift_order_id VARCHAR(255) UNIQUE NOT NULL,
  poll_id VARCHAR(255) NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  purpose VARCHAR(20) NOT NULL,
  source_asset VARCHAR(10) NOT NULL,
  dest_asset VARCHAR(10) NOT NULL,
  source_network VARCHAR(50) NOT NULL,
  dest_network VARCHAR(50) NOT NULL,
  source_amount VARCHAR(255),
  dest_amount VARCHAR(255),
  deposit_address VARCHAR(255) NOT NULL,
  settle_address VARCHAR(255) NOT NULL,
  shift_type VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  deposit_tx_hash VARCHAR(255),
  settle_tx_hash VARCHAR(255),
  contract_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,

  INDEX idx_poll_id (poll_id),
  INDEX idx_user_address (user_address),
  INDEX idx_sideshift_order_id (sideshift_order_id),
  INDEX idx_status (status)
);
```

Then implement `src/db/postgres-storage.ts` following the `ShiftStorage` interface.

## Webhook Setup

1. Deploy backend to production (e.g., Railway, Render, Fly.io)
2. Get public URL: `https://your-api.com`
3. Configure webhook in Sideshift (if they support it) or poll for updates
4. Update `WEBHOOK_SECRET` in production environment

## Security Checklist

- ✅ Webhook signature verification implemented
- ✅ CORS configured
- ✅ Input validation with Zod
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: API key authentication for frontend
- ⚠️ TODO: Database connection pooling

## Testing

```bash
# Test health check
curl http://localhost:3001/health

# Test supported assets
curl http://localhost:3001/api/sideshift/supported-assets

# Test create shift
curl -X POST http://localhost:3001/api/sideshift/create-shift \
  -H "Content-Type: application/json" \
  -d '{
    "pollId": "1",
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "purpose": "fund_poll",
    "sourceCoin": "BTC",
    "destCoin": "ETH"
  }'
```

## Deployment

### Option 1: Railway

```bash
railway login
railway init
railway up
```

### Option 2: Render

Create `render.yaml`:
```yaml
services:
  - type: web
    name: basepulse-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

### Option 3: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Next Steps

1. ✅ Backend API is ready
2. Update `POLLS_CONTRACT_ADDRESS` in `src/config/contracts.ts`
3. Integrate frontend components
4. Set up production database
5. Deploy backend
6. Configure webhooks
7. Test end-to-end flow

## Support

For questions or issues:
- Sideshift AI Docs: https://sideshift.ai/api
- PulseChain Docs: https://docs.pulsechain.com
