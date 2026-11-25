import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(__dirname, '../../../docs/review/giai-doan-2/screenshots');

const CB_EMAIL = 'cb.minh@tranbien.gov.vn';
const TNV_EMAIL = 'tnv.mai@tranbien.gov.vn';
const CITIZEN_PHONE = '0912345678';
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

function staffPassword(): string {
  const value = process.env.SEED_STAFF_PASSWORD;
  if (!value) throw new Error('Thiếu SEED_STAFF_PASSWORD trong app/.env.local');
  return value;
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
}

async function newCitizenContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: MOBILE,
    geolocation: { latitude: 10.9505, longitude: 106.8225 },
    permissions: ['geolocation'],
  });
}

async function staffLogin(page: Page, email: string, password: string, expectedPath: string) {
  await page.goto('/dang-nhap');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập vào hệ thống' }).click();
  await page.waitForURL(`**${expectedPath}`);
}

/** Gửi phản ánh từ màn C02 → C04 bằng ảnh mẫu và GPS giả lập; trả về phản hồi của API. */
async function submitReport(
  page: Page,
  options: { phone?: string; shotPrefix: string }
): Promise<{ code: string; secretCode: string; ownerToken?: string }> {
  await page.goto('/bao-su-co/anh');
  await page.getByRole('button', { name: /Dùng ảnh mẫu nhanh/ }).click();
  await page.waitForURL('**/bao-su-co/xac-nhan');
  // GPS giả lập → địa chỉ tự điền (chờ phần tử đang hiển thị, bố cục desktop bị ẩn ở màn hình điện thoại).
  await expect(page.locator('body')).toContainText(/Đường .+, Phường Trấn Biên/);
  await page
    .getByRole('button', { name: /Rác thải/ })
    .first()
    .click();

  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/citizen/reports') && r.request().method() === 'POST'
  );

  if (options.phone) {
    await page.getByPlaceholder(/Số điện thoại nhận tin/).fill(options.phone);
    await shot(page, `${options.shotPrefix}-xac-nhan`);
    await page.getByRole('button', { name: 'Gửi phản ánh', exact: true }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(sheet.getByText(/Mô phỏng/).first()).toBeVisible();
    await shot(page, `${options.shotPrefix}-otp-mo-phong`);
    await sheet.getByRole('button', { name: /Tự động điền mã 123456/ }).click();
    await sheet.getByRole('button', { name: 'Xác nhận' }).click();
  } else {
    await shot(page, `${options.shotPrefix}-xac-nhan`);
    await page.getByRole('button', { name: 'Gửi phản ánh', exact: true }).click();
  }

  const response = await created;
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { code: string; secretCode: string; ownerToken?: string };
  expect(body.code).toMatch(/^TB-\d{4}$/);
  expect(body.secretCode).toMatch(/^\d{4}$/);
  await page.waitForURL('**/?tab=ca-nhan');
  await shot(page, `${options.shotPrefix}-da-gui`);
  return body;
}

async function publicReport(page: Page, code: string): Promise<Record<string, unknown>> {
  const res = await page.request.get(`/api/v1/public/reports/${code}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

test.describe.serial('Luồng đầy đủ ở chế độ API (Supabase local)', () => {
  let phoneReport: { code: string; secretCode: string; ownerToken?: string };
  let anonReport: { code: string; secretCode: string; ownerToken?: string };
  let citizenCtx: BrowserContext;
  let citizenPage: Page;

  test.afterAll(async () => {
    await citizenCtx?.close();
  });

  test('01 Người dân gửi phản ánh có SĐT (OTP mô phỏng) và gửi ẩn danh', async ({ browser }) => {
    citizenCtx = await newCitizenContext(browser);
    citizenPage = await citizenCtx.newPage();
    phoneReport = await submitReport(citizenPage, {
      phone: CITIZEN_PHONE,
      shotPrefix: '01a-dan-co-sdt',
    });
    // Hồ sơ có SĐT: không phát khoá chủ hồ sơ (chủ hồ sơ chứng minh bằng SĐT/OTP).
    expect(phoneReport.ownerToken).toBeUndefined();

    const anonCtx = await newCitizenContext(browser);
    const anonPage = await anonCtx.newPage();
    anonReport = await submitReport(anonPage, { shotPrefix: '01b-dan-an-danh' });
    expect(anonReport.ownerToken).toBeTruthy();
    await anonCtx.close();

    // API công khai không lộ SĐT, secretCode hay ownerToken; hồ sơ ẩn danh giữ anonymous.
    const phonePublic = JSON.stringify(await publicReport(citizenPage, phoneReport.code));
    const anonPublic = JSON.stringify(await publicReport(citizenPage, anonReport.code));
    for (const text of [phonePublic, anonPublic]) {
      expect(text).not.toContain(CITIZEN_PHONE);
      expect(text).not.toMatch(/secret/i);
      expect(text).not.toMatch(/owner/i);
    }
  });

  test('02 Cán bộ chưa đăng nhập bị chuyển về /dang-nhap; sai mật khẩu báo lỗi chung', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto('/can-bo');
    await page.waitForURL('**/dang-nhap**');

    await page.locator('input[type="email"]').fill(CB_EMAIL);
    await page.locator('input[type="password"]').fill('mat-khau-sai-123');
    await page.getByRole('button', { name: 'Đăng nhập vào hệ thống' }).click();
    await expect(page.getByText('Email hoặc mật khẩu không chính xác')).toBeVisible();
    await shot(page, '02-dang-nhap-sai-mat-khau');
    expect(page.url()).toContain('/dang-nhap');
    await ctx.close();
  });

  test('03 Cán bộ đăng nhập thật, tiếp nhận và giao TNV xác minh', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await staffLogin(page, CB_EMAIL, staffPassword(), '/can-bo');
    await expect(page.getByText(phoneReport.code).first()).toBeVisible();
    await shot(page, '03a-can-bo-hop-tiep-nhan');

    await page.goto(`/can-bo/${phoneReport.code}`);
    // SĐT hiển thị đã che
    await expect(page.getByText(/0912 \*\*\* 678/)).toBeVisible();
    await shot(page, '03b-can-bo-chi-tiet-moi');
    await page.getByRole('button', { name: 'Tiếp nhận phản ánh' }).click();
    await expect(page.getByText('Đã tiếp nhận hồ sơ thành công!')).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('da_tiep_nhan');

    await page.getByRole('button', { name: 'Giao TNV xác minh' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').selectOption({ label: 'Trần Thị Mai' });
    await shot(page, '03c-can-bo-giao-tnv');
    await dialog.getByRole('button', { name: 'Xác nhận giao' }).click();
    await expect(page.getByText('Đã giao tình nguyện viên xác minh')).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('cho_xac_minh');
    await ctx.close();
  });

  test('04 TNV đăng nhập, xác minh "Có sự cố" kèm ảnh', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await staffLogin(page, TNV_EMAIL, staffPassword(), '/tnv');
    const card = page.getByTestId('task-card').filter({ hasText: phoneReport.code });
    await expect(card).toBeVisible();
    // Số điện thoại và mã bí mật không xuất hiện trên màn TNV
    await expect(page.locator('body')).not.toContainText(CITIZEN_PHONE);
    await shot(page, '04a-tnv-danh-sach');

    await card.getByRole('button', { name: /Làm tiếp|Nhận việc/ }).click();
    await page.getByRole('button', { name: 'Có', exact: true }).click();
    await page.getByRole('button', { name: 'Trung bình' }).click();
    await page.getByRole('button', { name: /Dùng ảnh mẫu/ }).click();
    await shot(page, '04b-tnv-xac-minh');
    await page.getByRole('button', { name: 'Gửi kết quả' }).click();
    await expect(page.getByText('Đã gửi kết quả cho cán bộ')).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('da_tiep_nhan');
    await ctx.close();
  });

  test('05 Cán bộ xem kết quả xác minh, giao xử lý và hoàn thành kèm ảnh sau', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await staffLogin(page, CB_EMAIL, staffPassword(), '/can-bo');
    await page.goto(`/can-bo/${phoneReport.code}`);
    await expect(page.getByTestId('verify-result')).toContainText('Có tồn tại');
    await expect(page.getByTestId('verify-result')).toContainText('Trần Thị Mai');
    await shot(page, '05a-can-bo-ket-qua-xac-minh');

    await page.getByRole('button', { name: 'Giao xử lý' }).click();
    await expect(page.getByText(/Đã giao việc cho/)).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('da_giao');

    await page.getByRole('button', { name: /Cập nhật kết quả hoàn thành/ }).click();
    await page.waitForURL('**/ket-qua');
    await page.getByRole('button', { name: /Dùng ảnh mẫu/ }).click();
    await page.locator('#result-note').fill('Đã dọn sạch rác và vệ sinh khu vực');
    await shot(page, '05b-can-bo-cap-nhat-ket-qua');
    await page.getByRole('button', { name: 'Xác nhận hoàn thành' }).click();
    await page.waitForURL(`**/can-bo/${phoneReport.code}`);
    await expect(page.getByText('Hồ sơ đã được xử lý hoàn tất')).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('hoan_thanh');
    await ctx.close();
  });

  test('06 Người dân xem Trước/Sau, bấm "Chưa giải quyết" -> hồ sơ mở lại', async () => {
    await citizenPage.goto(`/phan-anh/${phoneReport.code}`);
    await expect(citizenPage.getByText(/Ảnh Trước \/ Sau xử lý/).first()).toBeVisible();
    await expect(citizenPage.getByText(/Vấn đề đã được giải quyết chưa/).first()).toBeVisible();
    await shot(citizenPage, '06a-dan-xem-truoc-sau');

    citizenPage.once('dialog', (d) => void d.accept());
    await citizenPage.locator('button:visible', { hasText: 'Chưa giải quyết' }).first().click();
    await expect
      .poll(async () => (await publicReport(citizenPage, phoneReport.code)).status)
      .toBe('mo_lai');
    await shot(citizenPage, '06b-dan-chua-giai-quyet-mo-lai');
  });

  test('07 Người không phải chủ hồ sơ không đánh giá được (403), hồ sơ ẩn danh hiện ở hộp cán bộ', async ({
    browser,
  }) => {
    // Người lạ (không có SĐT/khoá) đánh giá hồ sơ ẩn danh chưa hoàn thành -> bị chặn trước khi xét trạng thái.
    const strangerCtx = await browser.newContext({ viewport: MOBILE });
    const stranger = await strangerCtx.newPage();
    const denied = await stranger.request.post(
      `/api/v1/citizen/reports/${anonReport.code}/feedback`,
      {
        data: { resolved: true, rating: 5 },
      }
    );
    expect(denied.status()).toBe(403);
    await strangerCtx.close();

    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await staffLogin(page, CB_EMAIL, staffPassword(), '/can-bo');
    const row = page.getByText(anonReport.code).first();
    await expect(row).toBeVisible();
    await shot(page, '07-can-bo-hop-co-an-danh');
    await page.goto(`/can-bo/${anonReport.code}`);
    await expect(page.getByText('Ẩn danh').first()).toBeVisible();
    await ctx.close();
  });
});
