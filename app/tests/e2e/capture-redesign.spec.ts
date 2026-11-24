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
    await page.waitForTimeout(600);
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

    // Kiểm tra /quanh-day trên mobile 390x844
    await page.goto('/quanh-day');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const mobileTiles = await page.locator('.leaflet-tile').count();
    const mobileMarkers = await page.locator('.map-marker-div').count();
    console.log(`Mobile (390x844) /quanh-day: tiles=${mobileTiles}, markers=${mobileMarkers}`);
  });

  test('Capture tablet screenshot 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // 13-tablet-phan-anh-768.png
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, '13-tablet-phan-anh-768.png'),
      fullPage: false,
    });
  });

  test('Capture desktop screenshots 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 09-can-bo.png
    await page.goto('/can-bo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '09-can-bo.png'), fullPage: false });

    // 10-desktop-phan-anh-1440.png
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, '10-desktop-phan-anh-1440.png'),
      fullPage: false,
    });

    // 11-desktop-chi-tiet-1440.png
    await page.goto('/phan-anh/TB-0041');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, '11-desktop-chi-tiet-1440.png'),
      fullPage: false,
    });

    // 12-desktop-gui-1440.png
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
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, '12-desktop-gui-1440.png'),
      fullPage: false,
    });

    // 14-desktop-ban-do-1440.png (/quanh-day trên desktop)
    await page.goto('/quanh-day');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const desktopTiles = await page.locator('.leaflet-tile').count();
    const desktopMarkers = await page.locator('.map-marker-div').count();
    console.log(`Desktop (1440x900) /quanh-day: tiles=${desktopTiles}, markers=${desktopMarkers}`);
    await page.screenshot({
      path: path.join(outDir, '14-desktop-ban-do-1440.png'),
      fullPage: false,
    });
  });

  test('Capture bonus screenshots (B1, B2, B3, B5)', async ({ page }) => {
    test.setTimeout(60000);

    // 1. B3 Chữ lớn - Mobile 390x844 (bấm nút Aa tròn 40px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Chế độ chữ lớn/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b3-chu-lon-390.png'),
      fullPage: false,
    });

    // 2. B3 Chữ lớn - Desktop 1440x900 (bấm nút Aa Chữ lớn trên DesktopHeader)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b3-chu-lon-1440.png'),
      fullPage: false,
    });

    // Tắt chữ lớn
    await page.getByRole('button', { name: /Chế độ chữ lớn/i }).click();
    await page.waitForTimeout(300);

    // 3. B2 Tôi cũng gặp - Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/phan-anh/TB-0041');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b2-toi-cung-gap-390.png'),
      fullPage: false,
    });

    // 4. B2 Tôi cũng gặp - Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/phan-anh/TB-0041');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b2-toi-cung-gap-1440.png'),
      fullPage: false,
    });

    // 5. B1 AI gợi ý & B2 Cảnh báo trùng - Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      let state: Record<string, unknown> = {};
      try {
        state = JSON.parse(localStorage.getItem('tbkn:v1') || '{}');
      } catch {
        // ignore parse error
      }
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
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b1-ai-b2-trung-390.png'),
      fullPage: false,
    });

    // 6. B1 AI gợi ý & B2 Cảnh báo trùng - Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/bao-su-co/xac-nhan');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b1-ai-b2-trung-1440.png'),
      fullPage: false,
    });

    // 7. B5 Gửi hộ (Cán bộ) - Desktop 1440x900
    await page.evaluate(() => localStorage.clear());
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/can-bo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    // Bấm nút "Tạo phản ánh hộ"
    await page.locator('[data-testid="btn-create-proxy"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b5-gui-ho-1440.png'),
      fullPage: false,
    });

    // 8. B2 Gộp/tách (Cán bộ) - Desktop 1440x900
    await page.goto('/can-bo/TB-0041');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(outDir, 'bonus-b2-gop-tach-1440.png'),
      fullPage: false,
    });
  });
});
