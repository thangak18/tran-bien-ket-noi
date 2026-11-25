import { defineConfig } from '@playwright/test';

// Nạp app/.env.local rồi app/.env (SEED_STAFF_PASSWORD, khoá Supabase...) cho tiến trình kiểm thử.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch (_e) {
    void _e;
  }
}

/**
 * E2E chế độ API: giao diện chạy với VITE_DATA_SOURCE=api, API Hono chạy trong Vite dev server,
 * dữ liệu ở Supabase local (Docker). Chạy: `npm run test:e2e:api` (cần `npx supabase start --workdir ..`).
 */
export default defineConfig({
  testDir: './tests/e2e-api',
  globalSetup: './tests/e2e-api/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    browserName: 'chromium',
    // Dùng Google Chrome cài sẵn trên máy; máy chưa có trình duyệt do Playwright tải về.
    channel: process.env.PW_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_DATA_SOURCE: 'api' },
  },
});
