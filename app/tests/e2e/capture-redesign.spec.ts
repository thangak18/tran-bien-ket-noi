import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../../../docs/review/redesign');

test.describe('Redesign Screenshots', () => {
  test('Capture mobile screenshots 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 01-phan-anh-cong-dong.png
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(outDir, '01-phan-anh-cong-dong.png'),
      fullPage: false,
    });

    // 02-ca-nhan-trong.png
    await page.goto('/?tab=ca-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '02-ca-nhan-trong.png'), fullPage: false });

    // 03-camera.png
    await page.goto('/bao-su-co/anh');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '03-camera.png'), fullPage: false });

    // 04-xac-nhan.png (có vị trí và category mẫu)
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('tbkn:v1') || '{}');
      state.draft = {
        photos: ['/demo-photos/mat_duong/1.jpg'],
        category: 'mat_duong',
        lat: 10.9505,
        lng: 106.8225,
        address: 'Đường Cách Mạng Tháng Tám, Phường Trấn Biên',
      };
      localStorage.setItem('tbkn:v1', JSON.stringify(state));
    });
    await page.goto('/bao-su-co/xac-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '04-xac-nhan.png'), fullPage: false });

    // 05-xac-nhan-chua-vi-tri.png
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('tbkn:v1') || '{}');
      state.draft = {
        photos: ['/demo-photos/mat_duong/1.jpg'],
        category: 'mat_duong',
        lat: null,
        lng: null,
        address: '',
      };
      localStorage.setItem('tbkn:v1', JSON.stringify(state));
    });
    await page.goto('/bao-su-co/xac-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(outDir, '05-xac-nhan-chua-vi-tri.png'),
      fullPage: false,
    });

    // 06-chi-tiet.png (hồ sơ đang xử lý TB-0041)
    await page.goto('/phan-anh/TB-0041');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '06-chi-tiet.png'), fullPage: false });

    // 07-chi-tiet-da-xu-ly.png (hồ sơ hoàn thành TB-0009)
    await page.goto('/phan-anh/TB-0009');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '07-chi-tiet-da-xu-ly.png'), fullPage: false });

    // 08-ho-so.png
    await page.goto('/ho-so');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '08-ho-so.png'), fullPage: false });
  });

  test('Capture desktop screenshot 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 09-can-bo.png
    await page.goto('/can-bo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '09-can-bo.png'), fullPage: false });
  });
});
