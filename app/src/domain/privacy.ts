import { PublicReport, Report } from './types';

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
