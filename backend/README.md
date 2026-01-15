# Mantle Pulse API

Backend API for Mantle Pulse - Handles Sideshift AI integration for cross-chain poll funding and reward claims.

## Features

- 🔄 Sideshift AI integration for cryptocurrency conversions
- 💰 Poll funding with any supported cryptocurrency
- 🎁 Reward claims in user's preferred currency
- 🔔 Webhook handling for shift status updates
- 📊 Shift tracking and status monitoring

## Architecture

```
Frontend (mntlpulse-app) → Backend API (mntlpulse-api) → Sideshift AI
                                ↓
                         Smart Contract (PulseChain)
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Sideshift Integration

- `POST /api/sideshift/create-shift` - Create a new shift order
- `GET /api/sideshift/shift-status/:id` - Get shift status
- `GET /api/sideshift/supported-assets` - Get list of supported cryptocurrencies
- `POST /api/sideshift/webhook` - Webhook endpoint for Sideshift callbacks

### Health Check

- `GET /health` - API health check

## Project Structure

```
src/
├── routes/          # API route handlers
├── services/        # Business logic (Sideshift client, blockchain)
├── types/           # TypeScript types and interfaces
├── utils/           # Helper functions
├── db/              # Database models and queries
├── config/          # Configuration files
├── middleware/      # Express middleware
└── index.ts         # Application entry point
```

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Blockchain**: viem (Ethereum library)
- **Database**: PostgreSQL or Redis (configurable)
- **Validation**: Zod
- **HTTP Client**: Axios

## Development

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linting
npm run type-check   # Run TypeScript type checking
```

## Environment Variables

See `.env.example` for required environment variables.

## License

ISC
