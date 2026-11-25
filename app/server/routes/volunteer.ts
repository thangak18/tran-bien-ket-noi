import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, StaffProfile } from '../middleware/auth';
import { getDemoNow } from '../clock';
import { executeTransition } from '../services/transition';
import type { AppEnv } from '../types';

export const volunteerRoutes = new Hono<AppEnv>();

// Đọc nhiệm vụ: TNV và cán bộ. Ghi (nhận việc, nộp kết quả): chỉ TNV (xem từng route).
volunteerRoutes.use('*', requireStaffAuth(['tnv', 'can_bo']));
const tnvOnly = requireStaffAuth(['tnv']);

/**
 * Dữ liệu trả về cho TNV KHÔNG chứa số điện thoại hay mã bí mật của người dân:
 * các truy vấn bên dưới không chọn các cột đó.
 */
interface TaskRow {
  id: string;
  code: string;
  report_id: string;
  report_code: string;
  type: string;
  status: string;
  assignee_id: string | null;
  assignee_name: string | null;
  report_category: string;
  report_address: string;
  report_lat: number | string;
  report_lng: number | string;
  distance_meters?: number | string | null;
  result_exists: string | null;
  result_severity: string | null;
  result_note: string | null;
  result_at: string | null;
  result_photo?: string | null;
}

function mapTask(t: TaskRow, resultPhoto?: string | null) {
  return {
    id: t.code,
    uuid: t.id,
    reportId: t.report_code,
    reportUuid: t.report_id,
    type: t.type,
    status: t.status,
    assigneeId: t.assignee_id,
    assignee: t.assignee_name ?? null,
    assigneeName: t.assignee_name,
    category: t.report_category,
    address: t.report_address,
    lat: Number(t.report_lat),
    lng: Number(t.report_lng),
    distanceMeters: t.distance_meters ? Math.round(Number(t.distance_meters)) : undefined,
    result:
      t.result_exists != null
        ? {
            exists: t.result_exists,
            severity: t.result_severity ?? undefined,
            photo: resultPhoto ?? t.result_photo ?? '',
            note: t.result_note ?? undefined,
            at: t.result_at,
          }
        : undefined,
  };
}

/**
 * 1. GET /volunteer/tasks - Danh sách nhiệm vụ (tìm kiếm theo GPS hoặc trạng thái)
 */
volunteerRoutes.get('/tasks', async (c) => {
  const query = c.req.query();
  const status = query.status;
  const lat = query.lat ? parseFloat(query.lat) : undefined;
  const lng = query.lng ? parseFloat(query.lng) : undefined;
  const radius = query.radius ? parseFloat(query.radius) : 5000;
  const staff = c.get('staff') as StaffProfile;

  let rows: TaskRow[];
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    const pointWkt = `POINT(${lng} ${lat})`;
    rows = (await sqlClient`
      SELECT
        t.*,
        r.code as report_code,
        r.category as report_category,
        r.address as report_address,
        ST_X(r.location::geometry) as report_lng,
        ST_Y(r.location::geometry) as report_lat,
        ST_Distance(r.location, ST_GeographyFromText(${pointWkt})) as distance_meters,
        sp.display_name as assignee_name,
        (SELECT p.storage_path FROM report_photos p WHERE p.report_id = t.report_id AND p.kind = 'verify' ORDER BY p.created_at DESC LIMIT 1) as result_photo
      FROM volunteer_tasks t
      JOIN reports r ON r.id = t.report_id
      LEFT JOIN staff_profiles sp ON sp.user_id = t.assignee_id
      WHERE ST_DWithin(r.location, ST_GeographyFromText(${pointWkt}), ${radius})
        AND (${status ? sqlClient`t.status = ${status}` : sqlClient`true`})
      ORDER BY
        CASE WHEN t.status = 'dang_lam' AND t.assignee_id = ${staff.userId}::uuid THEN 0
             WHEN t.status = 'cho_nhan' THEN 1
             ELSE 2 END,
        distance_meters ASC;
    `) as unknown as TaskRow[];
  } else {
    rows = (await sqlClient`
      SELECT
        t.*,
        r.code as report_code,
        r.category as report_category,
        r.address as report_address,
        ST_X(r.location::geometry) as report_lng,
        ST_Y(r.location::geometry) as report_lat,
        sp.display_name as assignee_name,
        (SELECT p.storage_path FROM report_photos p WHERE p.report_id = t.report_id AND p.kind = 'verify' ORDER BY p.created_at DESC LIMIT 1) as result_photo
      FROM volunteer_tasks t
      JOIN reports r ON r.id = t.report_id
      LEFT JOIN staff_profiles sp ON sp.user_id = t.assignee_id
      WHERE (${status ? sqlClient`t.status = ${status}` : sqlClient`true`})
      ORDER BY
        CASE WHEN t.status = 'dang_lam' AND t.assignee_id = ${staff.userId}::uuid THEN 0
             WHEN t.status = 'cho_nhan' THEN 1
             ELSE 2 END,
        t.code DESC;
    `) as unknown as TaskRow[];
  }

  return c.json({ items: rows.map((t) => mapTask(t)) });
});

/**
 * 2. GET /volunteer/tasks/:id - Chi tiết một nhiệm vụ
 */
volunteerRoutes.get('/tasks/:id', async (c) => {
  const codeOrId = c.req.param('id');

  const [t] = await sqlClient`
    SELECT
      t.*,
      r.code as report_code,
      r.category as report_category,
      r.address as report_address,
      r.description as report_description,
      ST_X(r.location::geometry) as report_lng,
      ST_Y(r.location::geometry) as report_lat,
      sp.display_name as assignee_name
    FROM volunteer_tasks t
    JOIN reports r ON r.id = t.report_id
    LEFT JOIN staff_profiles sp ON sp.user_id = t.assignee_id
    WHERE t.code = ${codeOrId} OR t.id::text = ${codeOrId}
    LIMIT 1;
  `;

  if (!t) throw new AppError('NOT_FOUND', 'Không tìm thấy nhiệm vụ', 404);

  const photos = await sqlClient`
    SELECT storage_path FROM report_photos WHERE report_id = ${t.report_id} AND kind = 'before' ORDER BY sort;
  `;
  const [verifyPhoto] = await sqlClient`
    SELECT storage_path FROM report_photos WHERE report_id = ${t.report_id} AND kind = 'verify' ORDER BY created_at DESC LIMIT 1;
  `;

  return c.json({
    ...mapTask(t as unknown as TaskRow, verifyPhoto?.storage_path as string | undefined),
    description: t.report_description,
    photos: photos.map((p) => p.storage_path),
  });
});

/**
 * 3. POST /volunteer/tasks/:id/claim - Nhận việc (giao dịch khóa dòng FOR UPDATE - CONC-002)
 */
volunteerRoutes.post('/tasks/:id/claim', tnvOnly, async (c) => {
  const codeOrId = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;

  const result = await sqlClient.begin(async (tx) => {
    const [task] = await tx`
      SELECT id, code, status, assignee_id
      FROM volunteer_tasks
      WHERE code = ${codeOrId} OR id::text = ${codeOrId}
      FOR UPDATE;
    `;

    if (!task) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy nhiệm vụ', 404);
    }

    if (task.status !== 'cho_nhan') {
      throw new AppError(
        'TASK_ALREADY_CLAIMED',
        'Nhiệm vụ này đã được tình nguyện viên khác nhận trước đó',
        409
      );
    }

    // Nhiệm vụ đã giao đích danh cho TNV khác thì không được nhận.
    if (task.assignee_id && task.assignee_id !== staff.userId) {
      throw new AppError('FORBIDDEN', 'Nhiệm vụ này đã được giao cho tình nguyện viên khác', 403);
    }

    await tx`
      UPDATE volunteer_tasks
      SET status = 'dang_lam', assignee_id = ${staff.userId}::uuid
      WHERE id = ${task.id};
    `;

    return { id: task.code, status: 'dang_lam' };
  });

  return c.json({ success: true, task: result });
});

const EXISTS_VALUES = ['co', 'khong', 'khong_tim_thay'] as const;

const resultSchema = z.object({
  exists: z.union([z.enum(EXISTS_VALUES), z.boolean()]).transform((v) => {
    if (v === true) return 'co' as const;
    if (v === false) return 'khong' as const;
    return v;
  }),
  severity: z.enum(['nhe', 'trung_binh', 'nguy_hiem']).optional(),
  note: z.string().trim().max(1000).optional(),
  photoPath: z.string().trim().min(1).max(500).optional(),
});

/**
 * 4. POST /volunteer/tasks/:id/result & /submit - Nộp kết quả xác minh / nghiệm thu (Spec 3.3, AC-V02)
 *
 * - TNV chỉ nộp được nhiệm vụ của mình (hoặc nhiệm vụ còn mở, tự động nhận).
 * - xac_minh + "Có": hệ thống chuyển cho_xac_minh -> da_tiep_nhan qua services/transition.ts.
 * - xac_minh + "Không"/"Không tìm thấy": chỉ ghi kết quả, cán bộ xác nhận khong_xac_nhan.
 * - nghiem_thu: chỉ ghi kết quả, cán bộ đóng hồ sơ (mo_lai -> dong) theo Spec 3.3.
 */
const handleTaskResult = async (c: Context<AppEnv>) => {
  const codeOrId = c.req.param('id');
  const raw = await c.req.json().catch(() => null);
  const parsed = resultSchema.safeParse({
    ...(raw ?? {}),
    photoPath: raw?.photoPath ?? raw?.photo,
  });
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Kết quả xác minh không hợp lệ',
      400,
      parsed.error.issues
    );
  }
  const { exists, severity, note } = parsed.data;
  const photoPath = parsed.data.photoPath;
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const output = await sqlClient.begin(async (tx) => {
    const [task] = await tx`
      SELECT t.id, t.code, t.type, t.status, t.assignee_id, t.report_id
      FROM volunteer_tasks t
      WHERE t.code = ${codeOrId} OR t.id::text = ${codeOrId}
      FOR UPDATE;
    `;
    if (!task) throw new AppError('NOT_FOUND', 'Không tìm thấy nhiệm vụ', 404);

    if (task.status === 'xong') {
      throw new AppError('TASK_ALREADY_DONE', 'Nhiệm vụ này đã được nộp kết quả trước đó', 409);
    }
    if (task.assignee_id && task.assignee_id !== staff.userId) {
      throw new AppError('FORBIDDEN', 'Nhiệm vụ này thuộc về tình nguyện viên khác', 403);
    }
    if (!photoPath) {
      throw new AppError('VALIDATION_ERROR', 'Cần có ảnh chụp tại hiện trường', 400);
    }
    if (exists === 'co' && task.type === 'xac_minh' && !severity) {
      throw new AppError('VALIDATION_ERROR', 'Cần chọn mức độ khi xác nhận có sự cố', 400);
    }

    await tx`
      UPDATE volunteer_tasks
      SET status = 'xong',
          assignee_id = ${staff.userId}::uuid,
          result_exists = ${exists},
          result_severity = ${exists === 'co' ? (severity ?? null) : null},
          result_note = ${note ?? null},
          result_at = ${now}::timestamptz
      WHERE id = ${task.id};
    `;

    await tx`
      INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
      VALUES (${task.report_id}, 'verify', ${photoPath}, 0, 'storage');
    `;

    let reportStatus: string | undefined;
    if (task.type === 'xac_minh' && exists === 'co') {
      const [report] = await tx`SELECT status FROM reports WHERE id = ${task.report_id};`;
      if (report?.status === 'cho_xac_minh') {
        const severityLabel =
          severity === 'nguy_hiem' ? 'nguy hiểm' : severity === 'trung_binh' ? 'trung bình' : 'nhẹ';
        const result = await executeTransition(
          {
            reportId: task.report_id as string,
            targetStatus: 'da_tiep_nhan',
            actor: {
              role: 'system',
              actorType: 'staff',
              actorLabel: 'Tình nguyện viên',
              staffId: staff.userId,
            },
            params: {
              note: `TNV xác minh: có sự cố (mức độ ${severityLabel})${note ? `. ${note}` : ''}`,
            },
          },
          tx
        );
        reportStatus = String(result.report.status);
      }
    }

    return { taskCode: task.code as string, reportStatus };
  });

  return c.json({
    success: true,
    message: 'Đã nộp kết quả thành công',
    task: { id: output.taskCode, status: 'xong' },
    reportStatus: output.reportStatus,
  });
};

volunteerRoutes.post('/tasks/:id/result', tnvOnly, handleTaskResult);
volunteerRoutes.post('/tasks/:id/submit', tnvOnly, handleTaskResult);
