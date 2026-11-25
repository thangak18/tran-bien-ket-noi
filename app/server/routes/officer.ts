import { Hono } from 'hono';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, StaffProfile, hashPepper } from '../middleware/auth';
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
      ST_X(r.location::geometry) as lng,
      ST_Y(r.location::geometry) as lat,
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
 * 2. GET /officer/kpi - Thống kê chỉ số phục vụ cán bộ (tính từ dữ liệu thực, không cứng theo is_seed)
 */
officerRoutes.get('/kpi', async (c) => {
  const query = c.req.query();
  const from = query.from;
  const to = query.to;
  const now = await getDemoNow();

  const [totalRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports
    WHERE (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;
  const [resolvedRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports 
    WHERE status IN ('hoan_thanh', 'dong')
      AND (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;
  const [overdueRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports
    WHERE status IN ('da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'mo_lai')
      AND due_at IS NOT NULL
      AND due_at < ${now}::timestamptz
      AND (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;
  const [dueSoonRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports
    WHERE status IN ('da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'mo_lai')
      AND due_at IS NOT NULL
      AND due_at >= ${now}::timestamptz
      AND due_at <= (${now}::timestamptz + interval '24 hours')
      AND (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;
  const [pendingRow] = await sqlClient`
    SELECT count(*)::int as count FROM reports 
    WHERE status = 'moi'
      AND (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;

  return c.json({
    total: totalRow?.count ?? 0,
    resolved: resolvedRow?.count ?? 0,
    overdue: overdueRow?.count ?? 0,
    dueSoon: dueSoonRow?.count ?? 0,
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

/**
 * 9. GET /officer/reports/:code - Chi tiết phản ánh đầy đủ cho cán bộ
 */
officerRoutes.get('/reports/:code', async (c) => {
  const code = c.req.param('code');

  const [report] = await sqlClient`
    SELECT 
      r.*,
      d.name as department_name,
      ST_X(r.location::geometry) as lng,
      ST_Y(r.location::geometry) as lat,
      (SELECT count(*)::int FROM report_followers f WHERE f.report_id = r.id) as follower_count,
      fb.resolved as feedback_resolved,
      fb.rating as feedback_rating,
      fb.tags as feedback_tags,
      fb.comment as feedback_comment,
      fb.at as feedback_at
    FROM reports r
    LEFT JOIN departments d ON d.id = r.department_id
    LEFT JOIN feedback fb ON fb.report_id = r.id
    WHERE r.code = ${code} OR r.id::text = ${code}
    LIMIT 1;
  `;

  if (!report) {
    throw new AppError('NOT_FOUND', `Không tìm thấy phản ánh ${code}`, 404);
  }

  const photos = await sqlClient`
    SELECT report_id, kind, storage_path, sort
    FROM report_photos
    WHERE report_id = ${report.id}
    ORDER BY sort ASC;
  `;

  const timeline = await sqlClient`
    SELECT t.report_id, t.at, t.status, t.actor_type, t.actor_label, t.note, sp.display_name as staff_name
    FROM report_timeline t
    LEFT JOIN staff_profiles sp ON sp.user_id = t.actor_staff_id
    WHERE t.report_id = ${report.id}
    ORDER BY t.at ASC;
  `;

  return c.json({
    id: report.code,
    uuid: report.id,
    code: report.code,
    category: report.category,
    status: report.status,
    priority: report.priority,
    lat: Number(report.lat),
    lng: Number(report.lng),
    address: report.address,
    locationNote: report.location_note || undefined,
    description: report.description || undefined,
    departmentId: report.department_id,
    departmentName: report.department_name,
    dueAt: report.due_at,
    createdAt: report.created_at,
    completedAt: report.completed_at,
    reporterPhone: maskPhone(report.reporter_phone),
    anonymous: report.anonymous,
    followerCount:
      (report.follower_count ? Number(report.follower_count) : 0) + (report.anonymous_follows || 0),
    photosApproved: report.photos_approved,
    resultNote: report.result_note || undefined,
    version: report.version,
    photos: photos.map((p) => ({
      kind: p.kind,
      url: p.storage_path,
    })),
    timeline: timeline.map((t) => ({
      at: t.at,
      status: t.status,
      actor: t.staff_name || t.actor_label,
      note: t.note || undefined,
    })),
  });
});

/**
 * 10. PATCH /officer/reports/:code - Sửa trường phân loại / phòng ban
 */
officerRoutes.patch('/reports/:code', async (c) => {
  const code = c.req.param('code');
  const body = await c.req.json();
  const { category, priority, departmentId, dueAt, version } = body;

  const [report] = await sqlClient`
    SELECT * FROM reports WHERE code = ${code} OR id::text = ${code} LIMIT 1;
  `;
  if (!report) throw new AppError('NOT_FOUND', `Không tìm thấy phản ánh ${code}`, 404);

  if (version !== undefined && version !== report.version) {
    throw new AppError('VERSION_CONFLICT', 'Xung đột phiên bản cập nhật', 409);
  }

  const newVersion = (report.version || 1) + 1;
  await sqlClient`
    UPDATE reports
    SET
      category = ${category || report.category},
      priority = ${priority || report.priority},
      department_id = ${departmentId !== undefined ? departmentId : report.department_id},
      due_at = ${dueAt ? new Date(dueAt).toISOString() : report.due_at}::timestamptz,
      version = ${newVersion}
    WHERE id = ${report.id};
  `;

  return c.json({ success: true, version: newVersion });
});

/**
 * 11. POST /officer/reports/:id/assign-department - Alias cho assign-dept
 */
officerRoutes.post('/reports/:id/assign-department', async (c) => {
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
 * 12. POST /officer/reports/:id/request-supplement - Yêu cầu bổ sung thông tin
 */
officerRoutes.post('/reports/:id/request-supplement', async (c) => {
  const id = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;
  const body = await c.req.json();
  const reason = body.reason || body.note;

  if (!reason || reason.trim().length < 10) {
    throw new AppError('BAD_REQUEST', 'Cần nhập lý do yêu cầu bổ sung ít nhất 10 ký tự', 400);
  }

  const result = await executeTransition({
    reportId: id,
    targetStatus: 'can_bo_sung',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ tiếp nhận',
      staffId: staff.userId,
    },
    params: { note: reason.trim() },
    clientVersion: body.version,
  });

  return c.json({ success: true, newStatus: result.report.status, version: result.version });
});

/**
 * 13. POST /officer/reports/:id/transfer - Chuyển cơ quan khác xử lý
 */
officerRoutes.post('/reports/:id/transfer', async (c) => {
  const id = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;
  const body = await c.req.json();
  const reason = body.reason || body.note;
  const targetAgency = body.targetAgency || 'Cơ quan chức năng cấp trên';

  if (!reason || reason.trim().length < 10) {
    throw new AppError('BAD_REQUEST', 'Cần nhập lý do chuyển cơ quan ít nhất 10 ký tự', 400);
  }

  const result = await executeTransition({
    reportId: id,
    targetStatus: 'chuyen_co_quan',
    actor: {
      role: 'CB',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ xử lý',
      staffId: staff.userId,
    },
    params: { note: `Chuyển tới ${targetAgency}: ${reason.trim()}`, targetAgency },
    clientVersion: body.version,
  });

  return c.json({ success: true, newStatus: result.report.status, version: result.version });
});

/**
 * 14. POST /officer/reports/:id/close - Đóng hồ sơ trực tiếp
 */
officerRoutes.post('/reports/:id/close', async (c) => {
  const id = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;
  const body = await c.req.json().catch(() => ({}));
  const reason = body.reason || body.note || 'Cán bộ quyết định đóng hồ sơ';

  const result = await executeTransition({
    reportId: id,
    targetStatus: 'dong',
    actor: {
      role: 'system',
      actorType: 'staff',
      actorLabel: staff.displayName || 'Cán bộ xử lý',
      staffId: staff.userId,
    },
    params: { note: reason },
    clientVersion: body.version,
  });

  return c.json({ success: true, newStatus: result.report.status, version: result.version });
});

/**
 * 15. POST /officer/reports/:id/mark-unverified - Đánh dấu không xác nhận
 */
officerRoutes.post('/reports/:id/mark-unverified', async (c) => {
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
 * 16. POST /officer/reports/:id/split - Tách hồ sơ đã gộp
 */
officerRoutes.post('/reports/:id/split', async (c) => {
  const id = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [report] = await sqlClient`
    SELECT * FROM reports WHERE id::text = ${id} OR code = ${id} LIMIT 1;
  `;
  if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);
  if (report.status !== 'da_gop') {
    throw new AppError('BAD_REQUEST', 'Hồ sơ không ở trạng thái đã gộp', 400);
  }

  const restoredStatus = report.status_before_merge || 'da_tiep_nhan';
  const newVersion = (report.version || 1) + 1;

  await sqlClient`
    UPDATE reports
    SET status = ${restoredStatus}, merged_into = null, status_before_merge = null, version = ${newVersion}
    WHERE id = ${report.id};
  `;

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (${report.id}, ${now}::timestamptz, ${restoredStatus}, 'staff', ${staff.userId}::uuid, ${staff.displayName}, 'Tách khỏi hồ sơ đã gộp');
  `;

  return c.json({ success: true, newStatus: restoredStatus, version: newVersion });
});

/**
 * 17. POST /officer/reports - Tạo phản ánh hộ người dân (B5)
 */
officerRoutes.post('/reports', async (c) => {
  const staff = c.get('staff') as StaffProfile;
  const body = await c.req.json();
  const { category, address, lat, lng, description, reporterPhone, photos } = body;
  const now = await getDemoNow();

  const [maxRow] = await sqlClient`
    SELECT code FROM reports WHERE code ~ '^TB-[0-9]{4}$' ORDER BY code DESC LIMIT 1;
  `;
  let nextNum = 65;
  if (maxRow?.code) {
    const parsed = parseInt(maxRow.code.replace('TB-', ''), 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  const code = `TB-${nextNum.toString().padStart(4, '0')}`;

  const secretCode = '0000';
  const secretCodeHash = hashPepper(secretCode);
  const pointSql = `POINT(${lng ?? 106.8225} ${lat ?? 10.9505})`;

  const [created] = await sqlClient`
    INSERT INTO reports (
      code, category, status, priority, location, address, description,
      reporter_phone, anonymous, on_behalf, secret_code_hash, photos_approved, version, is_seed
    ) VALUES (
      ${code}, ${category || 'rac_thai'}, 'da_tiep_nhan', 'binh_thuong',
      ST_GeographyFromText(${pointSql}), ${address || 'Ủy ban Phường Trấn Biên'}, ${description || null},
      ${reporterPhone || null}, false, true, ${secretCodeHash}, true, 1, false
    )
    RETURNING id, code, status;
  `;

  if (!created) throw new AppError('INTERNAL_ERROR', 'Không thể tạo phản ánh', 500);

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (${created.id}, ${now}::timestamptz, 'da_tiep_nhan', 'staff', ${staff.userId}::uuid, ${staff.displayName}, 'Cán bộ tạo phản ánh hộ người dân (B5)');
  `;

  if (Array.isArray(photos)) {
    for (let i = 0; i < photos.length; i++) {
      if (photos[i]) {
        await sqlClient`
          INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
          VALUES (${created.id}, 'before', ${photos[i]}, ${i + 1}, 'staff');
        `;
      }
    }
  }

  return c.json({ success: true, report: created }, 201);
});

/**
 * 18. POST /officer/reports/on-behalf - Alias cho tạo phản ánh hộ
 */
officerRoutes.post('/reports/on-behalf', async (c) => {
  const staff = c.get('staff') as StaffProfile;
  const body = await c.req.json();
  const { category, address, lat, lng, description, reporterPhone, photos } = body;
  const now = await getDemoNow();

  const [maxRow] = await sqlClient`
    SELECT code FROM reports WHERE code ~ '^TB-[0-9]{4}$' ORDER BY code DESC LIMIT 1;
  `;
  let nextNum = 65;
  if (maxRow?.code) {
    const parsed = parseInt(maxRow.code.replace('TB-', ''), 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  const code = `TB-${nextNum.toString().padStart(4, '0')}`;

  const secretCode = '0000';
  const secretCodeHash = hashPepper(secretCode);
  const pointSql = `POINT(${lng ?? 106.8225} ${lat ?? 10.9505})`;

  const [created] = await sqlClient`
    INSERT INTO reports (
      code, category, status, priority, location, address, description,
      reporter_phone, anonymous, on_behalf, secret_code_hash, photos_approved, version, is_seed
    ) VALUES (
      ${code}, ${category || 'rac_thai'}, 'da_tiep_nhan', 'binh_thuong',
      ST_GeographyFromText(${pointSql}), ${address || 'Ủy ban Phường Trấn Biên'}, ${description || null},
      ${reporterPhone || null}, false, true, ${secretCodeHash}, true, 1, false
    )
    RETURNING id, code, status;
  `;

  if (!created) throw new AppError('INTERNAL_ERROR', 'Không thể tạo phản ánh', 500);

  await sqlClient`
    INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
    VALUES (${created.id}, ${now}::timestamptz, 'da_tiep_nhan', 'staff', ${staff.userId}::uuid, ${staff.displayName}, 'Cán bộ tạo phản ánh hộ người dân (B5)');
  `;

  if (Array.isArray(photos)) {
    for (let i = 0; i < photos.length; i++) {
      if (photos[i]) {
        await sqlClient`
          INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
          VALUES (${created.id}, 'before', ${photos[i]}, ${i + 1}, 'staff');
        `;
      }
    }
  }

  return c.json({ success: true, report: created }, 201);
});

/**
 * 19. GET /officer/volunteers - Danh sách tình nguyện viên đang hoạt động
 */
officerRoutes.get('/volunteers', async (c) => {
  const volunteers = await sqlClient`
    SELECT 
      sp.user_id as id,
      sp.display_name as name,
      sp.is_active,
      (SELECT count(*)::int FROM volunteer_tasks vt WHERE vt.assignee_id = sp.user_id AND vt.status = 'dang_lam') as active_tasks_count
    FROM staff_profiles sp
    WHERE sp.role = 'tnv' AND sp.is_active = true
    ORDER BY sp.display_name ASC;
  `;

  return c.json({
    items: volunteers.map((v) => ({
      id: v.id,
      name: v.name,
      activeTasksCount: v.active_tasks_count,
    })),
  });
});
