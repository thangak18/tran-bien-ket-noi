import { Report } from './types';

export interface AccessContext {
  phone?: string;
  deviceReports?: { id: string; secretCode: string }[];
  urlKey?: string | null;
}

/**
 * Quyền chủ hồ sơ (spec v3.0 mục 3.4a).
 * - Hồ sơ có SĐT: chỉ người đã đăng nhập có SĐT trùng `reporterPhone`. Người "Tôi cũng gặp"
 *   nằm trong `followers` nhưng KHÔNG phải chủ hồ sơ.
 * - Hồ sơ ẩn danh cũ: SĐT đã đăng ký nhận tin sau, hoặc khoá thiết bị {id, secretCode},
 *   hoặc URL có ?k= khớp secretCode.
 */
export function hasOwnerAccess(report: Report, context: AccessContext): boolean {
  if (!report.anonymous) {
    return Boolean(context.phone && report.reporterPhone && report.reporterPhone === context.phone);
  }

  // Hồ sơ ẩn danh cũ: followers của hồ sơ ẩn danh chỉ gồm người đăng ký nhận tin sau.
  if (context.phone && report.subscribedLater && report.followers?.includes(context.phone)) {
    return true;
  }
  if (context.deviceReports && report.secretCode) {
    const hasDeviceMatch = context.deviceReports.some(
      (d) => d.id === report.id && d.secretCode === report.secretCode
    );
    if (hasDeviceMatch) return true;
  }
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

/**
 * Lấy danh sách phản ánh thuộc quyền sở hữu của người dùng hiện tại, mới nhất trước
 */
export function getMyReports(reports: Report[], context: AccessContext): Report[] {
  return reports
    .filter((r) => hasOwnerAccess(r, context))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Kiểm tra phản ánh chỉ lưu trên máy này (chưa gắn SĐT đang đăng nhập)
 */
export function isDeviceOnlyReport(report: Report, context: AccessContext): boolean {
  const inDevice =
    context.deviceReports?.some((d) => d.id === report.id && d.secretCode === report.secretCode) ??
    false;
  if (!inDevice) return false;
  if (context.phone && report.followers?.includes(context.phone)) {
    return false;
  }
  return true;
}

/**
 * Tra cứu phản ánh bằng mã TB-xxxx và 4 chữ số cuối SĐT hoặc mã bí mật (spec 3.4a #4)
 */
export function lookupReportByCode(reports: Report[], code: string, pin4: string): Report | null {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedPin = pin4.trim();
  if (!normalizedCode || !/^\d{4}$/.test(normalizedPin)) {
    return null;
  }

  const report = reports.find((r) => r.id.toUpperCase() === normalizedCode);
  if (!report) return null;

  if (report.secretCode === normalizedPin) {
    return report;
  }

  if (report.reporterPhone && report.reporterPhone.slice(-4) === normalizedPin) {
    return report;
  }

  if (report.followers?.some((f) => f.slice(-4) === normalizedPin)) {
    return report;
  }

  return null;
}

export type MyReportFilterTab = 'all' | 'processing' | 'resolved';

const RESOLVED_GROUP_STATUSES = new Set([
  'hoan_thanh',
  'dong',
  'da_gop',
  'chuyen_co_quan',
  'khong_xac_nhan',
]);

/**
 * Lọc danh sách phản ánh của tôi theo 3 nhóm trạng thái (Tất cả / Đang xử lý / Đã xử lý)
 */
export function filterMyReports(reports: Report[], tab: MyReportFilterTab): Report[] {
  if (tab === 'all') return reports;
  if (tab === 'resolved') {
    return reports.filter((r) => RESOLVED_GROUP_STATUSES.has(r.status));
  }
  return reports.filter((r) => !RESOLVED_GROUP_STATUSES.has(r.status));
}
