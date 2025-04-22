import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use a default local PostgreSQL connection if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/contextual_intelligence';

// Check if we're in development mode and using a mock database
const useMockDb = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DB === 'true';

let pool;
let db;

if (useMockDb) {
  console.log('Using mock database for development');
  // Create a mock implementation
  const mockPool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({}),
    end: async () => {},
  };
  pool = mockPool;
  db = {
    select: () => ({ from: () => [] }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ where: () => ({ returning: () => [] }) }),
  };
} else {
  // Use the real PostgreSQL connection
  pool = new Pool({ connectionString: DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };