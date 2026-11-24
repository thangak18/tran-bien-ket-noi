import { Category, Report, Status } from './types';
import { isOverdue, isDueSoon } from './sorting';

export interface CategoryKpi {
  total: number;
  resolved: number;
  open: number;
}

export interface KpiResult {
  total: number;
  resolved: number;
  open: number;
  resolvedPercent: number; // 0-100
  avgDays: number | null; // 1 chữ số thập phân, hoặc null nếu chưa có hồ sơ giải quyết
  overdue: number;
  dueSoon: number;
  byCategory: Record<Category, CategoryKpi>;
}

const RESOLVED_STATUSES: Set<Status> = new Set(['hoan_thanh', 'dong']);
const OPEN_STATUSES: Set<Status> = new Set([
  'moi',
  'da_tiep_nhan',
  'cho_xac_minh',
  'da_giao',
  'mo_lai',
  'can_bo_sung',
]);

/**
 * Tính toán các chỉ số KPI theo dữ liệu thực tế (spec 5.1, AC-C08-1, AC-A01-2)
 * Nhận now làm tham số, không gọi Date.now()
 */
export function computeKpi(
  reports: Report[],
  month?: string, // 'YYYY-MM'
  now?: string
): KpiResult {
  const filtered = month ? reports.filter((r) => r.createdAt.startsWith(month)) : reports;

  const byCategory: Record<Category, CategoryKpi> = {
    den_duong: { total: 0, resolved: 0, open: 0 },
    ngap_nuoc: { total: 0, resolved: 0, open: 0 },
    rac_thai: { total: 0, resolved: 0, open: 0 },
    mat_duong: { total: 0, resolved: 0, open: 0 },
  };

  let resolvedCount = 0;
  let openCount = 0;
  let totalResolutionDays = 0;
  let resolvedWithDurationCount = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;

  for (const r of filtered) {
    const cat = byCategory[r.category];
    if (cat) {
      cat.total += 1;
    }

    if (RESOLVED_STATUSES.has(r.status)) {
      resolvedCount += 1;
      if (cat) cat.resolved += 1;

      if (r.completedAt && r.createdAt) {
        const diffMs = new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime();
        const days = diffMs / (24 * 60 * 60 * 1000);
        totalResolutionDays += days;
        resolvedWithDurationCount += 1;
      }
    } else if (OPEN_STATUSES.has(r.status)) {
      openCount += 1;
      if (cat) cat.open += 1;
    }

    if (now) {
      if (isOverdue(r, now)) overdueCount += 1;
      if (isDueSoon(r, now)) dueSoonCount += 1;
    }
  }

  const total = filtered.length;
  const resolvedPercent = total > 0 ? (resolvedCount / total) * 100 : 0;
  const avgDays =
    resolvedWithDurationCount > 0
      ? Math.round((totalResolutionDays / resolvedWithDurationCount) * 10) / 10
      : null;

  return {
    total,
    resolved: resolvedCount,
    open: openCount,
    resolvedPercent,
    avgDays,
    overdue: overdueCount,
    dueSoon: dueSoonCount,
    byCategory,
  };
}
