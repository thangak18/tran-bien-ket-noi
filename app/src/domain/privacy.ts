import { PublicReport, Report } from './types';
import { CATEGORY_CONFIGS } from './constants';

/**
 * Che số điện thoại bảo đảm tính riêng tư (spec 4.1, UT-016.1)
 * Ví dụ: '0909000068' -> '0909 *** 068'
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 4)} *** ${clean.slice(-3)}`;
}

/**
 * Chuẩn hoá actor trong timeline công khai (spec 4.1, UT-016.3)
 */
function sanitizePublicActor(actor: string): string {
  if (actor === 'Người dân') {
    return 'Người dân';
  }
  if (actor.includes('Tình nguyện') || actor.includes('TNV')) {
    return 'Tình nguyện viên';
  }
  return 'Phường Trấn Biên';
}

/**
 * Chuyển đổi dữ liệu Report thành PublicReport để hiển thị công khai (spec 4.1)
 * Loại bỏ hoàn toàn reporterPhone, secretCode, subscribedLater, followers
 */
export function toPublicReport(report: Report): PublicReport {
  const followerCount = (report.followers?.length ?? 0) + (report.anonymousFollows ?? 0);

  return {
    id: report.id,
    category: report.category,
    photos: report.photosApproved ? report.photos : [],
    lat: report.lat,
    lng: report.lng,
    address: report.address,
    locationNote: report.locationNote,
    title: report.title,
    description: report.description,
    createdAt: report.createdAt,
    status: report.status,
    department: report.department,
    dueAt: report.dueAt,
    followerCount,
    mergedInto: report.mergedInto,
    resultPhotos: report.resultPhotos,
    resultNote: report.resultNote,
    completedAt: report.completedAt,
    rating: report.feedback?.rating,
    timeline: report.timeline.map((entry) => ({
      at: entry.at,
      status: entry.status,
      actor: sanitizePublicActor(entry.actor),
      note: entry.note,
    })),
  };
}

/**
 * Chuyển PublicReport thành object tương thích ReportCard mà không lộ thông tin riêng tư
 */
export function toPublicCardReport(pub: PublicReport): Report {
  return {
    id: pub.id,
    category: pub.category,
    photos: pub.photos,
    photosApproved: true,
    lat: pub.lat,
    lng: pub.lng,
    address: pub.address,
    locationNote: pub.locationNote,
    title: pub.title,
    description: pub.description,
    createdAt: pub.createdAt,
    status: pub.status,
    priority: 'binh_thuong',
    department: pub.department,
    dueAt: pub.dueAt,
    anonymous: false,
    subscribedLater: false,
    secretCode: '',
    onBehalf: false,
    followers: Array.from({ length: pub.followerCount }, (_, i) => `follower-${i}`),
    anonymousFollows: 0,
    mergedInto: pub.mergedInto,
    resultPhotos: pub.resultPhotos,
    resultNote: pub.resultNote,
    completedAt: pub.completedAt,
    timeline: pub.timeline,
  };
}

/**
 * Lấy danh sách phản ánh công khai cho bảng tin Cộng đồng (loại trừ đã gộp, mới nhất trước, hỗ trợ tìm kiếm)
 */
export function getCommunityFeed(reports: Report[], searchQuery = ''): PublicReport[] {
  const q = searchQuery.trim().toLowerCase();

  const publicReports = reports
    .filter((r) => r.status !== 'da_gop')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toPublicReport);

  if (!q) return publicReports;

  return publicReports.filter((r) => {
    const catLabel = CATEGORY_CONFIGS.find((c) => c.key === r.category)?.label.toLowerCase() ?? '';
    return (
      r.id.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      (r.title?.toLowerCase().includes(q) ?? false) ||
      (r.description?.toLowerCase().includes(q) ?? false) ||
      (r.locationNote?.toLowerCase().includes(q) ?? false) ||
      catLabel.includes(q)
    );
  });
}
