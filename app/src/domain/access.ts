import { Report } from './types';

export interface AccessContext {
  phone?: string;
  deviceReports?: { id: string; secretCode: string }[];
  urlKey?: string | null;
}

/**
 * Kiểm tra xem người xem có quyền chủ hồ sơ hay không (spec 3.4a, UT-016b)
 * Điều kiện:
 * 1. SĐT đã xác thực trên thiết bị nằm trong followers của hồ sơ.
 * 2. Thiết bị có cặp {id, secretCode} khớp trong deviceReports.
 * 3. URL có tham số k khớp secretCode của hồ sơ.
 */
export function hasOwnerAccess(report: Report, context: AccessContext): boolean {
  // 1. SĐT nằm trong followers
  if (context.phone && report.followers?.includes(context.phone)) {
    return true;
  }

  // 2. deviceReports khớp id và secretCode
  if (context.deviceReports && report.secretCode) {
    const hasDeviceMatch = context.deviceReports.some(
      (d) => d.id === report.id && d.secretCode === report.secretCode
    );
    if (hasDeviceMatch) return true;
  }

  // 3. urlKey khớp secretCode
  if (context.urlKey && report.secretCode && context.urlKey === report.secretCode) {
    return true;
  }

  return false;
}

/**
 * Tính tổng số người cùng báo phản ánh (spec 3.6, UT-016b.5)
 */
export function followerCount(report: {
  followers?: string[];
  anonymousFollows?: number;
  followerCount?: number;
}): number {
  // Dữ liệu từ API chỉ có tổng số (không có danh sách SĐT).
  if (typeof report.followerCount === 'number') return report.followerCount;
  return (report.followers?.length ?? 0) + (report.anonymousFollows ?? 0);
}

const MAX_ANONYMOUS_PER_DAY = 5;

/**
 * Kiểm tra hạn mức gửi ẩn danh 5 hồ sơ/thiết bị/24h (spec 3.4b, UT-016b.6)
 */
export function canSendAnonymous(anonymousLog: string[], now: string): boolean {
  const nowMs = new Date(now).getTime();
  const windowMs = 24 * 60 * 60 * 1000;

  const countWithin24h = anonymousLog.filter((ts) => {
    const entryMs = new Date(ts).getTime();
    const diff = nowMs - entryMs;
    return diff >= 0 && diff <= windowMs;
  }).length;

  return countWithin24h < MAX_ANONYMOUS_PER_DAY;
}
