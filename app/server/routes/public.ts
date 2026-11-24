import { Hono } from 'hono';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { getDemoNow } from '../clock';
import type { AppEnv } from '../types';

export const publicRoutes = new Hono<AppEnv>();

interface DbReportRow {
  id?: string;
  code?: string;
  category?: string;
  status?: string;
  lat?: number;
  lng?: number;
  address?: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  due_at?: string | null;
  completed_at?: string | null;
  distance_meters?: number | null;
  follower_count?: number | string | null;
  anonymous_follows?: number | null;
  priority?: string | null;
  location_note?: string | null;
  department_name?: string | null;
  photos_approved?: boolean | null;
  result_note?: string | null;
  feedback_resolved?: boolean | null;
  feedback_rating?: number | null;
  feedback_tags?: string[] | null;
  feedback_comment?: string | null;
  feedback_at?: string | null;
  [key: string]: unknown;
}

interface DbPhotoRow {
  report_id?: string;
  kind?: string;
  storage_path?: string;
  sort?: number;
  [key: string]: unknown;
}

interface DbTimelineRow {
  report_id?: string;
  at?: string;
  status?: string;
  actor_type?: string | null;
  actor_label?: string | null;
  note?: string | null;
  [key: string]: unknown;
}

// Helper to format DB report into public response
function formatPublicReportRow(
  r: DbReportRow,
  photos: DbPhotoRow[] = [],
  timeline: DbTimelineRow[] = []
) {
  const beforePhotos = photos
    .filter((p) => p.report_id === r.id && p.kind === 'before')
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map((p) => String(p.storage_path));

  const afterPhotos = photos
    .filter((p) => p.report_id === r.id && p.kind === 'after')
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map((p) => String(p.storage_path));

  const sanitizedTimeline = timeline
    .filter((t) => t.report_id === r.id)
    .sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime())
    .map((t) => {
      let publicActor = 'Phường Trấn Biên';
      if (t.actor_type === 'citizen') publicActor = 'Người dân';
      else if (t.actor_label?.includes('Tình nguyện') || t.actor_label?.includes('TNV'))
        publicActor = 'Tình nguyện viên';

      return {
        at: t.at,
        status: t.status,
        actor: publicActor,
        note: t.note || undefined,
      };
    });

  // Location coordinates (extract from geography type if string or object)
  let lat = 10.9505;
  let lng = 106.8225;
  if (r.lat != null && r.lng != null) {
    lat = Number(r.lat);
    lng = Number(r.lng);
  }

  const followerCount =
    (r.follower_count ? Number(r.follower_count) : 0) + (r.anonymous_follows || 0);

  return {
    id: r.code, // Public ID is TB-xxxx
    uuid: r.id,
    category: r.category,
    status: r.status,
    priority: r.priority,
    lat,
    lng,
    address: r.address,
    locationNote: r.location_note || undefined,
    description: r.description || undefined,
    department: r.department_name || undefined,
    dueAt: r.due_at || undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at || undefined,
    photos: r.photos_approved ? beforePhotos : [],
    resultPhotos: afterPhotos,
    resultNote: r.result_note || undefined,
    followerCount,
    timeline: sanitizedTimeline,
    feedback:
      r.feedback_resolved != null
        ? {
            resolved: Boolean(r.feedback_resolved),
            rating: r.feedback_rating != null ? Number(r.feedback_rating) : undefined,
            tags: r.feedback_tags || [],
            comment: r.feedback_comment || undefined,
            at: r.feedback_at,
          }
        : undefined,
  };
}

/**
 * GET /public/reports - Danh sách phản ánh công khai (bản đồ, danh sách, tìm kiếm quanh đây)
 */
publicRoutes.get('/reports', async (c) => {
  const query = c.req.query();
  const category = query.category;
  const status = query.status;
  const lat = query.lat ? parseFloat(query.lat) : undefined;
  const lng = query.lng ? parseFloat(query.lng) : undefined;
  const radius = query.radius ? parseFloat(query.radius) : 5000; // meters
  const limit = Math.min(query.limit ? parseInt(query.limit, 10) : 50, 100);
  const offset = query.offset ? parseInt(query.offset, 10) : 0;

  let reportsQuery;

  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    const pointWkt = `POINT(${lng} ${lat})`;
    reportsQuery = await sqlClient`
      SELECT 
        r.*,
        d.name as department_name,
        ST_X(r.location) as lng,
        ST_Y(r.location) as lat,
        ST_Distance(r.location, ST_GeographyFromText(${pointWkt})) as distance_meters,
        (SELECT count(*)::int FROM report_followers f WHERE f.report_id = r.id) as follower_count,
        fb.resolved as feedback_resolved,
        fb.rating as feedback_rating,
        fb.tags as feedback_tags,
        fb.comment as feedback_comment,
        fb.at as feedback_at
      FROM reports r
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN feedback fb ON fb.report_id = r.id
      WHERE ST_DWithin(r.location, ST_GeographyFromText(${pointWkt}), ${radius})
        AND (${category ? sqlClient`r.category = ${category}` : sqlClient`true`})
        AND (${status ? sqlClient`r.status = ${status}` : sqlClient`true`})
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
  } else {
    reportsQuery = await sqlClient`
      SELECT 
        r.*,
        d.name as department_name,
        ST_X(r.location) as lng,
        ST_Y(r.location) as lat,
        (SELECT count(*)::int FROM report_followers f WHERE f.report_id = r.id) as follower_count,
        fb.resolved as feedback_resolved,
        fb.rating as feedback_rating,
        fb.tags as feedback_tags,
        fb.comment as feedback_comment,
        fb.at as feedback_at
      FROM reports r
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN feedback fb ON fb.report_id = r.id
      WHERE (${category ? sqlClient`r.category = ${category}` : sqlClient`true`})
        AND (${status ? sqlClient`r.status = ${status}` : sqlClient`true`})
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
  }

  const reportIds = reportsQuery.map((r) => r.id);
  let photos: DbPhotoRow[] = [];
  if (reportIds.length > 0) {
    photos = await sqlClient`
      SELECT report_id, kind, storage_path, sort
      FROM report_photos
      WHERE report_id IN ${sqlClient(reportIds)};
    `;
  }

  const items = reportsQuery.map((r) => formatPublicReportRow(r, photos));
  return c.json({
    items,
    total: items.length,
    limit,
    offset,
  });
});

/**
 * GET /public/reports/:code - Chi tiết một phản ánh công khai (theo TB-xxxx hoặc UUID)
 */
publicRoutes.get('/reports/:code', async (c) => {
  const code = c.req.param('code');

  const [report] = await sqlClient`
    SELECT 
      r.*,
      d.name as department_name,
      ST_X(r.location) as lng,
      ST_Y(r.location) as lat,
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
    WHERE report_id = ${report.id};
  `;

  const timeline = await sqlClient`
    SELECT report_id, at, status, actor_type, actor_label, note
    FROM report_timeline
    WHERE report_id = ${report.id}
    ORDER BY at ASC;
  `;

  return c.json(formatPublicReportRow(report, photos, timeline));
});

/**
 * GET /public/kpi - Thống kê KPI công khai minh bạch (tính từ dữ liệu thực, không cứng theo is_seed)
 */
publicRoutes.get('/kpi', async (c) => {
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
    WHERE status NOT IN ('hoan_thanh', 'dong')
      AND due_at IS NOT NULL
      AND due_at < ${now}::timestamptz
      AND (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;
  const [avgRow] = await sqlClient`
    SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400.0) as avg_days
    FROM reports
    WHERE status IN ('hoan_thanh', 'dong')
      AND (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`});
  `;

  const catRows = await sqlClient`
    SELECT category, count(*)::int as count
    FROM reports
    WHERE (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`})
    GROUP BY category;
  `;
  const byCategory: Record<string, number> = {
    den_duong: 0,
    ngap_nuoc: 0,
    rac_thai: 0,
    mat_duong: 0,
  };
  for (const r of catRows) byCategory[r.category] = r.count;

  const statusRows = await sqlClient`
    SELECT status, count(*)::int as count
    FROM reports
    WHERE (${from ? sqlClient`created_at >= ${from}::timestamptz` : sqlClient`true`})
      AND (${to ? sqlClient`created_at <= ${to}::timestamptz` : sqlClient`true`})
    GROUP BY status;
  `;
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.count;

  const total = totalRow?.count ?? 0;
  const resolved = resolvedRow?.count ?? 0;
  const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
  const avgDays = parseFloat(avgRow?.avg_days || '3.2');

  return c.json({
    total,
    resolved,
    overdue: overdueRow?.count ?? 0,
    avgResolutionDays: parseFloat(avgDays.toFixed(1)),
    resolutionRate: parseFloat(resolutionRate.toFixed(1)),
    byCategory,
    byStatus,
    evaluatedAt: now,
  });
});

/**
 * GET /public/config - Cấu hình phường và hệ thống
 */
publicRoutes.get('/config', async (c) => {
  const [wardSetting] = await sqlClient`
    SELECT value FROM app_settings WHERE key = 'ward' LIMIT 1;
  `;

  const categorySettings = await sqlClient`
    SELECT cs.category, cs.label, cs.sla_days, d.name as default_department_name
    FROM category_settings cs
    LEFT JOIN departments d ON d.id = cs.default_department_id;
  `;

  return c.json({
    ward: wardSetting?.value || {
      name: 'Phường Trấn Biên',
      city: 'Thành phố Biên Hòa',
      center: { lat: 10.9505, lng: 106.8225 },
      boundaryRadiusMeters: 5000,
    },
    categories: categorySettings,
    demoMode: true,
    simulationBadge: 'Mô phỏng',
  });
});

/**
 * GET /public/recent-results - 5 kết quả xử lý mới nhất (có ảnh trước / sau)
 */
publicRoutes.get('/recent-results', async (c) => {
  const reports = await sqlClient`
    SELECT 
      r.id, r.code, r.category, r.address, r.completed_at, r.result_note,
      ST_X(r.location) as lng,
      ST_Y(r.location) as lat
    FROM reports r
    WHERE r.status IN ('hoan_thanh', 'dong') AND r.completed_at IS NOT NULL
    ORDER BY r.completed_at DESC
    LIMIT 5;
  `;

  const reportIds = reports.map((r) => r.id);
  let photos: DbPhotoRow[] = [];
  if (reportIds.length > 0) {
    photos = await sqlClient`
      SELECT report_id, kind, storage_path, sort
      FROM report_photos
      WHERE report_id IN ${sqlClient(reportIds)};
    `;
  }

  const items = reports.map((r) => {
    const beforePhotos = photos
      .filter((p) => p.report_id === r.id && p.kind === 'before')
      .map((p) => p.storage_path);
    const afterPhotos = photos
      .filter((p) => p.report_id === r.id && p.kind === 'after')
      .map((p) => p.storage_path);

    return {
      id: r.code,
      category: r.category,
      address: r.address,
      completedAt: r.completed_at,
      resultNote: r.result_note,
      beforePhoto: beforePhotos[0] || null,
      afterPhoto: afterPhotos[0] || null,
    };
  });

  return c.json({ items });
});
