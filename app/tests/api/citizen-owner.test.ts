// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { app } from '../../server/app';
import { sqlClient } from '../../server/db/client';
import { createCitizenToken } from '../../server/middleware/auth';
import { createTestReport, purgeTestReports, type ApiJson } from './helpers';

const created: string[] = [];
const OWNER_PHONE = '0911222333';
const OTHER_PHONE = '0944555666';
const KEY = 'khoa-chu-ho-so-thu-nghiem-0001';

async function track(status: string, options: { phone?: string; ownerKey?: string } = {}) {
  const r = await createTestReport(status, options);
  created.push(r.id);
  if (options.phone) {
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${r.id}::uuid, ${options.phone}, 'reporter');
    `;
  }
  return r;
}

async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: ApiJson }> {
  const res = await app.request(`/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as ApiJson };
}

describe('OWNER: chỉ chủ hồ sơ mới đánh giá / bổ sung (AUTHZ-009, Spec 13.4)', () => {
  afterAll(async () => {
    await purgeTestReports(created);
  });

  it('OWNER-001: chưa đăng nhập -> 401; khoá sai, SĐT khác hoặc chỉ "Tôi cũng gặp" -> 403; hồ sơ không đổi', async () => {
    const report = await track('hoan_thanh', { phone: OWNER_PHONE, ownerKey: KEY });
    await sqlClient`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${report.id}::uuid, ${OTHER_PHONE}, 'also_me');
    `;
    const body = { resolved: true, rating: 5 };
    // Spec v3.0 AC-AUTH-9: không có token và không có khoá → 401 CITIZEN_LOGIN_REQUIRED.
    const anon = await post(`/citizen/reports/${report.code}/feedback`, body);
    expect(anon.status).toBe(401);
    expect(anon.data.error.code).toBe('CITIZEN_LOGIN_REQUIRED');
    expect(
      (await post(`/citizen/reports/${report.code}/feedback`, body, { 'X-Report-Key': 'khoa-sai' }))
        .status
    ).toBe(403);
    const otherToken = await createCitizenToken('0900000000');
    expect(
      (
        await post(`/citizen/reports/${report.code}/feedback`, body, {
          Authorization: `Bearer ${otherToken}`,
        })
      ).status
    ).toBe(403);
    const alsoMeToken = await createCitizenToken(OTHER_PHONE);
    expect(
      (
        await post(`/citizen/reports/${report.code}/feedback`, body, {
          Authorization: `Bearer ${alsoMeToken}`,
        })
      ).status
    ).toBe(403);

    const [row] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(row?.status).toBe('hoan_thanh');
    const [fb] =
      await sqlClient`SELECT count(*)::int AS n FROM feedback WHERE report_id = ${report.id}::uuid;`;
    expect(fb?.n).toBe(0);
  });

  it('OWNER-002: chủ hồ sơ bằng X-Report-Key đánh giá "Đã giải quyết" -> dong', async () => {
    const report = await track('hoan_thanh', { ownerKey: KEY });
    const res = await post(
      `/citizen/reports/${report.code}/feedback`,
      { resolved: true, rating: 4, tags: ['Xử lý nhanh'], comment: 'Tốt' },
      { 'X-Report-Key': KEY }
    );
    expect(res.status).toBe(200);
    expect(res.data.newStatus).toBe('dong');
    const [row] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(row?.status).toBe('dong');
  });

  it('OWNER-003: chủ hồ sơ bằng JWT SĐT báo "Chưa giải quyết" -> mo_lai và sinh nhiệm vụ nghiệm thu', async () => {
    const report = await track('hoan_thanh', { phone: OWNER_PHONE });
    const token = await createCitizenToken(OWNER_PHONE);
    const res = await post(
      `/citizen/reports/${report.code}/feedback`,
      { resolved: false, comment: 'Rác vẫn còn ở đó' },
      { Authorization: `Bearer ${token}` }
    );
    expect(res.status).toBe(200);
    expect(res.data.newStatus).toBe('mo_lai');
    const [row] =
      await sqlClient`SELECT status, completed_at FROM reports WHERE id = ${report.id}::uuid;`;
    expect(row?.status).toBe('mo_lai');
    expect(row?.completed_at).toBeNull();
    const tasks = await sqlClient`
      SELECT type, status FROM volunteer_tasks WHERE report_id = ${report.id}::uuid;
    `;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ type: 'nghiem_thu', status: 'cho_nhan' });
    await sqlClient`DELETE FROM volunteer_tasks WHERE report_id = ${report.id}::uuid;`;
  });

  it('OWNER-004: đánh giá "Đã giải quyết" thiếu số sao -> 400; hồ sơ chưa hoàn thành -> 400', async () => {
    const done = await track('hoan_thanh', { ownerKey: KEY });
    const noStar = await post(
      `/citizen/reports/${done.code}/feedback`,
      { resolved: true },
      { 'X-Report-Key': KEY }
    );
    expect(noStar.status).toBe(400);

    const open = await track('da_giao', { ownerKey: KEY });
    const early = await post(
      `/citizen/reports/${open.code}/feedback`,
      { resolved: true, rating: 5 },
      { 'X-Report-Key': KEY }
    );
    expect(early.status).toBe(400);
    expect(early.data.error.code).toBe('INVALID_STATE');
  });

  it('OWNER-005: bổ sung thông tin chỉ dành cho chủ hồ sơ (can_bo_sung -> moi)', async () => {
    const report = await track('can_bo_sung', { ownerKey: KEY });
    const denied = await post(`/citizen/reports/${report.code}/supplement`, { note: 'Thêm ảnh' });
    expect(denied.status).toBe(401);
    const stranger = await createCitizenToken('0900000001');
    const notOwner = await post(
      `/citizen/reports/${report.code}/supplement`,
      { note: 'Thêm ảnh' },
      { Authorization: `Bearer ${stranger}` }
    );
    expect(notOwner.status).toBe(403);
    const [still] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(still?.status).toBe('can_bo_sung');

    const ok = await post(
      `/citizen/reports/${report.code}/supplement`,
      { note: 'Đã chụp thêm ảnh gần hơn' },
      { 'X-Report-Key': KEY }
    );
    expect(ok.status).toBe(200);
    expect(ok.data.newStatus).toBe('moi');
  });
});
