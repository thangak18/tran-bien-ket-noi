import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nạp .env.local nếu có. Biến đã có sẵn trong môi trường (Vercel env, CI) luôn được ưu tiên.
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch (_e) {
  void _e;
}
try {
  process.loadEnvFile(path.resolve(__dirname, '../../.env.local'));
} catch (_e) {
  void _e;
}

const requiredString = (name: string, min = 1) =>
  z
    .string({ required_error: `${name} là bắt buộc. Xem app/.env.example và docs/van-hanh.md` })
    .min(min, `${name} là bắt buộc (tối thiểu ${min} ký tự). Xem app/.env.example`);

/**
 * Không có giá trị mặc định cho khoá, secret, pepper hay chuỗi kết nối:
 * thiếu biến nào thì server dừng ngay với thông báo nêu đúng tên biến đó.
 * (SEED_STAFF_PASSWORD chỉ dùng cho script seed, không thuộc cấu hình API.)
 */
const envSchema = z.object({
  DATABASE_URL: requiredString('DATABASE_URL'),
  DATABASE_URL_DIRECT: z.string().optional(),
  CITIZEN_JWT_SECRET: requiredString('CITIZEN_JWT_SECRET', 32),
  SUPABASE_JWT_SECRET: requiredString('SUPABASE_JWT_SECRET', 32),
  OWNER_KEY_PEPPER: requiredString('OWNER_KEY_PEPPER', 16),
  CRON_SECRET: requiredString('CRON_SECRET', 16),
  SUPABASE_URL: requiredString('SUPABASE_URL').url('SUPABASE_URL phải là một URL hợp lệ'),
  SUPABASE_ANON_KEY: requiredString('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: requiredString('SUPABASE_SERVICE_ROLE_KEY'),
  OTP_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  SMS_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  ALLOW_MOCK_OTP: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  DEMO_MODE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Cấu hình môi trường không hợp lệ:\n${lines.join('\n')}`);
}

export const env = parsed.data;
