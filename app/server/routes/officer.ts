import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, StaffProfile, hashPepper } from '../middleware/auth';
import { getDemoNow } from '../clock';
import { executeTransition } from '../services/transition';
import { generateSecretCode, nextReportCode, nextTaskCode } from '../services/identifiers';
import type { AppEnv } from '../types';

export const officerRoutes = new Hono<AppEnv>();

// Tất cả route cán bộ yêu cầu vai trò can_bo
officerRoutes.use('*', requireStaffAuth(['can_bo']));

const CATEGORIES = ['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cbActor(staff: StaffProfile, fallbackLabel: string) {
  return {
    role: 'CB' as const,
    actorType: 'staff' as const,
    actorLabel: staff.displayName || fallbackLabel,
    staffId: staff.userId,
  };
}

const acceptSchema = z.object({
  version: z.number().int().optional(),
  category: z.enum(CATEGORIES).optional(),
  departmentId: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  note: z.string().trim().max(500).optional(),
});

const assignVolunteerSchema = z.object({
  type: z.enum(['xac_minh', 'nghiem_thu']).optional(),
  taskType: z.enum(['xac_minh', 'nghiem_thu']).optional(),
  assigneeId: z.string().regex(UUID_RE).optional(),
  assignee: z.string().trim().min(1).max(100).optional(),
  note: z.string().trim().max(500).optional(),
  version: z.number().int().optional(),
});

const patchReportSchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(['cao', 'binh_thuong']).optional(),
  departmentId: z.string().trim().min(1).nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  version: z.number().int().optional(),
});

const onBehalfSchema = z.object({
  category: z.enum(CATEGORIES),
  address: z.string().trim().min(3).max(300),
  lat: z.coerce.number().min(10.9).max(11.0),
  lng: z.coerce.number().min(106.7).max(106.9),
  description: z.string().trim().max(1000).optional(),
  locationNote: z.string().trim().max(300).optional(),
  reporterPhone: z
    .string()
    .regex(/^0[0-9]{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0'),
  photos: z.array(z.string().trim().min(1).max(2_000_000)).max(5).optional(),
});

interface PhotoRow {
  report_id: string;
  kind: string;
  storage_path: string;
  sort: number;
}

function photosByKind(photos: PhotoRow[], reportId: string, kind: string): string[] {
  return photos
    .filter((p) => p.report_id === reportId && p.kind === kind)
    .sort((a, b) => a.sort - b.sort)
    .map((p) => p.storage_path);
}

/** Tìm id bộ phận từ id (doi_ve_sinh) hoặc tên đầy đủ do giao diện gửi lên. */
async function resolveDepartmentId(
  tx: typeof sqlClient,
  input: { departmentId?: string; department?: string }
): Promise<string | undefined> {
  const value = input.departmentId ?? input.department;
  if (!value) return undefined;
  const [dept] = await tx`
    SELECT id FROM departments WHERE id = ${value} OR name = ${value} LIMIT 1;
  `;
  if (!dept) {
    throw new AppError('VALIDATION_ERROR', `Không tìm thấy bộ phận "${value}"`, 400);
  }
  return dept.id as string;
}

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
  const limit = Math.min(query.limit ? parseInt(query.limit, 10) : 100, 200);
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

  const reportIds = reports.map((r) => r.id as string);
  const photoRows =
    reportIds.length > 0
      ? ((await sqlClient`
          SELECT report_id, kind, storage_path, sort FROM report_photos
          WHERE report_id IN ${sqlClient(reportIds)};
        `) as unknown as PhotoRow[])
      : [];

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
    department: r.department_name || undefined,
    dueAt: r.due_at,
    isOverdue:
      r.status !== 'hoan_thanh' &&
      r.status !== 'dong' &&
      r.due_at &&
      new Date(r.due_at).getTime() < new Date(now).getTime(),
    createdAt: r.created_at,
    completedAt: r.completed_at,
    // Spec v3.0 D7 (FR-08): cán bộ thấy SĐT đầy đủ để liên hệ; hồ sơ ẩn danh cũ không có số.
    reporterPhone: r.reporter_phone ?? null,
    anonymous: r.anonymous,
    subscribedLater: r.subscribed_later,
    onBehalf: r.on_behalf,
    followerCount: (r.follower_count ? Number(r.follower_count) : 0) + (r.anonymous_follows || 0),
    photosApproved: r.photos_approved,
    photos: photosByKind(photoRows, r.id as string, 'before'),
    resultPhotos: photosByKind(photoRows, r.id as string, 'after'),
    resultNote: r.result_note || undefined,
    version: r.version,
    aiSuggestion: (r.ai_suggestion as Record<string, unknown> | null) || undefined,
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
  const body = acceptSchema.parse(await c.req.json().catch(() => ({})));
  const now = await getDemoNow();

  // Tiếp nhận = xác nhận loại + bộ phận + hạn (Spec 3.3): mặc định lấy từ category_settings.
  const result = await sqlClient.begin(async (tx) => {
    const [report] = await tx`
      SELECT id, category FROM reports
      WHERE id::text = ${codeOrId} OR code = ${codeOrId}
      FOR UPDATE;
    `;
    if (!report) {
      throw new AppError('NOT_FOUND', `Không tìm thấy hồ sơ phản ánh: ${codeOrId}`, 404);
    }
    const category = body.category ?? report.category;
    const [cfg] = await tx`
      SELECT default_department_id, sla_days FROM category_settings WHERE category = ${category}::category;
    `;
    if (category !== report.category) {
      await tx`UPDATE reports SET category = ${category}::category WHERE id = ${report.id};`;
    }
    const departmentId =
      (await resolveDepartmentId(tx as unknown as typeof sqlClient, body)) ??
      cfg?.default_department_id ??
      null;
    const dueAt =
      body.dueAt ??
      new Date(new Date(now).getTime() + (cfg?.sla_days ?? 3) * 24 * 60 * 60 * 1000).toISOString();

    return executeTransition(
      {
        reportId: report.id as string,
        targetStatus: 'da_tiep_nhan',
        actor: cbActor(staff, 'Cán bộ phường Trấn Biên'),
        params: { departmentId, dueAt, note: body.note || 'Đã tiếp nhận phản ánh' },
        clientVersion: body.version,
      },
      tx
    );
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
  const body = assignVolunteerSchema.parse(await c.req.json().catch(() => ({})));
  const taskType = body.type ?? body.taskType ?? 'xac_minh';
  const staff = c.get('staff') as StaffProfile;

  // Chuyển trạng thái, tạo nhiệm vụ và gán TNV trong cùng một giao dịch.
  const output = await sqlClient.begin(async (tx) => {
    let assigneeId: string | null = null;
    if (body.assigneeId || body.assignee) {
      const [tnv] = await tx`
        SELECT user_id, display_name FROM staff_profiles
        WHERE role = 'tnv' AND is_active = true
          AND (${body.assigneeId ? tx`user_id = ${body.assigneeId}::uuid` : tx`false`}
               OR ${body.assignee ? tx`display_name = ${body.assignee}` : tx`false`})
        LIMIT 1;
      `;
      if (!tnv) {
        throw new AppError('VALIDATION_ERROR', 'Không tìm thấy tình nguyện viên được chọn', 400);
      }
      assigneeId = tnv.user_id as string;
    }

    const [report] = await tx`
      SELECT id, status FROM reports WHERE id::text = ${codeOrId} OR code = ${codeOrId} FOR UPDATE;
    `;
    if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);

    let version: number | undefined = body.version;
    if (taskType === 'xac_minh') {
      const transitioned = await executeTransition(
        {
          reportId: report.id as string,
          targetStatus: 'cho_xac_minh',
          actor: cbActor(staff, 'Cán bộ tiếp nhận'),
          params: { note: body.note || 'Chuyển tình nguyện viên xác minh hiện trường' },
          clientVersion: body.version,
        },
        tx
      );
      version = transitioned.version;
    } else if (report.status !== 'mo_lai') {
      throw new AppError(
        'TRANSITION_NOT_ALLOWED',
        'Chỉ giao nghiệm thu cho hồ sơ đang ở trạng thái mở lại',
        409
      );
    }

    const taskCode = await nextTaskCode(tx);
    const [task] = await tx`
      INSERT INTO volunteer_tasks (code, report_id, type, status, assignee_id)
      VALUES (${taskCode}, ${report.id}, ${taskType}, ${assigneeId ? 'dang_lam' : 'cho_nhan'}, ${assigneeId})
      RETURNING id, code, status;
    `;
    if (!task) {
      throw new AppError('INTERNAL_SERVER_ERROR', 'Không thể tạo nhiệm vụ tình nguyện viên', 500);
    }
    return { task, version };
  });

  return c.json({
    success: true,
    task: {
      id: output.task.code,
      uuid: output.task.id,
      type: taskType,
      status: output.task.status,
    },
    version: output.version,
  });
});

/**
 * 5. POST /officer/reports/:id/assign-dept - Giao đơn vị xử lý (da_giao)
 */
officerRoutes.post('/reports/:id/assign-dept', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const departmentId = await resolveDepartmentId(sqlClient, body);
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
  const body = await c.req.json().catch(() => ({}));
  // Không có giá trị mặc định giả: thiếu ảnh hoặc mô tả thì dịch vụ chuyển trạng thái trả 400 (Spec 3.3).
  const resultNote = typeof body.resultNote === 'string' ? body.resultNote.trim() : '';
  const rawPhotos = Array.isArray(body.resultPhotos)
    ? body.resultPhotos
    : Array.isArray(body.photos)
      ? body.photos
      : [];
  const resultPhotos = rawPhotos.filter(
    (p: unknown): p is string => typeof p === 'string' && p.trim() !== ''
  );
  const staff = c.get('staff') as StaffProfile;

  const result = await executeTransition({
    reportId: codeOrId,
    targetStatus: 'hoan_thanh',
    actor: cbActor(staff, 'Cán bộ xử lý'),
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

  const [parent] = report.merged_into
    ? await sqlClient`SELECT code FROM reports WHERE id = ${report.merged_into};`
    : [];
  const children = await sqlClient`
    SELECT code FROM reports WHERE merged_into = ${report.id} ORDER BY code;
  `;

  return c.json({
    id: report.code,
    uuid: report.id,
    code: report.code,
    category: report.category,
    status: report.status,
    statusBeforeMerge: report.status_before_merge || undefined,
    priority: report.priority,
    lat: Number(report.lat),
    lng: Number(report.lng),
    address: report.address,
    locationNote: report.location_note || undefined,
    description: report.description || undefined,
    departmentId: report.department_id,
    departmentName: report.department_name,
    department: report.department_name || undefined,
    dueAt: report.due_at,
    createdAt: report.created_at,
    completedAt: report.completed_at,
    reporterPhone: report.reporter_phone ?? null,
    anonymous: report.anonymous,
    subscribedLater: report.subscribed_later,
    onBehalf: report.on_behalf,
    followerCount:
      (report.follower_count ? Number(report.follower_count) : 0) + (report.anonymous_follows || 0),
    photosApproved: report.photos_approved,
    resultNote: report.result_note || undefined,
    version: report.version,
    mergedInto: parent?.code || undefined,
    mergedChildren: children.map((ch) => ch.code),
    photos: photosByKind(photos as unknown as PhotoRow[], report.id as string, 'before'),
    resultPhotos: photosByKind(photos as unknown as PhotoRow[], report.id as string, 'after'),
    timeline: timeline.map((t) => ({
      at: t.at,
      status: t.status,
      actor: t.staff_name || t.actor_label,
      note: t.note || undefined,
    })),
    feedback:
      report.feedback_resolved != null
        ? {
            resolved: Boolean(report.feedback_resolved),
            rating: report.feedback_rating != null ? Number(report.feedback_rating) : undefined,
            tags: report.feedback_tags || [],
            comment: report.feedback_comment || undefined,
            at: report.feedback_at,
          }
        : undefined,
    aiSuggestion: (report.ai_suggestion as Record<string, unknown> | null) || undefined,
  });
});

/**
 * 10. PATCH /officer/reports/:code - Sửa trường phân loại / phòng ban
 */
officerRoutes.patch('/reports/:code', async (c) => {
  const code = c.req.param('code');
  const body = patchReportSchema.parse(await c.req.json().catch(() => ({})));

  const newVersion = await sqlClient.begin(async (tx) => {
    const [report] = await tx`
      SELECT * FROM reports WHERE code = ${code} OR id::text = ${code} FOR UPDATE;
    `;
    if (!report) throw new AppError('NOT_FOUND', `Không tìm thấy phản ánh ${code}`, 404);

    if (body.version !== undefined && body.version !== report.version) {
      throw new AppError('VERSION_CONFLICT', 'Hồ sơ đã được cập nhật bởi thao tác khác', 409);
    }

    const next = (report.version || 1) + 1;
    await tx`
      UPDATE reports
      SET
        category = ${body.category ?? report.category}::category,
        priority = ${body.priority ?? report.priority}::priority,
        department_id = ${body.departmentId !== undefined ? body.departmentId : report.department_id},
        due_at = ${body.dueAt ? new Date(body.dueAt).toISOString() : report.due_at}::timestamptz,
        version = ${next}
      WHERE id = ${report.id};
    `;
    return next;
  });

  return c.json({ success: true, version: newVersion });
});

/**
 * 11. POST /officer/reports/:id/assign-department - Alias cho assign-dept
 */
officerRoutes.post('/reports/:id/assign-department', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const departmentId = await resolveDepartmentId(sqlClient, body);
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
  const targetAgency = typeof body.targetAgency === 'string' ? body.targetAgency.trim() : '';

  if (!targetAgency) {
    throw new AppError('BAD_REQUEST', 'Cần nhập tên cơ quan tiếp nhận chuyển', 400);
  }
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
    // Cán bộ chỉ được đóng hồ sơ mo_lai (Spec 3.3); hoan_thanh -> dong là của người dân/hệ thống.
    actor: cbActor(staff, 'Cán bộ xử lý'),
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
  const body = await c.req.json().catch(() => ({}));

  // Đi qua dịch vụ chuyển trạng thái (khoá dòng, kiểm tra version, ghi timeline, thông báo).
  const result = await sqlClient.begin(async (tx) => {
    const [report] = await tx`
      SELECT id, status, status_before_merge FROM reports
      WHERE id::text = ${id} OR code = ${id}
      FOR UPDATE;
    `;
    if (!report) throw new AppError('NOT_FOUND', 'Không tìm thấy hồ sơ', 404);
    if (report.status !== 'da_gop' || !report.status_before_merge) {
      throw new AppError('BAD_REQUEST', 'Hồ sơ không ở trạng thái đã gộp', 400);
    }
    return executeTransition(
      {
        reportId: report.id as string,
        targetStatus: report.status_before_merge,
        actor: cbActor(staff, 'Cán bộ tiếp nhận'),
        params: { note: 'Tách khỏi hồ sơ đã gộp' },
        clientVersion: body.version,
      },
      tx
    );
  });

  return c.json({ success: true, newStatus: result.report.status, version: result.version });
});

/**
 * 17. POST /officer/reports & POST /officer/reports/on-behalf - Tạo phản ánh hộ người dân (B5)
 * Mã bí mật 4 số sinh ngẫu nhiên bằng crypto, chỉ lưu hash, trả về cho cán bộ đúng một lần.
 */
const handleCreateOnBehalf = async (c: Context<AppEnv>) => {
  const staff = c.get('staff') as StaffProfile;
  const body = onBehalfSchema.parse(await c.req.json().catch(() => ({})));
  const now = await getDemoNow();
  const secretCode = generateSecretCode();
  const secretCodeHash = hashPepper(secretCode);
  const pointWkt = `POINT(${body.lng} ${body.lat})`;

  const created = await sqlClient.begin(async (tx) => {
    const code = await nextReportCode(tx);
    const [cfg] = await tx`
      SELECT default_department_id, sla_days FROM category_settings WHERE category = ${body.category}::category;
    `;
    const dueAt = new Date(
      new Date(now).getTime() + (cfg?.sla_days ?? 3) * 24 * 60 * 60 * 1000
    ).toISOString();

    const [row] = await tx`
      INSERT INTO reports (
        code, category, status, priority, location, address, location_note, description,
        department_id, due_at, created_at, reporter_phone, anonymous, on_behalf,
        secret_code_hash, photos_approved, version, is_seed
      ) VALUES (
        ${code}, ${body.category}::category, 'da_tiep_nhan', 'binh_thuong',
        ST_GeographyFromText(${pointWkt}), ${body.address}, ${body.locationNote ?? null},
        ${body.description ?? null}, ${cfg?.default_department_id ?? null}, ${dueAt}::timestamptz,
        ${now}::timestamptz, ${body.reporterPhone}, false, true,
        ${secretCodeHash}, true, 1, false
      )
      RETURNING id, code, status;
    `;
    if (!row) throw new AppError('INTERNAL_SERVER_ERROR', 'Không thể tạo phản ánh', 500);

    await tx`
      INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
      VALUES (${row.id}, ${now}::timestamptz, 'da_tiep_nhan', 'staff', ${staff.userId}::uuid,
              ${staff.displayName}, 'Cán bộ tiếp nhận và tạo hồ sơ hộ người dân');
    `;
    await tx`
      INSERT INTO report_followers (report_id, phone, source)
      VALUES (${row.id}, ${body.reporterPhone}, 'reporter')
      ON CONFLICT DO NOTHING;
    `;
    const photos = body.photos ?? [];
    for (let i = 0; i < photos.length; i++) {
      await tx`
        INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
        VALUES (${row.id}, 'before', ${photos[i] as string}, ${i}, 'storage');
      `;
    }
    return row;
  });

  return c.json(
    {
      success: true,
      report: { id: created.code, uuid: created.id, code: created.code, status: created.status },
      secretCode,
    },
    201
  );
};

officerRoutes.post('/reports', handleCreateOnBehalf);
officerRoutes.post('/reports/on-behalf', handleCreateOnBehalf);

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
