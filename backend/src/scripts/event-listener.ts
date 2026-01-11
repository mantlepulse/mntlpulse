#!/usr/bin/env tsx
/**
 * Event Listener CLI
 * Starts the blockchain event listener service
 */

import 'dotenv/config';
import { eventListenerService } from '../services/event-listener.service';

async function main() {
  const command = process.argv[2];

  console.log('MantlePulse Event Listener CLI');
  console.log('============================\n');

  try {
    switch (command) {
      case 'start':
        console.log('Starting event listener...');
        await eventListenerService.startListening();
        console.log('Event listener is running. Press Ctrl+C to stop.\n');

        // Keep the process running
        process.on('SIGINT', () => {
          console.log('\nStopping event listener...');
          eventListenerService.stopListening();
          process.exit(0);
        });

        process.on('SIGTERM', () => {
          console.log('\nStopping event listener...');
          eventListenerService.stopListening();
          process.exit(0);
        });

        // Keep alive
        await new Promise(() => {});
        break;

      case 'sync':
        const fromBlock = process.argv[3] ? BigInt(process.argv[3]) : 0n;
        const toBlock = process.argv[4] ? BigInt(process.argv[4]) : undefined;

        console.log(`Syncing historical events from block ${fromBlock}${toBlock ? ` to ${toBlock}` : ''}...`);
        await eventListenerService.syncHistoricalEvents(fromBlock, toBlock);
        console.log('Historical sync completed!');
        process.exit(0);
        break;

      default:
        console.log('Usage:');
        console.log('  npm run event-listener start           - Start listening to new events');
        console.log('  npm run event-listener sync <from> [to] - Sync historical events');
        console.log('\nExamples:');
        console.log('  npm run event-listener start');
        console.log('  npm run event-listener sync 0');
        console.log('  npm run event-listener sync 1000000 2000000');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
