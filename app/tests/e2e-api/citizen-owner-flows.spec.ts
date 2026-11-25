import { test, expect, type BrowserContext, type Browser, type Page } from '@playwright/test';

/**
 * E2E-CITIZEN-02 (AC-C06-7, AC-C06-13, AC-C05-5, AC-SESSION-3): các thao tác của người dân trên hồ sơ có sẵn
 * trong dữ liệu mẫu. Chủ hồ sơ mẫu dùng SĐT demo 0909000068; global-setup đã nạp lại dữ liệu mẫu.
 */
const OWNER_PHONE = '0909000068';
const SUPPLEMENT_CODE = 'TB-0063'; // can_bo_sung, chủ hồ sơ = OWNER_PHONE
const RATE_CODE = 'TB-0007'; // hoan_thanh, chủ hồ sơ = OWNER_PHONE
const FOLLOW_CODE = 'TB-0008'; // da_tiep_nhan, người khác bấm "Tôi cũng gặp"
const EXPIRED_CODE = 'TB-0024'; // da_tiep_nhan, thử với token người dân hết hạn
const MOBILE = { width: 390, height: 844 };

function visibleButton(page: Page, text: string | RegExp) {
  return page.locator('button:visible', { hasText: text }).first();
}

async function newCitizen(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    geolocation: { latitude: 10.9505, longitude: 106.8225 },
    permissions: ['geolocation'],
  });
  await ctx.addInitScript(() => window.localStorage.setItem('tbkn:welcomed', '1'));
  return ctx;
}

/** Đăng nhập SĐT bằng OTP mô phỏng trên màn /ho-so đang mở bước đăng nhập. */
async function otpLogin(page: Page, phone: string) {
  await page.locator('#change-phone-input').fill(phone);
  await visibleButton(page, /^Xác nhận$/).click();
  await expect(page.getByLabel('Mã OTP số 6')).toHaveValue('6');
  const verified = page.waitForResponse((r) => r.url().endsWith('/api/v1/citizen/otp/verify'));
  await visibleButton(page, 'Xác nhận & Đăng nhập').click();
  expect((await verified).status()).toBe(200);
}

async function loginAt(page: Page, phone: string, redirect = '/') {
  await page.goto(`/ho-so?login=1&redirect=${encodeURIComponent(redirect)}`);
  await otpLogin(page, phone);
  await page.waitForURL((url) => url.pathname === redirect);
}

async function publicStatus(page: Page, code: string): Promise<string> {
  const res = await page.request.get(`/api/v1/public/reports/${code}`);
  expect(res.status()).toBe(200);
  return ((await res.json()) as { status: string }).status;
}

async function publicTotal(page: Page): Promise<number> {
  const res = await page.request.get('/api/v1/public/kpi');
  return ((await res.json()) as { total: number }).total;
}

test.describe.serial('Người dân thao tác trên hồ sơ (chế độ API)', () => {
  test('01 Chủ hồ sơ "Bổ sung ngay" → gửi bổ sung cập nhật đúng hồ sơ (can_bo_sung → moi), không tạo hồ sơ mới', async ({
    browser,
  }) => {
    const ctx = await newCitizen(browser);
    const page = await ctx.newPage();
    await loginAt(page, OWNER_PHONE, `/phan-anh/${SUPPLEMENT_CODE}`);
    const totalBefore = await publicTotal(page);

    await visibleButton(page, 'Bổ sung ngay').click();
    await page.waitForURL('**/bao-su-co/xac-nhan**');
    await expect(
      page.getByText(`Bổ sung cho hồ sơ #${SUPPLEMENT_CODE}`).locator('visible=true').first()
    ).toBeVisible();
    await visibleButton(page, 'Tiếp tục chọn vị trí').click();
    await expect(page.getByRole('dialog', { name: 'Đối chiếu phản ánh tương tự' })).toHaveCount(0);
    await visibleButton(page, 'Xác nhận vị trí').click();
    await page.getByLabel('Mô tả thêm').fill('Đã chụp thêm ảnh rõ hơn theo yêu cầu');
    const sent = page.waitForResponse((r) =>
      r.url().endsWith(`/api/v1/citizen/reports/${SUPPLEMENT_CODE}/supplement`)
    );
    await visibleButton(page, 'Gửi bổ sung').click();
    expect((await sent).status()).toBe(200);
    await page.waitForURL(`**/phan-anh/${SUPPLEMENT_CODE}`);
    expect(await publicStatus(page, SUPPLEMENT_CODE)).toBe('moi');
    expect(await publicTotal(page)).toBe(totalBefore);
    await ctx.close();
  });

  test('02 Chủ hồ sơ đánh giá "Đã giải quyết" 5 sao → hồ sơ đóng', async ({ browser }) => {
    const ctx = await newCitizen(browser);
    const page = await ctx.newPage();
    await loginAt(page, OWNER_PHONE, `/phan-anh/${RATE_CODE}`);
    // Chọn số sao ngay trên khối "Vấn đề đã được giải quyết chưa?" rồi bấm "Đã giải quyết".
    await page
      .getByRole('button', { name: 'Đánh giá 5 sao' })
      .locator('visible=true')
      .first()
      .click();
    const sent = page.waitForResponse((r) =>
      r.url().endsWith(`/api/v1/citizen/reports/${RATE_CODE}/feedback`)
    );
    await visibleButton(page, /^Đã giải quyết$/).click();
    expect((await sent).status()).toBe(200);
    await expect(page.getByText('Cảm ơn bạn đã đánh giá! Phản ánh đã được đóng.')).toBeVisible();
    expect(await publicStatus(page, RATE_CODE)).toBe('dong');

    // C09: thông báo của chủ hồ sơ tải từ máy chủ; "Đánh dấu đã đọc" ghi nhận ở máy chủ.
    const loaded = page.waitForResponse((r) =>
      r.url().endsWith('/api/v1/citizen/me/notifications')
    );
    await page.goto('/thong-bao');
    expect((await loaded).status()).toBe(200);
    await expect(page.getByTestId('screen-title').first()).toBeAttached();
    const markAll = visibleButton(page, 'Đánh dấu đã đọc');
    if (await markAll.isEnabled().catch(() => false)) {
      const read = page.waitForResponse((r) =>
        r.url().endsWith('/api/v1/citizen/me/notifications/read')
      );
      await markAll.click();
      expect((await read).status()).toBe(200);
    }
    await ctx.close();
  });

  test('03 Người dân khác bấm "Tôi cũng gặp" một lần; token hết hạn → về đăng nhập rồi quay lại hồ sơ', async ({
    browser,
  }) => {
    const runId = Date.now().toString().slice(-6);
    const ctx = await newCitizen(browser);
    const page = await ctx.newPage();
    await loginAt(page, `0966${runId}`, `/phan-anh/${FOLLOW_CODE}`);
    const followed = page.waitForResponse((r) =>
      r.url().endsWith(`/api/v1/citizen/reports/${FOLLOW_CODE}/follow`)
    );
    await visibleButton(page, 'Tôi cũng gặp vấn đề này').click();
    expect((await followed).status()).toBe(200);
    await expect(visibleButton(page, 'Bạn đã báo vấn đề này')).toBeVisible();

    // Phiên người dân hết hạn (token hỏng) nhưng thiết bị vẫn nhớ SĐT.
    await page.goto(`/phan-anh/${EXPIRED_CODE}`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.setItem('tb_citizen_token', 'token-het-han'));
    await visibleButton(page, 'Tôi cũng gặp vấn đề này').click();
    await expect(page.getByText('Vui lòng đăng nhập số điện thoại để tiếp tục.')).toBeVisible();
    await page.waitForURL(
      `**/ho-so?login=1&redirect=${encodeURIComponent(`/phan-anh/${EXPIRED_CODE}`)}`
    );
    expect(await page.evaluate(() => localStorage.getItem('tb_citizen_token'))).toBeNull();
    await otpLogin(page, `0966${runId}`);
    await page.waitForURL(`**/phan-anh/${EXPIRED_CODE}`);
    await ctx.close();
  });
});
