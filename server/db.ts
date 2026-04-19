import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create PostgreSQL connection pool
// Ensure SSL for managed providers like Supabase, Render, Railway, etc.
const useSsl = /supabase\.co|render\.com|rlwy\.net|sslmode=require/i.test(connectionString);
const pool = new Pool({ 
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
