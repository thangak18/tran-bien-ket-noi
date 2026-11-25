import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '../env';

export const sqlClient = postgres(env.DATABASE_URL, {
  // Supabase cloud dùng Transaction Pooler (Supavisor, port 6543): không hỗ trợ prepared statement.
  prepare: false,
  // Vercel đóng băng function giữa hai lần gọi: mỗi instance chỉ giữ 1 kết nối, đóng khi nhàn rỗi 20 giây
  // và thay mới sau tối đa 5 phút để không dùng lại kết nối đã bị pooler cắt (AC-API-13).
  max: process.env.VERCEL ? 1 : 10,
  idle_timeout: 20,
  max_lifetime: 300,
  connect_timeout: 10,
});

export const db = drizzle(sqlClient, { schema });
