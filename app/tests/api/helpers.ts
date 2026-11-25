import crypto from 'node:crypto';
import { app } from '../../server/app';
import { sqlClient } from '../../server/db/client';

export const CB_ID = '11111111-1111-1111-1111-111111111111';
export const TNV_MAI_ID = '22222222-2222-2222-2222-222222222222';
export const TNV_NAM_ID = '33333333-3333-3333-3333-333333333333';

export interface TestReport {
  id: string;
  code: string;
}

/** Tạo hồ sơ thử (is_seed = false) ở trạng thái mong muốn, không đụng tới 64 hồ sơ mẫu. */
export async function createTestReport(
  status: string = 'moi',
  options: { phone?: string | null; category?: string } = {}
): Promise<TestReport> {
  const id = crypto.randomUUID();
  const code = `TB-${crypto.randomBytes(4).toString('hex')}`;
  const completed = status === 'hoan_thanh' || status === 'dong';
  await sqlClient`
    INSERT INTO reports (
      id, code, category, status, priority, location, address,
      reporter_phone, anonymous, secret_code_hash, completed_at, version, is_seed
    ) VALUES (
      ${id}::uuid, ${code}, ${options.category ?? 'rac_thai'}::category, ${status}::report_status, 'binh_thuong',
      ST_GeographyFromText('POINT(106.8225 10.9505)'), '123 Đường Test',
      ${options.phone ?? null}, ${options.phone ? false : true}, ${'h'.repeat(32)},
      ${completed ? new Date().toISOString() : null}::timestamptz, 1, false
    );
  `;
  return { id, code };
}

/**
 * Xoá hồ sơ thử và dữ liệu phụ thuộc. Trigger bất biến của report_timeline được tắt tạm
 * trong đúng transaction này; chỉ xoá hồ sơ is_seed = false.
 */
export async function purgeTestReports(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await sqlClient.begin(async (tx) => {
    await tx`DELETE FROM notifications WHERE report_id = ANY(${ids}::uuid[]);`;
    await tx`ALTER TABLE report_timeline DISABLE TRIGGER report_timeline_immutable_trigger;`;
    await tx`DELETE FROM reports WHERE id = ANY(${ids}::uuid[]) AND is_seed = false;`;
    await tx`ALTER TABLE report_timeline ENABLE TRIGGER report_timeline_immutable_trigger;`;
  });
}

/** Tạo nhiệm vụ TNV thử gắn với hồ sơ. */
export async function createTestTask(
  reportId: string,
  type: 'xac_minh' | 'nghiem_thu',
  assigneeId: string | null,
  status: 'cho_nhan' | 'dang_lam' = assigneeId ? 'dang_lam' : 'cho_nhan'
): Promise<{ code: string }> {
  const code = `NV-T${crypto.randomBytes(3).toString('hex')}`;
  await sqlClient`
    INSERT INTO volunteer_tasks (code, report_id, type, status, assignee_id)
    VALUES (${code}, ${reportId}::uuid, ${type}::task_type, ${status}::task_status, ${assigneeId});
  `;
  return { code };
}

/** Chuỗi JSON của phản hồi có chứa số điện thoại 10 số hoặc khoá bí mật không. */
export function findSensitiveLeaks(payload: unknown): string[] {
  const text = JSON.stringify(payload);
  const leaks: string[] = [];
  if (/\b0\d{9}\b/.test(text)) leaks.push('số điện thoại');
  if (/secret_?code/i.test(text)) leaks.push('secretCode');
  if (/owner_?token/i.test(text)) leaks.push('ownerToken');
  if (/reporter_?phone/i.test(text) && /"reporter_?phone"\s*:\s*"0\d{9}"/i.test(text)) {
    leaks.push('reporterPhone');
  }
  return leaks;
}

/** Phản hồi JSON của API trong test có hình dạng động nên dùng any có chủ đích ở đúng một chỗ này. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiJson = Record<string, any>;

/** Gọi API qua app.request với Bearer token tuỳ chọn; trả về mã HTTP và JSON. */
export async function call(
  token: string | null,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: ApiJson }> {
  const res = await app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as ApiJson };
}
