import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Nạp app/.env.local rồi app/.env nếu có. Ưu tiên: biến có sẵn trong môi trường > .env.local > .env
 * (loadEnvFile không ghi đè biến đã có).
 */
export function loadLocalEnv(): void {
  for (const file of ['../../.env.local', '../../.env']) {
    try {
      process.loadEnvFile(path.resolve(__dirname, file));
    } catch (_e) {
      void _e;
    }
  }
}

/** Đọc biến môi trường bắt buộc, thiếu thì báo lỗi rõ ràng (không có giá trị mặc định). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Thiếu biến môi trường ${name}. Sao chép app/.env.example thành app/.env (Supabase cloud) hoặc app/.env.local (Supabase local) rồi điền giá trị (xem docs/van-hanh.md).`
    );
  }
  return value;
}

/** Chuỗi kết nối DB cho script: ưu tiên kết nối trực tiếp, không có giá trị mặc định. */
export function databaseUrl(): string {
  return process.env.DATABASE_URL_DIRECT?.trim() || requireEnv('DATABASE_URL');
}

/** Ẩn mật khẩu trong chuỗi kết nối trước khi in ra màn hình. */
export function maskDbUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ':***@');
}
