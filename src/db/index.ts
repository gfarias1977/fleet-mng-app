import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';
import ws from 'ws';

const useLocalDB = process.env.USE_LOCAL_DB === 'true';

function createDatabaseConnection() {
  if (useLocalDB) {
    // Local PostgreSQL connection
    if (!process.env.LOCAL_DATABASE_URL) {
      throw new Error('LOCAL_DATABASE_URL is not set');
    }
    
    console.log('🔗 Connecting to LOCAL PostgreSQL database');
    const queryClient = postgres(process.env.LOCAL_DATABASE_URL);
    return drizzlePostgres(queryClient, { schema });
    
  } else {
    // Neon connection
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    
    console.log('🔗 Connecting to NEON database');
    
    // Configure WebSocket for Node.js environment
    neonConfig.webSocketConstructor = ws;
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return drizzleNeon(pool, { schema });
  }
}

export const db = createDatabaseConnection();
