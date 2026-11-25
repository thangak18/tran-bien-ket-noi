import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

/**
 * Kiểm tra kết nối Supabase cloud (chỉ đọc): đọc trực tiếp app/.env, bỏ qua app/.env.local.
 * Chạy: npx tsx scripts/cloud-check.ts
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.resolve(__dirname, '../.env'));

function mask(url: string): string {
  return url.replace(/:[^:@/]+@/, ':***@');
}

async function check(label: string, url: string | undefined) {
  if (!url) {
    console.log(`${label}: THIẾU biến`);
    return;
  }
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
  try {
    const [info] = await sql`
      SELECT current_user, version() AS version,
        (SELECT extversion FROM pg_extension WHERE extname = 'postgis') AS postgis_installed,
        (SELECT default_version FROM pg_available_extensions WHERE name = 'postgis') AS postgis_available,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS public_tables
    `;
    const tables = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1
    `;
    console.log(`${label}: KẾT NỐI ĐƯỢC (${mask(url)})`);
    console.log(`  user=${info?.current_user}`);
    console.log(`  ${String(info?.version).split(' on ')[0]}`);
    console.log(
      `  PostGIS đã cài=${info?.postgis_installed ?? 'chưa'}, có sẵn để cài=${info?.postgis_available ?? 'không'}`
    );
    console.log(
      `  Bảng trong public: ${info?.public_tables} ${tables.map((t) => t.table_name).join(', ')}`
    );
  } catch (err) {
    console.log(`${label}: LỖI (${mask(url)}): ${(err as Error).message}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

await check('Transaction pooler (DATABASE_URL)', process.env.DATABASE_URL);
await check('Session pooler (DATABASE_URL_DIRECT)', process.env.DATABASE_URL_DIRECT);
