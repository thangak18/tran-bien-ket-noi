import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(__dirname, '../../../docs/review/giai-doan-2/screenshots');
// Ảnh mẫu có sẵn trong dự án (tự chụp, không tải từ internet), dùng làm ảnh chọn từ thư viện.
const PHOTO_BEFORE = path.resolve(__dirname, '../../public/demo-photos/rac_thai/1.jpg');
const PHOTO_AFTER = path.resolve(__dirname, '../../public/demo-photos/rac_thai/2.jpg');

const CB_EMAIL = 'cb.minh@tranbien.gov.vn';
const TNV_EMAIL = 'tnv.mai@tranbien.gov.vn';
const TNV_NAME = 'Trần Thị Mai';
const CITIZEN_PHONE = '0912345678';
const MOBILE = { width: 390, height: 844 };
// Nạp từ app/.env(.local) bởi playwright.api.config.ts; deepseek = gọi DeepSeek thật.
const AI_IS_DEEPSEEK = process.env.AI_PROVIDER === 'deepseek';
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

/** Bỏ qua màn chào lần đầu để vào thẳng các màn hình cần kiểm tra. */
async function skipWelcome(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    window.localStorage.setItem('tbkn:welcomed', '1');
  });
}

async function newCitizenContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    geolocation: { latitude: 10.9505, longitude: 106.8225 },
    permissions: ['geolocation'],
  });
  await skipWelcome(ctx);
  return ctx;
}

async function newStaffContext(browser: Browser, viewport = DESKTOP): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport });
  await skipWelcome(ctx);
  return ctx;
}

async function staffLogin(page: Page, email: string, password: string, expectedPath: string) {
  await page.goto('/dang-nhap');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập vào hệ thống' }).click();
  await page.waitForURL(`**${expectedPath}`);
}

/** Bố cục điện thoại và máy tính cùng có trong DOM; chỉ lấy phần tử đang hiển thị. */
function visibleText(page: Page, text: string) {
  return page.getByText(text).locator('visible=true').first();
}

function visibleButton(page: Page, text: string | RegExp) {
  return page.locator('button:visible', { hasText: text }).first();
}

/**
 * Gửi phản ánh qua C02 (ảnh) → C04 (3 bước). UI mới bắt buộc đăng nhập SĐT: lần đầu bấm "Gửi phản ánh"
 * sẽ chuyển sang /ho-so để nhập OTP (mô phỏng), rồi quay lại bước 3 để gửi. Trả về phản hồi của API.
 */
async function submitReport(
  page: Page,
  options: { phone: string; title: string; shotPrefix: string }
): Promise<{ code: string; secretCode: string; ownerToken?: string }> {
  await page.goto('/bao-su-co/anh');
  await page.getByTestId('gallery-input').setInputFiles(PHOTO_BEFORE);
  await expect(page.getByRole('img').first()).toBeVisible();
  await visibleButton(page, 'Tiếp tục').click();
  await page.waitForURL('**/bao-su-co/xac-nhan**');

  // Bước 1: khung gợi ý AI (B1). Với DeepSeek thật, ảnh rác thải mẫu phải được nhận đúng.
  if (AI_IS_DEEPSEEK) {
    const banner = page.getByTestId('ai-suggestion-banner').locator('visible=true').first();
    await expect(banner).toBeVisible({ timeout: 30_000 });
    await expect(banner).toContainText('Rác thải');
    await expect(banner).toContainText('Gợi ý bởi AI – vui lòng kiểm tra lại');
    await shot(page, `${options.shotPrefix}-ai-goi-y`);
    await banner.getByRole('button', { name: 'Dùng gợi ý' }).click();
    await expect(banner).toContainText('Đang chọn');
  }
  // Bước 1: loại phản ánh
  await visibleButton(page, 'Rác thải').click();
  await visibleButton(page, 'Tiếp tục chọn vị trí').click();

  // Bước 2: vị trí (GPS giả lập điền sẵn địa chỉ)
  await expect(page.getByLabel('Địa chỉ', { exact: true })).toHaveValue(/Trấn Biên/);
  await visibleButton(page, 'Xác nhận vị trí').click();
  const dupDialog = page.getByRole('dialog', { name: 'Đối chiếu phản ánh tương tự' });
  if (await dupDialog.isVisible().catch(() => false)) {
    await dupDialog.getByRole('button', { name: /Không phải – gửi phản ánh mới/ }).click();
  }

  // Bước 3: mô tả. API chưa lưu tiêu đề; mô tả được lưu nên dùng để nhận diện hồ sơ ở các màn sau.
  await page.getByLabel('Mô tả thêm').fill(options.title);
  await shot(page, `${options.shotPrefix}-xac-nhan`);
  await visibleButton(page, 'Gửi phản ánh').click();

  // Chưa đăng nhập: chuyển sang màn đăng nhập SĐT + OTP (mô phỏng).
  await page.waitForURL('**/ho-so?login=1**');
  await page.locator('#change-phone-input').fill(options.phone);
  await visibleButton(page, /^Xác nhận$/).click();
  await expect(visibleText(page, 'Mô phỏng · mã 123456')).toBeVisible();
  await expect(page.getByLabel('Mã OTP số 6')).toHaveValue('6'); // tự điền mã mô phỏng
  await shot(page, `${options.shotPrefix}-otp-mo-phong`);
  const verified = page.waitForResponse((r) => r.url().endsWith('/api/v1/citizen/otp/verify'));
  await visibleButton(page, 'Xác nhận & Đăng nhập').click();
  expect((await verified).status()).toBe(200);

  // Quay lại bước 3 với bản nháp còn nguyên, gửi lần nữa (lần này kèm token người dân).
  await page.waitForURL('**/bao-su-co/xac-nhan**');
  await expect(page.getByLabel('Mô tả thêm')).toHaveValue(options.title);
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/citizen/reports') && r.request().method() === 'POST'
  );
  await visibleButton(page, 'Gửi phản ánh').click();

  const response = await created;
  expect(response.status()).toBe(201);
  expect(response.request().headers()['authorization']).toMatch(/^Bearer /);
  const body = (await response.json()) as { code: string; secretCode: string; ownerToken?: string };
  expect(body.code).toMatch(/^TB-\d{4}$/);
  expect(body.secretCode).toMatch(/^\d{4}$/);

  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByText(`Gửi phản ánh #${body.code} thành công!`)).toBeVisible();
  await shot(page, `${options.shotPrefix}-da-gui`);
  return body;
}

/** Spec v3.0 D1: API không còn nhận hồ sơ ẩn danh mới; thiếu token người dân → 401. */
async function expectAnonymousRejected(page: Page) {
  const res = await page.request.post('/api/v1/citizen/reports', {
    headers: { 'Idempotency-Key': `e2e-anon-${Date.now()}` },
    data: {
      category: 'den_duong',
      photos: ['/demo-photos/den_duong/1.jpg'],
      lat: 10.9512,
      lng: 106.8231,
      address: 'Đ. Cách Mạng Tháng Tám, P. Trấn Biên',
      anonymous: true,
    },
  });
  expect(res.status()).toBe(401);
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
    'CITIZEN_LOGIN_REQUIRED'
  );
}

/** Hồ sơ ẩn danh cũ trong dữ liệu mẫu (6 hồ sơ, bất biến): TB-0042 đang chờ xác minh. */
const LEGACY_ANON_CODE = 'TB-0042';

async function publicReport(page: Page, code: string): Promise<Record<string, unknown>> {
  const res = await page.request.get(`/api/v1/public/reports/${code}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

test.describe.serial('Luồng đầy đủ ở chế độ API (Supabase local hoặc cloud)', () => {
  const runId = Date.now().toString().slice(-6);
  const phoneTitle = `E2E rác tồn đọng góc đường ${runId}`;
  let phoneReport: { code: string; secretCode: string; ownerToken?: string };
  let citizenCtx: BrowserContext;
  let citizenPage: Page;

  test.afterAll(async () => {
    await citizenCtx?.close();
  });

  test('01 Người dân đăng nhập SĐT (OTP mô phỏng) rồi gửi phản ánh; API từ chối gửi ẩn danh', async ({
    browser,
  }) => {
    citizenCtx = await newCitizenContext(browser);
    citizenPage = await citizenCtx.newPage();
    phoneReport = await submitReport(citizenPage, {
      phone: CITIZEN_PHONE,
      title: phoneTitle,
      shotPrefix: '01a-dan-co-sdt',
    });
    // Hồ sơ có SĐT: không phát khoá chủ hồ sơ (chủ hồ sơ chứng minh bằng SĐT/OTP).
    expect(phoneReport.ownerToken).toBeUndefined();

    // Thiết bị khác chưa đăng nhập: API từ chối gửi ẩn danh.
    const anonCtx = await newCitizenContext(browser);
    await expectAnonymousRejected(await anonCtx.newPage());
    await anonCtx.close();

    // API công khai không lộ SĐT, secretCode hay ownerToken (cờ ẩn danh kiểm ở màn cán bộ, test 07).
    const phonePublic = JSON.stringify(await publicReport(citizenPage, phoneReport.code));
    const anonPublic = JSON.stringify(await publicReport(citizenPage, LEGACY_ANON_CODE));
    for (const text of [phonePublic, anonPublic]) {
      expect(text).not.toContain(CITIZEN_PHONE);
      expect(text).not.toMatch(/secret/i);
      expect(text).not.toMatch(/owner/i);
    }
  });

  test('02 Cán bộ chưa đăng nhập bị chuyển về /dang-nhap; sai mật khẩu báo lỗi chung', async ({
    browser,
  }) => {
    const ctx = await newStaffContext(browser);
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
    const ctx = await newStaffContext(browser);
    const page = await ctx.newPage();
    await staffLogin(page, CB_EMAIL, staffPassword(), '/can-bo');
    // Không có màn đăng nhập mô phỏng ở chế độ API; hộp tiếp nhận hiện hồ sơ vừa gửi.
    await expect(visibleText(page, phoneReport.code)).toBeVisible();
    await shot(page, '03a-can-bo-hop-tiep-nhan');

    await page.goto(`/can-bo/${phoneReport.code}`);
    // Spec v3.0 D7: cán bộ thấy SĐT đầy đủ và nút "Gọi" để liên hệ người gửi.
    await expect(visibleText(page, '0912 345 678')).toBeVisible();
    await expect(
      page.getByTestId('officer-call-reporter').locator('visible=true').first()
    ).toHaveAttribute('href', `tel:${CITIZEN_PHONE}`);
    if (AI_IS_DEEPSEEK) {
      const ai = page.getByTestId('officer-ai-suggestion').locator('visible=true').first();
      await expect(ai).toContainText('Rác thải');
      await expect(ai).toContainText('DeepSeek AI');
    }
    await shot(page, '03b-can-bo-chi-tiet-moi');
    await visibleButton(page, /^Tiếp nhận$/).click();
    await expect(page.getByText(`Đã tiếp nhận hồ sơ ${phoneReport.code}`)).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('da_tiep_nhan');

    await visibleButton(page, 'Giao TNV xác minh').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').selectOption({ label: TNV_NAME });
    await shot(page, '03c-can-bo-giao-tnv');
    await dialog.getByRole('button', { name: 'Xác nhận giao' }).click();
    await expect(page.getByText(`Đã giao TNV ${TNV_NAME} xác minh`)).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('cho_xac_minh');
    await ctx.close();
  });

  test('04 TNV đăng nhập, xác minh "Có sự cố" kèm ảnh', async ({ browser }) => {
    const ctx = await newStaffContext(browser, MOBILE);
    const page = await ctx.newPage();
    await staffLogin(page, TNV_EMAIL, staffPassword(), '/tnv');
    const card = page.getByRole('button').filter({ hasText: phoneTitle }).first();
    await expect(card).toBeVisible();
    // Số điện thoại và mã bí mật không xuất hiện trên màn TNV
    await expect(page.locator('body')).not.toContainText(CITIZEN_PHONE);
    await expect(page.locator('body')).not.toContainText('0912 345 678'); // V01 không có SĐT (PHONE-003)
    await expect(page.locator('body')).not.toContainText(phoneReport.secretCode + ' ');
    await shot(page, '04a-tnv-danh-sach');

    await card.click();
    await page.waitForURL('**/tnv/**');
    // AC-V02-6: nhiệm vụ đang giao cho chính TNV này và chưa xong → có SĐT người gửi + nút "Gọi".
    const contact = page.getByTestId('tnv-contact-phone');
    await expect(contact).toContainText('0912 345 678');
    await expect(contact.getByRole('link', { name: 'Gọi' })).toHaveAttribute(
      'href',
      `tel:${CITIZEN_PHONE}`
    );
    // Wizard 3 bước: Thực tế → Ảnh/Video → Ghi chú & Gửi
    await page.getByRole('button', { name: 'Có', exact: true }).click();
    await page.getByRole('button', { name: 'Trung bình', exact: true }).click();
    await page.locator('input[type="file"][multiple]').first().setInputFiles(PHOTO_BEFORE);
    await expect(page.getByLabel('Xoá mục 1')).toBeVisible();
    await visibleButton(page, 'Tiếp tục ghi chú & gửi').click();
    const submit = page.getByRole('button', { name: 'Gửi kết quả xác minh' });
    await expect(submit).toBeEnabled();
    await shot(page, '04b-tnv-xac-minh');
    await submit.click();
    await page.waitForURL((url) => url.pathname === '/tnv');
    await expect(page.getByText(`Đã gửi kết quả xác minh cho ${phoneReport.code}`)).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('da_tiep_nhan');
    await ctx.close();
  });

  test('05 Cán bộ xem kết quả xác minh, giao xử lý và hoàn thành kèm ảnh sau', async ({
    browser,
  }) => {
    const ctx = await newStaffContext(browser);
    const page = await ctx.newPage();
    await staffLogin(page, CB_EMAIL, staffPassword(), '/can-bo');
    await page.goto(`/can-bo/${phoneReport.code}`);
    const verify = page.getByTestId('tnv-verification-result');
    await expect(verify).toContainText('Có sự cố');
    await expect(verify).toContainText(TNV_NAME);
    await shot(page, '05a-can-bo-ket-qua-xac-minh');
    // Lịch sử xử lý nội bộ vẫn còn sau khi danh sách được đồng bộ lại từ API.
    await visibleButton(page, /^Lịch sử/).click();
    await expect(page.getByTestId('officer-history-tab').locator('> div')).not.toHaveCount(0);
    await visibleButton(page, /^Chi tiết/).click();

    await visibleButton(page, /^Giao xử lý$/).click();
    await expect(page.getByText(/^Đã giao /).first()).toBeVisible();
    expect((await publicReport(page, phoneReport.code)).status).toBe('da_giao');

    await visibleButton(page, /^Cập nhật kết quả$/).click();
    await page.waitForURL('**/ket-qua');
    await page.locator('input[type="file"]').first().setInputFiles(PHOTO_AFTER);
    await page.locator('#a03-result-note').fill('Đã dọn sạch rác và vệ sinh khu vực');
    const confirm = page.getByRole('button', { name: 'Xác nhận hoàn thành' });
    await expect(confirm).toBeEnabled();
    await shot(page, '05b-can-bo-cap-nhat-ket-qua');
    await confirm.click();
    await page.waitForURL(`**/can-bo/${phoneReport.code}`);
    await expect
      .poll(async () => (await publicReport(page, phoneReport.code)).status)
      .toBe('hoan_thanh');
    await ctx.close();
  });

  test('06 Người dân (chủ hồ sơ) xem Trước/Sau, bấm "Chưa giải quyết" -> hồ sơ mở lại', async () => {
    await citizenPage.goto(`/phan-anh/${phoneReport.code}`);
    await expect(citizenPage.getByText(/Ảnh Trước \/ Sau xử lý/).first()).toBeVisible();
    await expect(citizenPage.getByText(/Vấn đề đã được giải quyết chưa/).first()).toBeVisible();
    await shot(citizenPage, '06a-dan-xem-truoc-sau');

    await visibleButton(citizenPage, 'Chưa giải quyết').click();
    const sheet = citizenPage.getByRole('dialog');
    await sheet.locator('textarea').fill('Rác vẫn còn ở góc đường, chưa dọn hết');
    await sheet.getByRole('button', { name: /Gửi phản hồi & Mở lại hồ sơ/ }).click();
    await expect
      .poll(async () => (await publicReport(citizenPage, phoneReport.code)).status)
      .toBe('mo_lai');
    await shot(citizenPage, '06b-dan-chua-giai-quyet-mo-lai');

    // Tab "Của tôi" ở trang chủ lấy từ /citizen/me/reports bằng token người dân.
    const mine = citizenPage.waitForResponse((r) => r.url().endsWith('/api/v1/citizen/me/reports'));
    await citizenPage.goto('/?tab=personal');
    expect((await mine).status()).toBe(200);
    await expect(
      citizenPage.getByTestId('personal-report-grid').getByText(phoneTitle).first()
    ).toBeVisible();
  });

  test('07 Người chưa đăng nhập không đánh giá được (401), không phải chủ (404); hồ sơ ẩn danh cũ hiện ở hộp cán bộ', async ({
    browser,
  }) => {
    // Người lạ chưa đăng nhập đánh giá hồ sơ → bị chặn trước khi xét trạng thái.
    const strangerCtx = await newCitizenContext(browser);
    const stranger = await strangerCtx.newPage();
    const denied = await stranger.request.post(
      `/api/v1/citizen/reports/${phoneReport.code}/feedback`,
      { data: { resolved: true, rating: 5 } }
    );
    expect(denied.status()).toBe(401); // chưa đăng nhập SĐT (AC-AUTH-9)
    // Máy chủ không xác nhận người lạ là chủ hồ sơ (giao diện dựa vào đây để ẩn thẻ đánh giá).
    const ownerCheck = await stranger.request.get(
      `/api/v1/citizen/reports/${phoneReport.code}/owner`
    );
    expect(ownerCheck.status()).toBe(404); // không phải chủ (AC-AUTH-4)
    await strangerCtx.close();

    const ctx = await newStaffContext(browser);
    const page = await ctx.newPage();
    await staffLogin(page, CB_EMAIL, staffPassword(), '/can-bo');
    await expect(visibleText(page, LEGACY_ANON_CODE)).toBeVisible();
    await shot(page, '07-can-bo-hop-co-an-danh');
    await page.goto(`/can-bo/${LEGACY_ANON_CODE}`);
    await expect(visibleText(page, 'Ẩn danh')).toBeVisible();
    await ctx.close();
  });
});
