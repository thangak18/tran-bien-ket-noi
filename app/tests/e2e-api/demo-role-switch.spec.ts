import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * E2E-DEMO-01 (spec v3.1, mục 13.3a, AC-ROLE-1): một trình duyệt lần lượt đóng vai người dân → cán bộ → TNV
 * → người dân, chuyển cổng bằng nút "Chuyển cổng nghiệp vụ". Phiên người dân phải còn nguyên sau khi
 * đăng nhập/đăng xuất nhân viên: lần gửi thứ hai trả 201 mà không phải đăng nhập lại.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Ảnh mẫu có sẵn trong dự án (tự chụp, không tải từ internet).
const PHOTO = path.resolve(__dirname, '../../public/demo-photos/rac_thai/1.jpg');
const CB_EMAIL = 'cb.minh@tranbien.gov.vn';
const TNV_EMAIL = 'tnv.mai@tranbien.gov.vn';
const MOBILE = { width: 390, height: 844 };

function staffPassword(): string {
  const value = process.env.SEED_STAFF_PASSWORD;
  if (!value) throw new Error('Thiếu SEED_STAFF_PASSWORD trong app/.env.local');
  return value;
}

function visibleButton(page: Page, text: string | RegExp) {
  return page.locator('button:visible', { hasText: text }).first();
}

/**
 * Bước 2 → bước 3. Hộp "Đối chiếu phản ánh tương tự" có thể tự mở khi vừa có vị trí (gần hồ sơ cùng loại)
 * hoặc mở sau khi bấm "Xác nhận vị trí"; cả hai trường hợp đều chọn gửi phản ánh mới.
 */
async function confirmLocation(page: Page) {
  const dupDialog = page.getByRole('dialog', { name: 'Đối chiếu phản ánh tương tự' });
  const notDuplicate = dupDialog.getByRole('button', { name: /Không phải – gửi phản ánh mới/ });
  await page.waitForTimeout(500);
  if (!(await dupDialog.isVisible().catch(() => false))) {
    await visibleButton(page, 'Xác nhận vị trí').click();
  }
  if (await dupDialog.isVisible().catch(() => false)) await notDuplicate.click();
  await expect(page.getByLabel('Mô tả thêm')).toBeVisible();
}

/** Mở nút chuyển cổng và chọn một cổng. */
async function switchPortal(page: Page, portal: string) {
  await page.getByRole('button', { name: 'Chuyển cổng nghiệp vụ' }).click();
  await page.getByRole('menuitem', { name: portal }).click();
}

/** Đi hết C02 → C04 tới nút "Gửi phản ánh" (chưa bấm). */
async function fillReport(page: Page, description: string) {
  await page.goto('/bao-su-co/anh');
  await page.getByTestId('gallery-input').setInputFiles(PHOTO);
  await expect(page.getByRole('img').first()).toBeVisible();
  await visibleButton(page, 'Tiếp tục').click();
  await page.waitForURL('**/bao-su-co/xac-nhan**');
  await visibleButton(page, 'Rác thải').click();
  await visibleButton(page, 'Tiếp tục chọn vị trí').click();
  await expect(page.getByLabel('Địa chỉ', { exact: true })).toHaveValue(/Trấn Biên/);
  await confirmLocation(page);
  await page.getByLabel('Mô tả thêm').fill(description);
}

function waitForCreate(page: Page) {
  return page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/citizen/reports') && r.request().method() === 'POST'
  );
}

async function staffLoginHere(page: Page, email: string, expectedPath: string) {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(staffPassword());
  await page.getByRole('button', { name: 'Đăng nhập vào hệ thống' }).click();
  await page.waitForURL(`**${expectedPath}`);
}

test('E2E-DEMO-01 Một trình duyệt: người dân → cán bộ → TNV → người dân vẫn gửi được', async ({
  browser,
}) => {
  const runId = Date.now().toString().slice(-6);
  const phone = `0977${runId}`;
  const ctx = await browser.newContext({
    viewport: MOBILE,
    geolocation: { latitude: 10.9505, longitude: 106.8225 },
    permissions: ['geolocation'],
  });
  await ctx.addInitScript(() => window.localStorage.setItem('tbkn:welcomed', '1'));
  const page = await ctx.newPage();

  // 1. Người dân gửi lần đầu: phải đăng nhập SĐT (OTP mô phỏng) rồi quay lại gửi.
  await fillReport(page, `Demo chuyển vai trò lần 1 ${runId}`);
  await visibleButton(page, 'Gửi phản ánh').click();
  await page.waitForURL('**/ho-so?login=1**');
  await page.locator('#change-phone-input').fill(phone);
  await visibleButton(page, /^Xác nhận$/).click();
  await expect(page.getByLabel('Mã OTP số 6')).toHaveValue('6');
  await visibleButton(page, 'Xác nhận & Đăng nhập').click();
  await page.waitForURL('**/bao-su-co/xac-nhan**');
  const first = waitForCreate(page);
  await visibleButton(page, 'Gửi phản ánh').click();
  expect((await first).status()).toBe(201);
  await page.waitForURL((url) => url.pathname === '/');

  // 2. Chuyển sang cổng cán bộ: chưa đăng nhập nhân viên → /dang-nhap, đăng nhập xong vào đúng cổng.
  await switchPortal(page, 'Cổng Cán bộ phường');
  await page.waitForURL('**/dang-nhap?redirect=%2Fcan-bo');
  await staffLoginHere(page, CB_EMAIL, '/can-bo');
  await expect(page.getByTestId('screen-title').locator('visible=true').first()).toBeVisible();

  // 3. Đổi sang TNV: đăng xuất cán bộ (chỉ xoá phiên nhân viên), đăng nhập TNV, vào cổng TNV.
  await page.goto('/can-bo/ho-so');
  await visibleButton(page, /Đăng xuất/).click();
  await page.waitForURL('**/dang-nhap');
  await staffLoginHere(page, TNV_EMAIL, '/tnv');
  // TNV mở cổng quản trị → 403, không vào được.
  await switchPortal(page, 'Cổng Quản trị');
  await page.waitForURL('**/khong-co-quyen?redirect=%2Fquan-tri');
  expect(await page.evaluate(() => localStorage.getItem('tb_citizen_token'))).toBeTruthy();

  // 4. Quay lại cổng người dân: vẫn đăng nhập, gửi tiếp được ngay (không chuyển sang /ho-so).
  await switchPortal(page, 'Cổng Người dân');
  await page.waitForURL((url) => url.pathname === '/');
  await fillReport(page, `Demo chuyển vai trò lần 2 ${runId}`);
  const second = waitForCreate(page);
  await visibleButton(page, 'Gửi phản ánh').click();
  const response = await second;
  expect(response.status()).toBe(201);
  expect(response.request().headers()['authorization']).toMatch(/^Bearer /);
  await page.waitForURL((url) => url.pathname === '/');
  expect(page.url()).not.toContain('/ho-so');
  await ctx.close();
});
