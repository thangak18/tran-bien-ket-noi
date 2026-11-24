import { Hono } from 'hono';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, StaffProfile } from '../middleware/auth';
import { maskPhone } from '../../src/domain/privacy';
import { getDemoNow } from '../clock';
import { executeTransition } from '../services/transition';
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

  const [totalRow] =
    await sqlClient`SELECT count(*)::int as count FROM reports WHERE is_seed = true;`;
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
  const body = await c.req.json().catch(() => ({}));

  const result = await executeTransition({
    reportId: codeOrId,
    targetStatus: 'da_tiep_nhan',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ phường Trấn Biên',
      staffId: staff.userId,
    },
    params: { note: 'Đã tiếp nhận phản ánh' },
    clientVersion: body.version,
  });

  return c.json({
    success: true,
    newStatus: result.report.status,
    code: result.report.code,
    version: result.version,
  });
});

/**
 * 4. POST /officer/reports/:id/assign-volunteer - Giao nhiệm vụ xác minh / nghiệm thu cho TNV
 */
officerRoutes.post('/reports/:id/assign-volunteer', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const taskType = body.type === 'nghiem_thu' ? 'nghiem_thu' : 'xac_minh';
  const staff = c.get('staff') as StaffProfile;

  // Nếu là xác minh thì chuyển trạng thái hồ sơ sang cho_xac_minh
  let resultVersion = body.version;
  if (taskType === 'xac_minh') {
    const result = await executeTransition({
      reportId: codeOrId,
      targetStatus: 'cho_xac_minh',
      actor: {
        role: 'CB',
        actorType: 'staff',
        actorLabel: staff.displayName || 'Cán bộ tiếp nhận',
        staffId: staff.userId,
      },
      params: { note: 'Chuyển tình nguyện viên xác minh hiện trường' },
      clientVersion: body.version,
    });
    resultVersion = result.version;
  }

  // Tra cứu id report
  const [report] = await sqlClient`
    SELECT id FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
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

  return c.json({
    success: true,
    task: { id: newTask.code, uuid: newTask.id, type: taskType },
    version: resultVersion,
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

  const [dept] = await sqlClient`
    SELECT name FROM departments WHERE id = ${departmentId} LIMIT 1;
  `;
  const deptName = dept?.name || departmentId;

  // Tính SLA
  const [rep] = await sqlClient`
    SELECT category FROM reports WHERE code = ${codeOrId} OR id::text = ${codeOrId} LIMIT 1;
  `;
  const [slaRow] = await sqlClient`
    SELECT sla_days FROM category_settings WHERE category = ${rep?.category} LIMIT 1;
  `;
  const slaDays = slaRow?.sla_days || 3;
  const dueAt =
    body.dueAt || new Date(new Date(now).getTime() + slaDays * 24 * 60 * 60 * 1000).toISOString();

  const result = await executeTransition({
    reportId: codeOrId,
    targetStatus: 'da_giao',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ phân xử lý',
      staffId: staff.userId,
    },
    params: {
      departmentId,
      dueAt,
      note: `Giao xử lý: ${deptName}`,
    },
    clientVersion: body.version,
  });

  return c.json({
    success: true,
    newStatus: result.report.status,
    dueAt,
    version: result.version,
  });
});

/**
 * 6. POST /officer/reports/:id/complete - Hoàn thành xử lý (hoan_thanh)
 */
officerRoutes.post('/reports/:id/complete', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const resultNote =
    body.resultNote?.trim() || 'Đã hoàn thành kiểm tra và khắc phục sự cố tại hiện trường';
  const resultPhotos = Array.isArray(body.resultPhotos)
    ? body.resultPhotos
    : Array.isArray(body.photos)
      ? body.photos
      : ['/demo-photos/after/rac_thai.jpg'];
  const staff = c.get('staff') as StaffProfile;

  const result = await executeTransition({
    reportId: codeOrId,
    targetStatus: 'hoan_thanh',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ xử lý',
      staffId: staff.userId,
    },
    params: {
      resultNote,
      resultPhotos,
    },
    clientVersion: body.version,
  });

  return c.json({
    success: true,
    newStatus: result.report.status,
    version: result.version,
  });
});

/**
 * 7. POST /officer/reports/:id/reject - Từ chối không xác nhận (khong_xac_nhan)
 */
officerRoutes.post('/reports/:id/reject', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const reason =
    body.reason?.trim() || 'Thông tin phản ánh không có căn cứ thực tế tại hiện trường';
  const staff = c.get('staff') as StaffProfile;

  const result = await executeTransition({
    reportId: codeOrId,
    targetStatus: 'khong_xac_nhan',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ tiếp nhận',
      staffId: staff.userId,
    },
    params: { note: reason },
    clientVersion: body.version,
  });

  return c.json({
    success: true,
    newStatus: result.report.status,
    version: result.version,
  });
});

/**
 * 8. POST /officer/reports/:id/merge - Gộp phản ánh trùng lặp (da_gop)
 */
officerRoutes.post('/reports/:id/merge', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const targetIdOrCode = body.targetReportId || body.targetCode;
  const staff = c.get('staff') as StaffProfile;

  if (!targetIdOrCode) {
    throw new AppError('BAD_REQUEST', 'Thiếu targetReportId để gộp hồ sơ', 400);
  }

  const [targetReport] = await sqlClient`
    SELECT id, code FROM reports WHERE code = ${targetIdOrCode} OR id::text = ${targetIdOrCode} LIMIT 1;
  `;

  if (!targetReport) {
    throw new AppError('NOT_FOUND', `Không tìm thấy hồ sơ đích ${targetIdOrCode}`, 404);
  }

  const result = await executeTransition({
    reportId: codeOrId,
    targetStatus: 'da_gop',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ tiếp nhận',
      staffId: staff.userId,
    },
    params: {
      mergedInto: targetReport.id,
      note: `Đã gộp vào phản ánh ${targetReport.code}`,
    },
    clientVersion: body.version,
  });

  return c.json({
    success: true,
    newStatus: result.report.status,
    mergedInto: targetReport.code,
    version: result.version,
  });
});
