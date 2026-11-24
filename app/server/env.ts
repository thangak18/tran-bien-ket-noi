import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if present
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch {}
try {
  process.loadEnvFile(path.resolve(__dirname, '../../.env.local'));
} catch {}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_DIRECT: z.string().optional(),
  CITIZEN_JWT_SECRET: z.string().min(32, 'CITIZEN_JWT_SECRET must be at least 32 characters'),
  OWNER_KEY_PEPPER: z.string().min(1, 'OWNER_KEY_PEPPER is required'),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
  SUPABASE_URL: z.string().default('http://127.0.0.1:54321'),
  SUPABASE_ANON_KEY: z.string().default('local-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('local-service-role-key'),
  OTP_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  SMS_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  ALLOW_MOCK_OTP: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  DEMO_MODE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  SEED_STAFF_PASSWORD: z.string().default('TranBien@2026!'),
});

export const env = envSchema.parse(process.env);
