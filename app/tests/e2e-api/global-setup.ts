import { execSync } from 'node:child_process';

/** Đưa DB về đúng bộ dữ liệu mẫu 64 hồ sơ trước mỗi lần chạy e2e (DEMO_MODE=true trong .env.local). */
export default function globalSetup() {
  execSync('npm run demo:reset', { stdio: 'inherit' });
}
