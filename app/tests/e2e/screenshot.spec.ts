import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.use({ browserName: 'chromium' });

test('capture p3-ui-390 screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/ui');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=P3 UI Gallery');
  // Chờ bản đồ và các component render ổn định
  await page.waitForTimeout(1500);

  const outputPath = path.resolve(__dirname, '../../../docs/review/p3-ui-390.png');
  await page.screenshot({ path: outputPath, fullPage: true });
});
