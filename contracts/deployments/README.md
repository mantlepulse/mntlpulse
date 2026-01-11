# Deployment Tracking

This directory contains deployment information for the PollsContract across different networks.

## Files

- `base-sepolia.json` - Base Sepolia testnet deployments
- `base.json` - Base mainnet deployments

## Structure

Each deployment JSON file contains:

```json
{
  "PollsContract": {
    "proxy": "0x...",                    // Proxy contract address
    "implementation": "0x...",           // Implementation contract address
    "deployedAt": "2025-01-07",         // Deployment date
    "deployer": "0x...",                // Deployer address
    "deploymentTx": "0x...",            // Deployment transaction hash
    "network": "base-sepolia",          // Network name
    "chainId": 84532,                   // Chain ID
    "verified": true,                   // Contract verification status
    "upgrades": [                       // Upgrade history
      {
        "implementationAddress": "0x...",
        "upgradedAt": "2025-01-08",
        "upgradeTx": "0x...",
        "blockNumber": 12345
      }
    ]
  }
}
```

## Usage

### Reading Deployment Info

```typescript
import deployments from './deployments/base-sepolia.json';

const proxyAddress = deployments.PollsContract.proxy;
const implementationAddress = deployments.PollsContract.implementation;
```

### Deployment Workflow

1. **Initial Deployment**
   ```bash
   npm run deploy:sepolia  # or deploy:mainnet
   ```
   The deployment script automatically updates the corresponding JSON file.

2. **Upgrading Contract**
   ```bash
   npm run upgrade:sepolia  # or upgrade:mainnet
   ```
   The upgrade script appends to the upgrades array in the JSON file.

## Networks

### Base Sepolia (Testnet)
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

### Base Mainnet
- Chain ID: 8453
- RPC: https://mainnet.base.org
- Explorer: https://basescan.org

## Important Notes

- These files are automatically updated by deployment and upgrade scripts
- Always commit changes to these files after deployments
- The `.openzeppelin/` directory contains additional deployment metadata managed by OpenZeppelin
- Both directories should be committed to version control
