import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../../../docs/review/ai');

test.describe('AI Suggestion Screenshots', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
  });

  test('Capture AI Screenshots', async ({ page }) => {
    // 1. Mobile 390x844: Băng AI gợi ý (goi-y-390.png)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => {
      let state: Record<string, unknown> = {};
      try {
        state = JSON.parse(localStorage.getItem('tbkn:v1') || '{}');
      } catch {
        // ignore
      }
      state.draft = {
        photos: ['/demo-photos/den_duong/1.jpg'],
        category: null, // Chưa chọn để thấy nút "Dùng gợi ý"
        lat: 10.9505,
        lng: 106.8225,
        address: 'Đường Cách Mạng Tháng Tám, Phường Trấn Biên',
      };
      localStorage.setItem('tbkn:v1', JSON.stringify(state));
    });
    await page.goto('/bao-su-co/xac-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'goi-y-390.png'),
      fullPage: false,
    });

    // 2. Desktop 1440x900: Băng AI gợi ý (goi-y-1440.png)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/bao-su-co/xac-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'goi-y-1440.png'),
      fullPage: false,
    });

    // 3. Mobile 390x844: Không nhận ra loại sự cố (khong-nhan-ra-390.png)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      let state: Record<string, unknown> = {};
      try {
        state = JSON.parse(localStorage.getItem('tbkn:v1') || '{}');
      } catch {
        // ignore
      }
      state.draft = {
        photos: ['/demo-photos/placeholder.jpg?unrecognized=1'],
        category: null,
        lat: 10.9505,
        lng: 106.8225,
        address: 'Đường Cách Mạng Tháng Tám, Phường Trấn Biên',
      };
      localStorage.setItem('tbkn:v1', JSON.stringify(state));
    });
    await page.goto('/bao-su-co/xac-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'khong-nhan-ra-390.png'),
      fullPage: false,
    });

    // 4. Desktop 1440x900: Cán bộ A02 chi tiết có đối chiếu AI (a02-ai-1440.png)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      let state: Record<string, unknown> = {};
      try {
        state = JSON.parse(localStorage.getItem('tbkn:v1') || '{}');
      } catch {
        // ignore
      }
      const reports = (state.reports as Array<Record<string, unknown>>) || [];
      const updated = reports.map((r) => {
        if (r.id === 'TB-0041' || r.id === 'TB-0001') {
          return {
            ...r,
            aiSuggestion: {
              category: 'mat_duong',
              confidence: 0.94,
              provider: 'deepseek',
              reason: 'Phát hiện ổ gà sụt lún nguy hiểm trên mặt đường',
            },
          };
        }
        return r;
      });
      state.reports = updated;
      localStorage.setItem('tbkn:v1', JSON.stringify(state));
    });
    await page.goto('/can-bo/ho-so/TB-0041');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'a02-ai-1440.png'),
      fullPage: false,
    });
  });
});
