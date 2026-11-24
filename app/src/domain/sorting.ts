import { Priority, Report, Status } from './types';

const DUE_TRACKED_STATUSES: Set<Status> = new Set([
  'da_tiep_nhan',
  'cho_xac_minh',
  'da_giao',
  'mo_lai',
]);

/**
 * Kiểm tra hồ sơ có bị quá hạn tại thời điểm now không (spec 3.6)
 */
export function isOverdue(report: Report, now: string): boolean {
  if (!report.dueAt || !DUE_TRACKED_STATUSES.has(report.status)) {
    return false;
  }
  return new Date(report.dueAt).getTime() < new Date(now).getTime();
}

/**
 * Kiểm tra hồ sơ có sắp đến hạn trong vòng 24h không (spec 3.6)
 */
export function isDueSoon(report: Report, now: string): boolean {
  if (!report.dueAt || !DUE_TRACKED_STATUSES.has(report.status)) {
    return false;
  }
  const diffMs = new Date(report.dueAt).getTime() - new Date(now).getTime();
  return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
}

/**
 * Tính mức độ ưu tiên theo số người cùng báo hoặc cán bộ đặt tay (spec 3.6)
 */
export function computePriority(report: Report, manualPriority?: Priority): Priority {
  if (manualPriority === 'cao' || report.priority === 'cao') {
    return 'cao';
  }
  const followerCount = (report.followers?.length ?? 0) + (report.anonymousFollows ?? 0);
  if (followerCount >= 3) {
    return 'cao';
  }
  return 'binh_thuong';
}

/**
 * Sắp xếp hộp tiếp nhận cán bộ mặc định theo spec 3.6:
 * Quá hạn -> Sắp đến hạn -> Mới -> Còn lại
 */
export function sortInbox(reports: Report[], now: string): Report[] {
  const overdue: Report[] = [];
  const dueSoon: Report[] = [];
  const moi: Report[] = [];
  const others: Report[] = [];

  for (const report of reports) {
    if (isOverdue(report, now)) {
      overdue.push(report);
    } else if (isDueSoon(report, now)) {
      dueSoon.push(report);
    } else if (report.status === 'moi') {
      moi.push(report);
    } else {
      others.push(report);
    }
  }

  // Quá hạn: dueAt tăng dần (quá hạn nhiều ngày lên trước)
  overdue.sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime());

  // Sắp đến hạn: dueAt tăng dần (hạn gần nhất lên trước)
  dueSoon.sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime());

  // Mới: createdAt giảm dần (mới nhất lên trước)
  moi.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Còn lại: dueAt tăng dần nếu có, sau đó createdAt giảm dần
  others.sort((a, b) => {
    if (a.dueAt && b.dueAt) {
      const diffDue = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (diffDue !== 0) return diffDue;
    } else if (a.dueAt) {
      return -1;
    } else if (b.dueAt) {
      return 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return [...overdue, ...dueSoon, ...moi, ...others];
}
