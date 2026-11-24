import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { runSeed } from './seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch {}

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DATABASE_URL =
  process.env.DATABASE_URL_DIRECT ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/tranbien';

const sql = postgres(DATABASE_URL, { max: 1 });

async function resetDemo() {
  if (!DEMO_MODE) {
    console.error('❌ LỖI: demo:reset bị từ chối vì DEMO_MODE !== true (Bảo vệ dữ liệu thật)');
    process.exit(1);
  }
  console.log('🔄 Đang khôi phục lại dữ liệu mẫu 64 hồ sơ...');
  await runSeed();
  console.log('✅ Khôi phục dữ liệu mẫu hoàn tất!');
}

async function setClock(mode: 'fixed' | 'real', fixedAt?: string) {
  if (!DEMO_MODE) {
    console.error('❌ LỖI: demo:clock bị từ chối vì DEMO_MODE !== true');
    process.exit(1);
  }

  const value =
    mode === 'fixed'
      ? { mode: 'fixed', fixedAt: fixedAt || '2026-11-24T09:00:00+07:00' }
      : { mode: 'real' };

  await sql`
    INSERT INTO app_settings (key, value)
    VALUES ('clock', ${sql.json(value)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `;

  console.log(`✅ Đã chuyển đồng hồ hệ thống sang chế độ: ${mode} (${mode === 'fixed' ? (value as any).fixedAt : 'Thời gian thực'})`);
}

async function main() {
  const action = process.argv[2];
  try {
    switch (action) {
      case 'reset':
        await resetDemo();
        break;
      case 'clock':
        await setClock(process.argv[3] as any, process.argv[4]);
        break;
      default:
        console.log(`
Sử dụng:
  npm run demo:reset
  npm run demo:clock <fixed|real> [iso_string]
        `);
    }
  } catch (err: any) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
