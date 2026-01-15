# Mantle Pulse API - Quick Start

## 🚀 Get Started in 2 Minutes

```bash
# Navigate to API directory
cd mntlpulse-api

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Server will start on **http://localhost:3001**

## ✅ Verify Installation

```bash
# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"...","environment":"development"}
```

## 📁 Project Structure

```
mntlpulse-api/
├── src/
│   ├── config/          # Environment & contract configuration
│   │   ├── env.ts
│   │   └── contracts.ts
│   ├── db/              # Database/storage layer
│   │   └── memory-storage.ts
│   ├── middleware/      # Express middleware
│   │   ├── error-handler.ts
│   │   └── webhook-auth.ts
│   ├── routes/          # API route handlers
│   │   └── sideshift.routes.ts
│   ├── services/        # Business logic
│   │   ├── sideshift.service.ts
│   │   └── blockchain.service.ts
│   ├── types/           # TypeScript types
│   │   ├── sideshift.types.ts
│   │   ├── app.types.ts
│   │   └── index.ts
│   ├── utils/           # Utilities
│   │   ├── validators.ts
│   │   └── logger.ts
│   └── index.ts         # Application entry point
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## 🔑 Key Files

### 1. `src/index.ts`
Main application entry point with Express server setup.

### 2. `src/routes/sideshift.routes.ts`
All API endpoints for Sideshift integration:
- `POST /api/sideshift/create-shift` - Create new shift
- `GET /api/sideshift/shift-status/:id` - Get shift status
- `GET /api/sideshift/supported-assets` - List supported coins
- `POST /api/sideshift/webhook` - Webhook callback
- `GET /api/sideshift/user/:address` - Get user's shifts
- `GET /api/sideshift/poll/:pollId` - Get poll's shifts

### 3. `src/services/sideshift.service.ts`
Sideshift AI API client with all integration methods.

### 4. `src/services/blockchain.service.ts`
PulseChain smart contract interactions.

### 5. `src/config/env.ts`
Environment configuration with validation.

## 🧪 Test the API

### 1. Get Supported Assets
```bash
curl http://localhost:3001/api/sideshift/supported-assets
```

### 2. Create a Test Shift
```bash
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

## ⚙️ Configuration

Edit `.env` to configure:

```bash
# Server
PORT=3001
NODE_ENV=development

# Blockchain
PULSECHAIN_RPC_URL=https://rpc.pulsechain.com

# Frontend (for CORS)
FRONTEND_URL=http://localhost:3000

# Webhook Secret
WEBHOOK_SECRET=dev_webhook_secret_change_this_in_production_min_32_chars
```

## 📝 Update Contract Address

Before using in production, update contract address in `src/config/contracts.ts`:

```typescript
export const POLLS_CONTRACT_ADDRESS: Address = '0xYOUR_CONTRACT_ADDRESS_HERE';
```

## 🔄 Development Workflow

1. Make changes to source files in `src/`
2. Server auto-reloads (using tsx watch)
3. Test endpoints with curl or frontend
4. Check logs in terminal

## 📖 Documentation

- **SETUP.md** - Detailed setup and deployment guide
- **INTEGRATION.md** - Frontend integration guide
- **README.md** - Project overview

## 🎯 Next Steps

1. ✅ API is running
2. Update contract address in `src/config/contracts.ts`
3. Follow `INTEGRATION.md` to connect frontend
4. Read `SETUP.md` for production deployment

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### TypeScript errors
```bash
npm run type-check
```

### Build fails
```bash
npm run clean
npm run build
```

## 🌐 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/api/sideshift/supported-assets` | List supported cryptocurrencies |
| POST | `/api/sideshift/create-shift` | Create new shift order |
| GET | `/api/sideshift/shift-status/:id` | Get shift status |
| POST | `/api/sideshift/webhook` | Sideshift webhook callback |
| GET | `/api/sideshift/user/:address` | Get user's shifts |
| GET | `/api/sideshift/poll/:pollId` | Get poll's shifts |

## 🚀 Production Build

```bash
npm run build
npm start
```

## ✨ Features Implemented

- ✅ Sideshift AI integration
- ✅ Fixed and variable rate shifts
- ✅ Poll funding with any crypto
- ✅ Reward claims in any crypto
- ✅ Webhook handling
- ✅ Request validation
- ✅ Error handling
- ✅ CORS configuration
- ✅ TypeScript types
- ✅ In-memory storage (dev)
- ✅ Logging

## 📚 Resources

- [Sideshift AI API](https://sideshift.ai/api)
- [PulseChain Docs](https://docs.pulsechain.com)
- [Express.js](https://expressjs.com)
- [Viem](https://viem.sh)
