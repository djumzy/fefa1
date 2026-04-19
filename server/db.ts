import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = rawConnectionString.replace(/([?&])sslmode=require(&|$)/i, (match, lead, tail) => {
  return tail === "&" ? lead : "";
});

// Create PostgreSQL connection pool
// Ensure SSL for managed providers like Supabase, Render, Railway, etc.
const useSsl = /supabase\.co|supabase\.com|render\.com|rlwy\.net/i.test(connectionString);
const pool = new Pool({ 
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
