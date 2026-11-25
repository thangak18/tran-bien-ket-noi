// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { app } from '../../server/app';
import { env } from '../../server/env';
import { sqlClient } from '../../server/db/client';
import { createCitizenToken, createStaffToken, hashPepper } from '../../server/middleware/auth';
import {
  CB_ID,
  TNV_MAI_ID,
  call,
  createTestReport,
  findSensitiveLeaks,
  purgeTestReports,
} from './helpers';

const created: string[] = [];

async function track(status: string, phone: string | null = null) {
  const r = await createTestReport(status, { phone });
  created.push(r.id);
  return r;
}

describe('OFF: Luồng cán bộ, phân quyền và chuyển trạng thái (Spec 3.3, 13.5)', () => {
  afterAll(async () => {
    await purgeTestReports(created);
  });

  it('OFF-001: tiếp nhận đặt bộ phận và hạn mặc định theo category_settings, tăng version, ghi timeline', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const report = await track('moi');
    const res = await call(cb, 'POST', `/officer/reports/${report.code}/accept`, { version: 1 });
    expect(res.status).toBe(200);
    expect(res.data.newStatus).toBe('da_tiep_nhan');
    expect(res.data.version).toBe(2);

    const [row] = await sqlClient`
      SELECT department_id, due_at, version FROM reports WHERE id = ${report.id}::uuid;
    `;
    expect(row?.department_id).toBe('doi_ve_sinh'); // rac_thai
    expect(row?.due_at).not.toBeNull();
    const [timeline] = await sqlClient`
      SELECT count(*)::int AS n FROM report_timeline WHERE report_id = ${report.id}::uuid AND status = 'da_tiep_nhan';
    `;
    expect(timeline?.n).toBe(1);
  });

  it('OFF-002: hai cán bộ cùng tiếp nhận một hồ sơ (version 1) -> đúng một thành công, một 409', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const report = await track('moi');
    const results = await Promise.all([
      call(cb, 'POST', `/officer/reports/${report.code}/accept`, { version: 1 }),
      call(cb, 'POST', `/officer/reports/${report.code}/accept`, { version: 1 }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    const [timeline] = await sqlClient`
      SELECT count(*)::int AS n FROM report_timeline WHERE report_id = ${report.id}::uuid;
    `;
    expect(timeline?.n).toBe(1);
  });

  it('OFF-003: chuyển trạng thái sai ma trận -> 409 TRANSITION_NOT_ALLOWED, hồ sơ không đổi', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const report = await track('moi');
    const res = await call(cb, 'POST', `/officer/reports/${report.code}/complete`, {
      resultNote: 'Đã dọn sạch rác tại hiện trường',
      resultPhotos: ['/demo-photos/after/rac_thai.jpg'],
    });
    expect(res.status).toBe(409);
    expect(res.data.error.code).toBe('TRANSITION_NOT_ALLOWED');
    const [row] =
      await sqlClient`SELECT status, version FROM reports WHERE id = ${report.id}::uuid;`;
    expect(row).toMatchObject({ status: 'moi', version: 1 });
  });

  it('OFF-004: hoàn thành thiếu ảnh hoặc mô tả ngắn -> 400, không có giá trị mặc định giả', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const report = await track('da_giao');
    const noBody = await call(cb, 'POST', `/officer/reports/${report.code}/complete`, {});
    expect(noBody.status).toBe(400);
    const noPhoto = await call(cb, 'POST', `/officer/reports/${report.code}/complete`, {
      resultNote: 'Đã dọn sạch rác tại hiện trường',
    });
    expect(noPhoto.status).toBe(400);
    const shortNote = await call(cb, 'POST', `/officer/reports/${report.code}/complete`, {
      resultNote: 'Xong',
      resultPhotos: ['/demo-photos/after/rac_thai.jpg'],
    });
    expect(shortNote.status).toBe(400);
    const [row] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(row?.status).toBe('da_giao');

    const ok = await call(cb, 'POST', `/officer/reports/${report.code}/complete`, {
      resultNote: 'Đã dọn sạch rác tại hiện trường',
      resultPhotos: ['/demo-photos/after/rac_thai.jpg'],
    });
    expect(ok.status).toBe(200);
    expect(ok.data.newStatus).toBe('hoan_thanh');
  });

  it('OFF-005: cán bộ không đóng được hồ sơ hoan_thanh (của người dân/hệ thống); đóng được mo_lai', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const done = await track('hoan_thanh');
    const denied = await call(cb, 'POST', `/officer/reports/${done.code}/close`, {
      reason: 'Đóng hồ sơ trực tiếp',
    });
    expect(denied.status).toBe(409);
    const [stay] = await sqlClient`SELECT status FROM reports WHERE id = ${done.id}::uuid;`;
    expect(stay?.status).toBe('hoan_thanh');

    const reopened = await track('mo_lai');
    const ok = await call(cb, 'POST', `/officer/reports/${reopened.code}/close`, {
      reason: 'Đã nghiệm thu ổn',
    });
    expect(ok.status).toBe(200);
    expect(ok.data.newStatus).toBe('dong');
  });

  it('OFF-006: gộp rồi tách khôi phục đúng trạng thái trước khi gộp, qua transition.ts', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const main = await track('da_tiep_nhan');
    const dup = await track('da_tiep_nhan');

    const merged = await call(cb, 'POST', `/officer/reports/${dup.code}/merge`, {
      targetReportId: main.code,
    });
    expect(merged.status).toBe(200);
    expect(merged.data.newStatus).toBe('da_gop');
    const [m] =
      await sqlClient`SELECT merged_into, status_before_merge FROM reports WHERE id = ${dup.id}::uuid;`;
    expect(m?.merged_into).toBe(main.id);
    expect(m?.status_before_merge).toBe('da_tiep_nhan');

    const split = await call(cb, 'POST', `/officer/reports/${dup.code}/split`, {});
    expect(split.status).toBe(200);
    expect(split.data.newStatus).toBe('da_tiep_nhan');
    const [s] =
      await sqlClient`SELECT status, merged_into, status_before_merge FROM reports WHERE id = ${dup.id}::uuid;`;
    expect(s).toMatchObject({
      status: 'da_tiep_nhan',
      merged_into: null,
      status_before_merge: null,
    });

    const notMerged = await call(cb, 'POST', `/officer/reports/${main.code}/split`, {});
    expect(notMerged.status).toBe(400);
  });

  it('OFF-007: tạo hồ sơ hộ sinh mã bí mật ngẫu nhiên 4 số, chỉ lưu hash, trả đúng một lần', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const payload = {
      category: 'rac_thai',
      address: '12 Nguyễn Văn Trị',
      lat: 10.9505,
      lng: 106.8225,
      reporterPhone: '0987654321',
    };
    const secrets = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const res = await call(cb, 'POST', '/officer/reports', payload);
      expect(res.status).toBe(201);
      created.push(res.data.report.uuid);
      const secret = res.data.secretCode as string;
      expect(secret).toMatch(/^[1-9][0-9]{3}$/);
      secrets.add(secret);

      const [row] = await sqlClient`
        SELECT secret_code_hash, status, on_behalf, anonymous, department_id FROM reports WHERE id = ${res.data.report.uuid}::uuid;
      `;
      expect(row?.secret_code_hash).toBe(hashPepper(secret));
      expect(row).toMatchObject({ status: 'da_tiep_nhan', on_behalf: true, anonymous: false });
      expect(row?.department_id).toBe('doi_ve_sinh');
    }
    // Không còn mã cố định '0000': 6 mã ngẫu nhiên phải có ít nhất 2 giá trị khác nhau.
    expect(secrets.size).toBeGreaterThan(1);
    expect(secrets.has('0000')).toBe(false);

    // Mã bí mật không xuất hiện lại ở chi tiết hồ sơ của cán bộ, SĐT bị che.
    const code = (await call(cb, 'GET', '/officer/reports?limit=1')).data;
    expect(findSensitiveLeaks(code)).toEqual([]);
  });

  it('OFF-008: tạo hồ sơ hộ kiểm tra đầu vào (SĐT sai, toạ độ ngoài phường, thiếu loại) -> 400', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const base = {
      category: 'rac_thai',
      address: '12 Nguyễn Văn Trị',
      lat: 10.9505,
      lng: 106.8225,
      reporterPhone: '0987654321',
    };
    for (const bad of [
      { ...base, reporterPhone: '12345' },
      { ...base, lat: 20.0 },
      { ...base, category: 'khong_co' },
      { ...base, address: '' },
      { lat: 10.95, lng: 106.82 },
    ]) {
      expect((await call(cb, 'POST', '/officer/reports', bad)).status, JSON.stringify(bad)).toBe(
        400
      );
    }
  });

  it('OFF-009: người dân và không token không gọi được endpoint cán bộ (403 / 401)', async () => {
    const citizen = await createCitizenToken('0901234567');
    expect((await call(citizen, 'GET', '/officer/reports')).status).toBe(403);
    expect((await call(citizen, 'POST', '/officer/reports', {})).status).toBe(403);
    expect((await call(null, 'GET', '/officer/reports')).status).toBe(401);
    const tnv = await createStaffToken(TNV_MAI_ID, 'tnv');
    expect((await call(tnv, 'POST', '/officer/reports/TB-0001/close', {})).status).toBe(403);
  });

  it('OFF-010: cron chỉ nhận Authorization: Bearer <CRON_SECRET>', async () => {
    const path = '/api/v1/cron/sweep-overdue';
    const good = await app.request(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    expect(good.status).toBe(200);
    const oldHeader = await app.request(path, {
      method: 'POST',
      headers: { 'X-Cron-Secret': env.CRON_SECRET },
    });
    expect(oldHeader.status).toBe(401);
    const wrong = await app.request(path, {
      method: 'POST',
      headers: { Authorization: 'Bearer sai-secret' },
    });
    expect(wrong.status).toBe(401);
    const none = await app.request(path, { method: 'POST' });
    expect(none.status).toBe(401);
  });
});
