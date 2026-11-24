import { Hono } from 'hono';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { requireStaffAuth, StaffProfile } from '../middleware/auth';
import { maskPhone } from '../../src/domain/privacy';
import { getDemoNow } from '../clock';
import type { AppEnv } from '../types';

export const volunteerRoutes = new Hono<AppEnv>();

// Tất cả route tình nguyện viên yêu cầu vai trò tnv hoặc can_bo
volunteerRoutes.use('*', requireStaffAuth(['tnv', 'can_bo']));

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

  let tasksQuery;
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    const pointWkt = `POINT(${lng} ${lat})`;
    tasksQuery = await sqlClient`
      SELECT 
        t.*,
        r.code as report_code,
        r.category as report_category,
        r.address as report_address,
        r.reporter_phone as report_phone,
        ST_X(r.location) as report_lng,
        ST_Y(r.location) as report_lat,
        ST_Distance(r.location, ST_GeographyFromText(${pointWkt})) as distance_meters,
        sp.display_name as assignee_name
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
    `;
  } else {
    tasksQuery = await sqlClient`
      SELECT 
        t.*,
        r.code as report_code,
        r.category as report_category,
        r.address as report_address,
        r.reporter_phone as report_phone,
        ST_X(r.location) as report_lng,
        ST_Y(r.location) as report_lat,
        sp.display_name as assignee_name
      FROM volunteer_tasks t
      JOIN reports r ON r.id = t.report_id
      LEFT JOIN staff_profiles sp ON sp.user_id = t.assignee_id
      WHERE (${status ? sqlClient`t.status = ${status}` : sqlClient`true`})
      ORDER BY 
        CASE WHEN t.status = 'dang_lam' AND t.assignee_id = ${staff.userId}::uuid THEN 0
             WHEN t.status = 'cho_nhan' THEN 1
             ELSE 2 END,
        t.code DESC;
    `;
  }

  const items = tasksQuery.map((t) => ({
    id: t.code,
    uuid: t.id,
    reportId: t.report_code,
    reportUuid: t.report_id,
    type: t.type,
    status: t.status,
    assigneeId: t.assignee_id,
    assigneeName: t.assignee_name,
    category: t.report_category,
    address: t.report_address,
    lat: Number(t.report_lat),
    lng: Number(t.report_lng),
    reporterPhone: maskPhone(t.report_phone), // TNV chỉ thấy SĐT che (Spec 4.1, AC-V02)
    distanceMeters: t.distance_meters ? Math.round(Number(t.distance_meters)) : undefined,
    result:
      t.result_exists != null
        ? {
            exists: t.result_exists === 'true',
            severity: t.result_severity,
            note: t.result_note,
            at: t.result_at,
          }
        : undefined,
  }));

  return c.json({ items });
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
      r.reporter_phone as report_phone,
      r.description as report_description,
      ST_X(r.location) as report_lng,
      ST_Y(r.location) as report_lat,
      sp.display_name as assignee_name
    FROM volunteer_tasks t
    JOIN reports r ON r.id = t.report_id
    LEFT JOIN staff_profiles sp ON sp.user_id = t.assignee_id
    WHERE t.code = ${codeOrId} OR t.id::text = ${codeOrId}
    LIMIT 1;
  `;

  if (!t) throw new AppError('NOT_FOUND', 'Không tìm thấy nhiệm vụ', 404);

  // Lấy ảnh đính kèm của phản ánh
  const photos = await sqlClient`
    SELECT storage_path FROM report_photos WHERE report_id = ${t.report_id} AND kind = 'before';
  `;

  return c.json({
    id: t.code,
    uuid: t.id,
    reportId: t.report_code,
    type: t.type,
    status: t.status,
    category: t.report_category,
    address: t.report_address,
    description: t.report_description,
    photos: photos.map((p) => p.storage_path),
    lat: Number(t.report_lat),
    lng: Number(t.report_lng),
    reporterPhone: maskPhone(t.report_phone),
    assigneeName: t.assignee_name,
  });
});

/**
 * 3. POST /volunteer/tasks/:id/claim - Nhận việc (giao dịch khóa dòng FOR UPDATE - CONC-002)
 */
volunteerRoutes.post('/tasks/:id/claim', async (c) => {
  const codeOrId = c.req.param('id');
  const staff = c.get('staff') as StaffProfile;

  // Sử dụng giao dịch sqlClient.begin với FOR UPDATE
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

    await tx`
      UPDATE volunteer_tasks
      SET status = 'dang_lam', assignee_id = ${staff.userId}::uuid
      WHERE id = ${task.id};
    `;

    return { id: task.code, status: 'dang_lam' };
  });

  return c.json({ success: true, task: result });
});

/**
 * 4. POST /volunteer/tasks/:id/submit - Nộp kết quả xác minh / nghiệm thu (Kích hoạt chuyển trạng thái Spec 3.3)
 */
volunteerRoutes.post('/tasks/:id/submit', async (c) => {
  const codeOrId = c.req.param('id');
  const body = await c.req.json();
  const exists = Boolean(body.exists);
  const severity = body.severity || 'binh_thuong';
  const note = body.note?.trim() || null;
  const staff = c.get('staff') as StaffProfile;
  const now = await getDemoNow();

  const [task] = await sqlClient`
    SELECT t.*, r.id as report_id, r.code as report_code
    FROM volunteer_tasks t
    JOIN reports r ON r.id = t.report_id
    WHERE t.code = ${codeOrId} OR t.id::text = ${codeOrId}
    LIMIT 1;
  `;

  if (!task) throw new AppError('NOT_FOUND', 'Không tìm thấy nhiệm vụ', 404);

  // Cập nhật kết quả task
  await sqlClient`
    UPDATE volunteer_tasks
    SET 
      status = 'xong',
      result_exists = ${String(exists)},
      result_severity = ${severity},
      result_note = ${note},
      result_at = ${now}::timestamptz
    WHERE id = ${task.id};
  `;

  // Kích hoạt chuyển trạng thái hồ sơ tương ứng (Spec 3.3, 3.4c)
  if (task.type === 'xac_minh') {
    if (exists) {
      // Có sự cố thật -> chuyển da_tiep_nhan
      await sqlClient`UPDATE reports SET status = 'da_tiep_nhan' WHERE id = ${task.report_id};`;
      await sqlClient`
        INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
        VALUES (
          ${task.report_id}, ${now}::timestamptz, 'da_tiep_nhan', 'staff', ${staff.userId}::uuid,
          ${staff.displayName}, ${`TNV đã xác minh: Có sự cố thực tế. ${note || ''}`}
        );
      `;
    } else {
      // Không có sự cố -> chuyển khong_xac_nhan
      await sqlClient`UPDATE reports SET status = 'khong_xac_nhan' WHERE id = ${task.report_id};`;
      await sqlClient`
        INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
        VALUES (
          ${task.report_id}, ${now}::timestamptz, 'khong_xac_nhan', 'staff', ${staff.userId}::uuid,
          ${staff.displayName}, ${`TNV xác minh: Hiện trường không có sự cố. ${note || ''}`}
        );
      `;
    }
  } else if (task.type === 'nghiem_thu') {
    if (!exists) {
      // Sự cố đã được khắc phục xong (không còn tồn tại) -> đóng
      await sqlClient`UPDATE reports SET status = 'dong' WHERE id = ${task.report_id};`;
      await sqlClient`
        INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
        VALUES (
          ${task.report_id}, ${now}::timestamptz, 'dong', 'staff', ${staff.userId}::uuid,
          ${staff.displayName}, ${`TNV nghiệm thu: Sự cố đã khắc phục tốt. ${note || ''}`}
        );
      `;
    } else {
      // Sự cố vẫn còn tồn tại -> mở lại
      await sqlClient`UPDATE reports SET status = 'mo_lai' WHERE id = ${task.report_id};`;
      await sqlClient`
        INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
        VALUES (
          ${task.report_id}, ${now}::timestamptz, 'mo_lai', 'staff', ${staff.userId}::uuid,
          ${staff.displayName}, ${`TNV nghiệm thu: Sự cố vẫn còn tồn tại, đề nghị tiếp tục xử lý. ${note || ''}`}
        );
      `;
    }
  }

  return c.json({ success: true, message: 'Đã nộp kết quả thành công' });
});
