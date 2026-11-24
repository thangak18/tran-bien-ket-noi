import { Hono } from 'hono';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, StaffProfile } from '../middleware/auth';
import { maskPhone } from '../../src/domain/privacy';
import { getDemoNow } from '../clock';
import type { AppEnv } from '../types';

export const officerRoutes = new Hono<AppEnv>();

// Tất cả route cán bộ yêu cầu vai trò can_bo
officerRoutes.use('*', requireStaffAuth(['can_bo']));

/**
 * 1. GET /officer/reports - Danh sách hồ sơ dành cho cán bộ
 */
officerRoutes.get('/reports', async (c) => {
  const query = c.req.query();
  const status = query.status;
  const category = query.category;
  const departmentId = query.departmentId;
  const isOverdue = query.isOverdue === 'true';
  const search = query.search?.trim();
  const limit = Math.min(query.limit ? parseInt(query.limit, 10) : 50, 100);
  const offset = query.offset ? parseInt(query.offset, 10) : 0;
  const now = await getDemoNow();

  const reports = await sqlClient`
    SELECT 
      r.*,
      d.name as department_name,
      ST_X(r.location) as lng,
      ST_Y(r.location) as lat,
      (SELECT count(*)::int FROM report_followers f WHERE f.report_id = r.id) as follower_count
    FROM reports r
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE (${status ? sqlClient`r.status = ${status}` : sqlClient`true`})
      AND (${category ? sqlClient`r.category = ${category}` : sqlClient`true`})
      AND (${departmentId ? sqlClient`r.department_id = ${departmentId}` : sqlClient`true`})
      AND (${
        isOverdue
          ? sqlClient`r.status NOT IN ('hoan_thanh', 'dong') AND r.due_at IS NOT NULL AND r.due_at < ${now}::timestamptz`
          : sqlClient`true`
      })
      AND (${
        search
          ? sqlClient`(r.code ILIKE ${'%' + search + '%'} OR r.address ILIKE ${'%' + search + '%'} OR r.description ILIKE ${'%' + search + '%'})`
          : sqlClient`true`
      })
    ORDER BY r.created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  const items = reports.map((r) => ({
    id: r.code,
    uuid: r.id,
    code: r.code,
    category: r.category,
    status: r.status,
    priority: r.priority,
    lat: Number(r.lat),
    lng: Number(r.lng),
    address: r.address,
    locationNote: r.location_note || undefined,
    description: r.description || undefined,
    departmentId: r.department_id,
    departmentName: r.department_name,
    dueAt: r.due_at,
    isOverdue:
      r.status !== 'hoan_thanh' &&
      r.status !== 'dong' &&
      r.due_at &&
      new Date(r.due_at).getTime() < new Date(now).getTime(),
    createdAt: r.created_at,
    completedAt: r.completed_at,
    reporterPhone: maskPhone(r.reporter_phone), // Bảo đảm cán bộ chỉ thấy SĐT che (Spec 4.1)
    anonymous: r.anonymous,
    followerCount: (r.follower_count ? Number(r.follower_count) : 0) + (r.anonymous_follows || 0),
    photosApproved: r.photos_approved,
  }));

  return c.json({ items, total: items.length });
});

/**
 * 2. GET /officer/kpi - Thống kê chỉ số phục vụ cán bộ
 */
officerRoutes.get('/kpi', async (c) => {
  const now = await getDemoNow();

  const [totalRow] = await sqlClient`SELECT count(*)::int as count FROM reports WHERE is_seed = true;`;
  const [resolvedRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports WHERE is_seed = true AND status IN ('hoan_thanh', 'dong');
  `;
  const [overdueRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports
    WHERE is_seed = true AND status = 'da_giao' AND due_at < ${now}::timestamptz;
  `;
  const [pendingRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports WHERE is_seed = true AND status = 'moi';
  `;

  return c.json({
    total: totalRow?.count ?? 0,
    resolved: resolvedRow?.count ?? 0,
    overdue: overdueRow?.count ?? 0,
    pendingAcceptance: pendingRow?.count ?? 0,
    evaluatedAt: now,
  });
});

/**
 * 3. POST /officer/reports/:id/accept - Tiếp nhận phản ánh (moi -> da_tiep_nhan)
 */
officerRoutes.post('/reports/:id/accept', async (c) => {
  const codeOrId = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT id, code, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);
  if (report.status !== 'moi') {
    throw new AppError('INVALID_STATE', `Không thể tiếp nhận hồ sơ đang ở trạng thái "${report.status}"`, 400);
  }

  await sqlClient`
    UPDATE reports SET status = 'da_tiep_nhan' WHERE id = ${report.id};
  `;

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (
      ${report.id}, ${now}::timestamptz, 'da_tiep_nhan', 'staff', ${staff.userId}::uuid,
      ${staff.displayName}, 'Đã tiếp nhận phản ánh'
    );
  `;

  return c.json({ success: true, newStatus: 'da_tiep_nhan' });
});

/**
 * 4. POST /officer/reports/:id/assign-volunteer - Giao nhiệm vụ xác minh / nghiệm thu cho TNV
 */
officerRoutes.post('/reports/:id/assign-volunteer', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const taskType = body.type === 'nghiem_thu' ? 'nghiem_thu' : 'xac_minh';
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT id, code, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  // Sinh mã task NV-xxx
  const [maxTask] = await sqlClient`
    SELECT code FROM volunteer_tasks WHERE code ~ '^NV-[0-9]{3}$' ORDER BY code DESC LIMIT 1;
  `;
  let nextNum = 5;
  if (maxTask?.code) {
    const p = parseInt(maxTask.code.replace('NV-', ''), 10);
    if (!isNaN(p)) nextNum = p + 1;
  }
  const taskCode = `NV-${nextNum.toString().padStart(3, '0')}`;

  const [newTask] = await sqlClient`
    INSERT INTO volunteer_tasks (code, report_id, type, status)
    VALUES (${taskCode}, ${report.id}, ${taskType}, 'cho_nhan')
    RETURNING id, code;
  `;

  if (!newTask) {
    throw new AppError('INTERNAL_SERVER_ERROR', 'Không thể tạo nhiệm vụ tình nguyện viên', 500);
  }

  if (taskType === 'xac_minh') {
    await sqlClient`
      UPDATE reports SET status = 'cho_xac_minh' WHERE id = ${report.id};
    `;
    await sqlClient`
      INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
      VALUES (
        ${report.id}, ${now}::timestamptz, 'cho_xac_minh', 'staff', ${staff.userId}::uuid,
        ${staff.displayName}, 'Chuyển tình nguyện viên xác minh hiện trường'
      );
    `;
  }

  return c.json({
    success: true,
    task: { id: newTask.code, uuid: newTask.id, type: taskType },
  });
});

/**
 * 5. POST /officer/reports/:id/assign-dept - Giao đơn vị xử lý (da_giao)
 */
officerRoutes.post('/reports/:id/assign-dept', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const departmentId = body.departmentId;
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  if (!departmentId) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn đơn vị tiếp nhận xử lý', 400);
  }

  const [report] = await sqlClient`
    SELECT id, code, category, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  // Tính SLA
  const [slaRow] = await sqlClient`
    SELECT sla_days FROM category_settings WHERE category = ${report.category} LIMIT 1;
  `;
  const slaDays = slaRow?.sla_days || 3;
  const dueAt = body.dueAt || new Date(new Date(now).getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();

  const [dept] = await sqlClient`
    SELECT name FROM departments WHERE id = ${departmentId} LIMIT 1;
  `;
  const deptName = dept?.name || departmentId;

  await sqlClient`
    UPDATE reports
    SET status = 'da_giao', department_id = ${departmentId}, due_at = ${dueAt}::timestamptz
    WHERE id = ${report.id};
  `;

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (
      ${report.id}, ${now}::timestamptz, 'da_giao', 'staff', ${staff.userId}::uuid,
      ${staff.displayName}, ${`Giao xử lý: ${deptName}`}
    );
  `;

  return c.json({ success: true, newStatus: 'da_giao', dueAt });
});

/**
 * 6. POST /officer/reports/:id/complete - Hoàn thành xử lý (hoan_thanh)
 */
officerRoutes.post('/reports/:id/complete', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const resultNote = body.resultNote?.trim() || 'Đã hoàn thành kiểm tra và khắc phục sự cố tại hiện trường';
  const resultPhotos = Array.isArray(body.resultPhotos) ? body.resultPhotos : [];
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT id, code, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  await sqlClient`
    UPDATE reports
    SET status = 'hoan_thanh', completed_at = ${now}::timestamptz, result_note = ${resultNote}
    WHERE id = ${report.id};
  `;

  // Lưu ảnh kết quả
  let sort = 0;
  for (const p of resultPhotos) {
    if (typeof p === 'string' && p.trim()) {
      await sqlClient`
        INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
        VALUES (${report.id}, 'after', ${p.trim()}, ${sort++}, 'upload');
      `;
    }
  }

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (
      ${report.id}, ${now}::timestamptz, 'hoan_thanh', 'staff', ${staff.userId}::uuid,
      ${staff.displayName}, ${resultNote}
    );
  `;

  return c.json({ success: true, newStatus: 'hoan_thanh' });
});

/**
 * 7. POST /officer/reports/:id/reject - Từ chối không xác nhận (khong_xac_nhan)
 */
officerRoutes.post('/reports/:id/reject', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const reason = body.reason?.trim() || 'Thông tin phản ánh không có căn cứ thực tế tại hiện trường';
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT id, code, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;

  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

  await sqlClient`
    UPDATE reports SET status = 'khong_xac_nhan' WHERE id = ${report.id};
  `;

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (
      ${report.id}, ${now}::timestamptz, 'khong_xac_nhan', 'staff', ${staff.userId}::uuid,
      ${staff.displayName}, ${reason}
    );
  `;

  return c.json({ success: true, newStatus: 'khong_xac_nhan' });
});

/**
 * 8. POST /officer/reports/:id/merge - Gộp phản ánh trùng lặp (da_gop)
 */
officerRoutes.post('/reports/:id/merge', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const targetIdOrCode = body.targetReportId;
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [sourceReport] = await sqlClient`
    SELECT id, code, status FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;
  const [targetReport] = await sqlClient`
    SELECT id, code, status FROM reports WHERE code = ${targetIdOrCode} OR id::text = ${targetIdOrCode} LIMIT 1;
  `;

  if (!sourceReport || !targetReport) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ nguồn hoặc hồ sơ đích', 404);
  }

  if (sourceReport.id === targetReport.id) {
    throw new AppError('INVALID_OPERATION', 'Không thể tự gộp hồ sơ vào chính nó', 400);
  }

  await sqlClient`
    UPDATE reports
    SET status = 'da_gop', merged_into = ${targetReport.id}, status_before_merge = ${sourceReport.status}
    WHERE id = ${sourceReport.id};
  `;

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (
      ${sourceReport.id}, ${now}::timestamptz, 'da_gop', 'staff', ${staff.userId}::uuid,
      ${staff.displayName}, ${`Đã gộp vào phản ánh ${targetReport.code}`}
    );
  `;

  return c.json({ success: true, newStatus: 'da_gop', mergedInto: targetReport.code });
});
