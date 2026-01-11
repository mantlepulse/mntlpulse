import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// For query client (pooled connections for regular queries)
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// For migration client (single connection for migrations)
export const migrationClient = postgres(connectionString, { max: 1 });

// Export types
export type Database = typeof db;
