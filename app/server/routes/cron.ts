import { Hono } from 'hono';
import { sqlClient } from '../db/client';
import { requireCronSecret } from '../middleware/auth';
import { getDemoNow } from '../clock';

export const cronRoutes = new Hono();

cronRoutes.use('*', requireCronSecret);

/**
 * 1. POST /cron/sweep-overdue - Quét và rà soát hồ sơ quá hạn (Spec 12.6, CRON-001)
 */
cronRoutes.post('/sweep-overdue', async (c) => {
  const now = await getDemoNow();

  const overdueReports = await sqlClient`
    SELECT id, code, status, category, due_at
    FROM reports
    WHERE status NOT IN ('hoan_thanh', 'dong', 'da_gop', 'khong_xac_nhan')
      AND due_at IS NOT NULL
      AND due_at < ${now}::timestamptz;
  `;

  return c.json({
    success: true,
    overdueCount: overdueReports.length,
    overdueReports: overdueReports.map((r) => ({
      id: r.code,
      status: r.status,
      dueAt: r.due_at,
    })),
    evaluatedAt: now,
  });
});

/**
 * 2. POST /cron/cleanup-pending-uploads - Dọn dẹp ảnh tạm chưa đính kèm sau 24 giờ (CRON-002)
 */
cronRoutes.post('/cleanup-pending-uploads', async (c) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const deleted = await sqlClient`
    DELETE FROM pending_uploads
    WHERE attached = false AND created_at < ${oneDayAgo}::timestamptz
    RETURNING path;
  `;

  return c.json({
    success: true,
    cleanedCount: deleted.length,
  });
});
