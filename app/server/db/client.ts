import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '../env';

export const sqlClient = postgres(env.DATABASE_URL, {
  // Supabase cloud dùng Transaction Pooler (Supavisor, port 6543): không hỗ trợ prepared statement.
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sqlClient, { schema });
