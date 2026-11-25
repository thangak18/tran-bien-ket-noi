// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { sqlClient } from '../../server/db/client';
import { createCitizenToken, createStaffToken } from '../../server/middleware/auth';
import {
  CB_ID,
  TNV_MAI_ID,
  TNV_NAM_ID,
  call,
  createTestReport,
  createTestTask,
  findSensitiveLeaks,
  purgeTestReports,
} from './helpers';

const PHONE = '0912345678';
const created: string[] = [];

async function track(status: string, phone: string | null = null) {
  const r = await createTestReport(status, { phone });
  created.push(r.id);
  return r;
}

describe('VOL: Luồng tình nguyện viên (Spec 3.3, AC-V01/V02)', () => {
  afterAll(async () => {
    await purgeTestReports(created);
    await sqlClient`DELETE FROM volunteer_tasks WHERE code LIKE 'NV-T%';`;
  });

  it('VOL-000: hàm phát hiện rò rỉ thực sự bắt được SĐT và mã bí mật (tránh test rỗng)', () => {
    expect(findSensitiveLeaks({ reportPhone: '0912345678' })).toContain('số điện thoại');
    expect(findSensitiveLeaks({ secretCode: '1234' })).toContain('secretCode');
    expect(findSensitiveLeaks({ ownerToken: 'abc' })).toContain('ownerToken');
    expect(findSensitiveLeaks({ phone: '0909 *** 068', address: '12 Nguyễn Văn Trị' })).toEqual([]);
  });

  it('VOL-001: danh sách, chi tiết và kết quả nhiệm vụ không chứa SĐT hay mã bí mật', async () => {
    const tnv = await createStaffToken(TNV_MAI_ID, 'tnv');
    const report = await track('cho_xac_minh', PHONE);
    const task = await createTestTask(report.id, 'xac_minh', TNV_MAI_ID);

    const list = await call(tnv, 'GET', '/volunteer/tasks');
    expect(list.status).toBe(200);
    expect(findSensitiveLeaks(list.data)).toEqual([]);
    expect(list.data.items.some((t: { id: string }) => t.id === task.code)).toBe(true);

    const detail = await call(tnv, 'GET', `/volunteer/tasks/${task.code}`);
    expect(detail.status).toBe(200);
    expect(findSensitiveLeaks(detail.data)).toEqual([]);

    const submit = await call(tnv, 'POST', `/volunteer/tasks/${task.code}/submit`, {
      exists: 'co',
      severity: 'nhe',
      photoPath: '/demo-photos/placeholder.jpg',
    });
    expect(submit.status).toBe(200);
    expect(findSensitiveLeaks(submit.data)).toEqual([]);
  });

  it('VOL-002: cán bộ và người dân không nhận hay nộp được nhiệm vụ TNV (403)', async () => {
    const report = await track('cho_xac_minh');
    const task = await createTestTask(report.id, 'xac_minh', null);
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const citizen = await createCitizenToken('0901234567');

    expect((await call(cb, 'POST', `/volunteer/tasks/${task.code}/claim`)).status).toBe(403);
    expect(
      (
        await call(cb, 'POST', `/volunteer/tasks/${task.code}/submit`, {
          exists: 'co',
          severity: 'nhe',
          photoPath: '/x.jpg',
        })
      ).status
    ).toBe(403);
    expect((await call(citizen, 'POST', `/volunteer/tasks/${task.code}/claim`)).status).toBe(403);
    expect((await call(citizen, 'GET', '/volunteer/tasks')).status).toBe(403);

    const [row] = await sqlClient`SELECT status FROM volunteer_tasks WHERE code = ${task.code};`;
    expect(row?.status).toBe('cho_nhan');
  });

  it('VOL-003: TNV không nộp kết quả thay cho nhiệm vụ của TNV khác (403)', async () => {
    const report = await track('cho_xac_minh');
    const task = await createTestTask(report.id, 'xac_minh', TNV_MAI_ID);
    const nam = await createStaffToken(TNV_NAM_ID, 'tnv');

    const res = await call(nam, 'POST', `/volunteer/tasks/${task.code}/submit`, {
      exists: 'co',
      severity: 'nhe',
      photoPath: '/x.jpg',
    });
    expect(res.status).toBe(403);
    const [row] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(row?.status).toBe('cho_xac_minh');

    const claim = await call(nam, 'POST', `/volunteer/tasks/${task.code}/claim`);
    expect(claim.status).toBe(409);
  });

  it('VOL-004: thiếu ảnh, thiếu mức độ khi "Có", hoặc giá trị lạ -> 400', async () => {
    const report = await track('cho_xac_minh');
    const task = await createTestTask(report.id, 'xac_minh', TNV_MAI_ID);
    const mai = await createStaffToken(TNV_MAI_ID, 'tnv');
    const url = `/volunteer/tasks/${task.code}/submit`;

    expect((await call(mai, 'POST', url, { exists: 'co', severity: 'nhe' })).status).toBe(400);
    expect((await call(mai, 'POST', url, { exists: 'co', photoPath: '/x.jpg' })).status).toBe(400);
    expect(
      (await call(mai, 'POST', url, { exists: 'co', severity: 'rat_nang', photoPath: '/x.jpg' }))
        .status
    ).toBe(400);
    expect((await call(mai, 'POST', url, { exists: 'co chu', photoPath: '/x.jpg' })).status).toBe(
      400
    );
    expect((await call(mai, 'POST', url, {})).status).toBe(400);

    const [row] = await sqlClient`SELECT status FROM volunteer_tasks WHERE code = ${task.code};`;
    expect(row?.status).toBe('dang_lam');
  });

  it('VOL-005: cán bộ giao TNV -> TNV xác nhận "Có" -> hệ thống chuyển da_tiep_nhan qua transition.ts', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const mai = await createStaffToken(TNV_MAI_ID, 'tnv');
    const report = await track('da_tiep_nhan');

    const assign = await call(cb, 'POST', `/officer/reports/${report.code}/assign-volunteer`, {
      type: 'xac_minh',
      assigneeId: TNV_MAI_ID,
    });
    expect(assign.status).toBe(200);
    expect(assign.data.task.status).toBe('dang_lam');
    const taskCode = assign.data.task.id as string;

    const [mid] =
      await sqlClient`SELECT status, version FROM reports WHERE id = ${report.id}::uuid;`;
    expect(mid?.status).toBe('cho_xac_minh');

    const submit = await call(mai, 'POST', `/volunteer/tasks/${taskCode}/submit`, {
      exists: 'co',
      severity: 'trung_binh',
      photoPath: '/demo-photos/placeholder.jpg',
      note: 'Rác đổ tràn ra lề đường',
    });
    expect(submit.status).toBe(200);
    expect(submit.data.reportStatus).toBe('da_tiep_nhan');

    const [after] =
      await sqlClient`SELECT status, version FROM reports WHERE id = ${report.id}::uuid;`;
    expect(after?.status).toBe('da_tiep_nhan');
    expect(after?.version).toBe((mid?.version as number) + 1);

    const timeline = await sqlClient`
      SELECT status, actor_type, actor_staff_id FROM report_timeline
      WHERE report_id = ${report.id}::uuid ORDER BY at, status;
    `;
    const last = timeline.find(
      (t) => t.status === 'da_tiep_nhan' && t.actor_staff_id === TNV_MAI_ID
    );
    expect(last).toBeDefined();

    const [task] = await sqlClient`
      SELECT status, result_exists, result_severity FROM volunteer_tasks WHERE code = ${taskCode};
    `;
    expect(task).toMatchObject({
      status: 'xong',
      result_exists: 'co',
      result_severity: 'trung_binh',
    });

    const [photo] = await sqlClient`
      SELECT kind FROM report_photos WHERE report_id = ${report.id}::uuid AND kind = 'verify';
    `;
    expect(photo?.kind).toBe('verify');

    // Nộp lần hai: 409, không tạo thêm timeline
    const again = await call(mai, 'POST', `/volunteer/tasks/${taskCode}/submit`, {
      exists: 'co',
      severity: 'nhe',
      photoPath: '/x.jpg',
    });
    expect(again.status).toBe(409);
  });

  it('VOL-006: TNV báo "Không có" chỉ ghi kết quả; cán bộ xác nhận khong_xac_nhan', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const mai = await createStaffToken(TNV_MAI_ID, 'tnv');
    const report = await track('cho_xac_minh');
    const task = await createTestTask(report.id, 'xac_minh', TNV_MAI_ID);

    const submit = await call(mai, 'POST', `/volunteer/tasks/${task.code}/submit`, {
      exists: 'khong',
      photoPath: '/demo-photos/placeholder.jpg',
    });
    expect(submit.status).toBe(200);
    expect(submit.data.reportStatus).toBeUndefined();
    const [still] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(still?.status).toBe('cho_xac_minh');

    const confirm = await call(cb, 'POST', `/officer/reports/${report.code}/mark-unverified`, {
      reason: 'TNV xác minh hiện trường không có sự cố',
    });
    expect(confirm.status).toBe(200);
    expect(confirm.data.newStatus).toBe('khong_xac_nhan');
  });

  it('VOL-007: nhiệm vụ nghiệm thu chỉ ghi kết quả, không tự đóng hồ sơ; CB đóng mo_lai -> dong', async () => {
    const cb = await createStaffToken(CB_ID, 'can_bo');
    const mai = await createStaffToken(TNV_MAI_ID, 'tnv');
    const report = await track('mo_lai');
    const task = await createTestTask(report.id, 'nghiem_thu', TNV_MAI_ID);

    const submit = await call(mai, 'POST', `/volunteer/tasks/${task.code}/submit`, {
      exists: 'khong',
      photoPath: '/demo-photos/placeholder.jpg',
    });
    expect(submit.status).toBe(200);
    const [still] = await sqlClient`SELECT status FROM reports WHERE id = ${report.id}::uuid;`;
    expect(still?.status).toBe('mo_lai');

    const close = await call(cb, 'POST', `/officer/reports/${report.code}/close`, {
      reason: 'TNV nghiệm thu: sự cố đã ổn',
    });
    expect(close.status).toBe(200);
    expect(close.data.newStatus).toBe('dong');
  });
});
