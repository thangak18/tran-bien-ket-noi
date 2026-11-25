// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { executeTransition } from '../../server/services/transition';
import { sqlClient } from '../../server/db/client';
import { purgeTestReports } from './helpers';

describe('L4: Transition Service & Concurrency Locking (Spec 3.3)', () => {
  let testReportId: string;
  let testCode: string;
  const createdIds: string[] = [];

  afterAll(async () => {
    await purgeTestReports(createdIds);
  });

  beforeEach(async () => {
    testReportId = crypto.randomUUID();
    createdIds.push(testReportId);
    testCode = `TB-${crypto.randomBytes(4).toString('hex')}`;

    // Tạo hồ sơ mẫu mới ở trạng thái 'moi' cho từng test
    await sqlClient`
      INSERT INTO reports (
        id, code, category, status, priority, location, address,
        secret_code_hash, version, is_seed
      ) VALUES (
        ${testReportId}::uuid, ${testCode}, 'rac_thai', 'moi', 'binh_thuong',
        ST_GeographyFromText('POINT(106.8225 10.9505)'), '123 Đường Test',
        'hash123', 1, false
      );
    `;
  });

  it('TRANS-001: Transitions legally from moi -> da_tiep_nhan, increments version and writes timeline', async () => {
    const result = await executeTransition({
      reportId: testReportId,
      targetStatus: 'da_tiep_nhan',
      actor: {
        role: 'CB',
        actorType: 'staff',
        actorLabel: 'Cán bộ Minh',
      },
      clientVersion: 1,
    });

    expect(result.report.status).toBe('da_tiep_nhan');
    expect(result.version).toBe(2);

    // Kiểm tra DB
    const [row] =
      await sqlClient`SELECT status, version FROM reports WHERE id = ${testReportId}::uuid;`;
    expect(row).toBeDefined();
    expect(row!.status).toBe('da_tiep_nhan');
    expect(row!.version).toBe(2);

    // Kiểm tra timeline
    const [timelineRow] = await sqlClient`
      SELECT status, actor_label FROM report_timeline 
      WHERE report_id = ${testReportId}::uuid 
      ORDER BY at DESC LIMIT 1;
    `;
    expect(timelineRow).toBeDefined();
    expect(timelineRow!.status).toBe('da_tiep_nhan');
    expect(timelineRow!.actor_label).toBe('Cán bộ Minh');
  });

  it('TRANS-002: Rejects invalid status transition with 409 TRANSITION_NOT_ALLOWED', async () => {
    // Chuyển thẳng từ moi -> hoan_thanh là bất hợp lệ với cán bộ (Spec 3.3)
    await expect(
      executeTransition({
        reportId: testReportId,
        targetStatus: 'hoan_thanh',
        actor: {
          role: 'CB',
          actorType: 'staff',
          actorLabel: 'Cán bộ Minh',
        },
        params: {
          resultPhotos: ['/photo.jpg'],
          resultNote: 'Đã hoàn thành dọn rác sạch sẽ',
        },
      })
    ).rejects.toMatchObject({
      code: 'TRANSITION_NOT_ALLOWED',
      status: 409,
    });
  });

  it('TRANS-003: Rejects version mismatch with 409 VERSION_CONFLICT', async () => {
    // Hồ sơ đang ở version 1, nhưng client gửi version 99
    await expect(
      executeTransition({
        reportId: testReportId,
        targetStatus: 'da_tiep_nhan',
        actor: {
          role: 'CB',
          actorType: 'staff',
          actorLabel: 'Cán bộ Minh',
        },
        clientVersion: 99,
      })
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      status: 409,
    });
  });

  it('TRANS-004: Validates required params for hoan_thanh (photos and note >= 10 chars)', async () => {
    // Trước tiên đưa về da_giao
    await sqlClient`UPDATE reports SET status = 'da_giao' WHERE id = ${testReportId}::uuid;`;

    // Thiếu ảnh -> 400
    await expect(
      executeTransition({
        reportId: testReportId,
        targetStatus: 'hoan_thanh',
        actor: { role: 'CB', actorType: 'staff', actorLabel: 'Cán bộ' },
        params: { resultNote: 'Ghi chú trên 10 ký tự hợp lệ' },
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });

    // Ghi chú quá ngắn (< 10 ký tự) -> 400
    await expect(
      executeTransition({
        reportId: testReportId,
        targetStatus: 'hoan_thanh',
        actor: { role: 'CB', actorType: 'staff', actorLabel: 'Cán bộ' },
        params: {
          resultPhotos: ['/test.jpg'],
          resultNote: 'Ngắn',
        },
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });
  });

  it('TRANS-005: Concurrency - prevents race condition and double-transition with version conflict', async () => {
    // Hai cán bộ cùng đọc version 1 và đồng thời gửi yêu cầu chuyển trạng thái
    const promise1 = executeTransition({
      reportId: testReportId,
      targetStatus: 'da_tiep_nhan',
      actor: { role: 'CB', actorType: 'staff', actorLabel: 'Cán bộ 1' },
      clientVersion: 1,
    });

    const promise2 = executeTransition({
      reportId: testReportId,
      targetStatus: 'da_tiep_nhan',
      actor: { role: 'CB', actorType: 'staff', actorLabel: 'Cán bộ 2' },
      clientVersion: 1,
    });

    const results = await Promise.allSettled([promise1, promise2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Một bên thành công, một bên bị từ chối do xung đột phiên bản (409)
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason.status).toBe(409);
  });

  it('TRANS-006: chuyển trạng thái không kèm dueAt vẫn giữ nguyên hạn xử lý đã có', async () => {
    const due = '2026-11-27T10:00:00+07:00';
    await sqlClient`
      UPDATE reports SET status = 'da_tiep_nhan', due_at = ${due}::timestamptz
      WHERE id = ${testReportId}::uuid;
    `;
    const result = await executeTransition({
      reportId: testReportId,
      targetStatus: 'cho_xac_minh',
      actor: { role: 'CB', actorType: 'staff', actorLabel: 'Cán bộ Minh' },
    });
    expect(result.report.status).toBe('cho_xac_minh');
    const [row] = await sqlClient`
      SELECT due_at = ${due}::timestamptz AS same_due FROM reports WHERE id = ${testReportId}::uuid;
    `;
    expect(row?.same_due).toBe(true);
  });
});
