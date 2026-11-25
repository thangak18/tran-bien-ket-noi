import { expect, test, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteAuthUser } from '../../scripts/lib/supabase-admin';
import { sqlClient } from '../../server/db/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS = path.resolve(__dirname, '../../../docs/review/admin');
const ADMIN_EMAIL = 'admin@tranbien.gov.vn';
const ACCOUNT_EMAIL = `admin-e2e-${crypto.randomUUID()}@example.test`;
const ACCOUNT_NAME = 'Tài khoản TNV kiểm thử quản trị';

type CategorySetting = {
  category: string;
  sla_days: number;
  default_department_id: string | null;
};

async function loginAdmin(page: Page, password: string) {
  await page.goto('/dang-nhap');
  await page.getByRole('button', { name: 'Quản trị', exact: true }).click();
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập vào hệ thống' }).click();
  await page.waitForURL('**/quan-tri');
}

async function saveScreenshot(page: Page, filename: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS, filename), fullPage: false });
}

test.describe.serial('ADMIN: luồng tài khoản và cấu hình trên giao diện', () => {
  let adminPassword = '';
  let createdUserId = '';
  let originalSettings: CategorySetting[] = [];

  test.beforeAll(async () => {
    adminPassword = process.env.SEED_ADMIN_PASSWORD ?? '';
    if (!adminPassword) {
      throw new Error('Thiếu SEED_ADMIN_PASSWORD trong app/.env.local');
    }

    originalSettings = await sqlClient<CategorySetting[]>`
      SELECT category, sla_days, default_department_id FROM category_settings;
    `;
    if (originalSettings.length !== 4) {
      throw new Error('Cần đủ 4 cấu hình loại sự cố trước khi chạy ADMIN E2E.');
    }
  });

  test.afterAll(async () => {
    if (createdUserId) {
      await sqlClient`DELETE FROM admin_audit_log WHERE target_id = ${createdUserId};`;
      await sqlClient`DELETE FROM staff_profiles WHERE user_id = ${createdUserId}::uuid;`;
      await deleteAuthUser(createdUserId);
    }
    for (const setting of originalSettings) {
      await sqlClient`
        UPDATE category_settings
        SET sla_days = ${setting.sla_days},
            default_department_id = ${setting.default_department_id}
        WHERE category = ${setting.category}::category;
      `;
    }
  });

  test('tạo, khoá, đăng nhập bị chặn, mở khoá TNV và đổi SLA', async ({ page }) => {
    await mkdir(SCREENSHOTS, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAdmin(page, adminPassword);
    await expect(page.getByTestId('screen-title')).toContainText('Tổng quan');
    await expect(page.getByText('Tổng hồ sơ')).toBeVisible();
    await saveScreenshot(page, 'tong-quan-1440.png');

    await page.goto('/quan-tri/tai-khoan');
    await expect(page.getByTestId('screen-title')).toContainText('Tài khoản');
    await expect(page.getByText('admin@tranbien.gov.vn')).toBeVisible();
    await saveScreenshot(page, 'tai-khoan-1440.png');

    await page.setViewportSize({ width: 390, height: 844 });
    await saveScreenshot(page, 'tai-khoan-390.png');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await saveScreenshot(page, 'tao-tai-khoan-modal-1440.png');
    await createDialog.getByLabel('Họ và tên').fill(ACCOUNT_NAME);
    await createDialog.getByLabel('Email công vụ').fill(ACCOUNT_EMAIL);
    await createDialog.locator('select').first().selectOption('tnv');
    await createDialog.getByRole('button', { name: 'Tạo tài khoản' }).click();

    const passwordDialog = page.getByRole('dialog');
    await expect(passwordDialog).toContainText('Mật khẩu chỉ hiển thị lần này');
    const temporaryPassword = await passwordDialog.getByLabel('Mật khẩu tạm').inputValue();
    expect(temporaryPassword.length).toBeGreaterThan(12);
    const [created] = await sqlClient`
      SELECT user_id FROM staff_profiles WHERE email = ${ACCOUNT_EMAIL};
    `;
    if (!created) throw new Error('Không tìm thấy tài khoản TNV vừa tạo trong cơ sở dữ liệu.');
    createdUserId = created.user_id;
    await passwordDialog.getByRole('button', { name: 'Đã lưu mật khẩu' }).click();

    let accountRow = page.getByRole('row').filter({ hasText: ACCOUNT_EMAIL });
    await expect(accountRow).toContainText(ACCOUNT_NAME);
    page.once('dialog', (dialog) => void dialog.accept());
    await accountRow.getByRole('button', { name: 'Khoá' }).click();
    await expect(accountRow).toContainText('Đã khoá');

    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await page.waitForURL('**/dang-nhap');
    await page.locator('input[type="email"]').fill(ACCOUNT_EMAIL);
    await page.locator('input[type="password"]').fill(temporaryPassword);
    await page.getByRole('button', { name: 'Đăng nhập vào hệ thống' }).click();
    await expect(page.getByText('Tài khoản này đã bị tạm khoá')).toBeVisible();

    await loginAdmin(page, adminPassword);
    await page.goto('/quan-tri/tai-khoan');
    accountRow = page.getByRole('row').filter({ hasText: ACCOUNT_EMAIL });
    page.once('dialog', (dialog) => void dialog.accept());
    await accountRow.getByRole('button', { name: 'Mở khoá' }).click();
    await expect(accountRow).toContainText('Đang hoạt động');

    await page.goto('/quan-tri/cau-hinh');
    await expect(page.getByTestId('screen-title')).toContainText('Cấu hình xử lý');
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
    await saveScreenshot(page, 'cau-hinh-1440.png');
    const denDuong = originalSettings.find((setting) => setting.category === 'den_duong');
    if (!denDuong) throw new Error('Thiếu cấu hình SLA đèn đường.');
    const changedSla = denDuong.sla_days === 30 ? 29 : denDuong.sla_days + 1;
    await page.locator('input[type="number"]').first().fill(String(changedSla));
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(page.locator('input[type="number"]').first()).toHaveValue(String(changedSla));

    await page.goto('/quan-tri/nhat-ky');
    await expect(page.getByTestId('screen-title')).toContainText('Nhật ký');
    await expect(page.locator('tbody')).toContainText('Tạo tài khoản');
    await saveScreenshot(page, 'nhat-ky-1440.png');
  });
});
