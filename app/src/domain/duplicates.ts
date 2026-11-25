// BONUS B2 – HOÃN: chưa dùng trong UI lõi
import { Category, Report } from './types';
import { haversineMeters } from './geo';

export { haversineMeters };

export interface CandidateReport {
  id?: string;
  category: Category;
  lat: number;
  lng: number;
}

export interface DuplicateResult {
  report: Report;
  distanceMeters: number;
}

const NON_DUPLICATE_STATUSES = new Set(['dong', 'da_gop', 'chuyen_co_quan', 'khong_xac_nhan']);

const MAX_DUPLICATE_DISTANCE_METERS = 50.005; // 50 mét theo spec 3.5 (dung sai float)
const MAX_DUPLICATE_DAYS = 14;

// BONUS B2 – HOÃN: chưa dùng trong UI lõi
/**
 * Tìm các hồ sơ nghi trùng (spec 3.5)
 * Trả về tối đa 3 kết quả sắp xếp theo khoảng cách tăng dần
 */
export function findDuplicates(
  candidate: CandidateReport,
  reports: Report[],
  now: string
): DuplicateResult[] {
  const nowMs = new Date(now).getTime();
  const maxAgeMs = MAX_DUPLICATE_DAYS * 24 * 60 * 60 * 1000;

  const matches: DuplicateResult[] = [];

  for (const report of reports) {
    // Không tự so sánh với chính mình
    if (candidate.id && report.id === candidate.id) {
      continue;
    }

    // Phải cùng category
    if (report.category !== candidate.category) {
      continue;
    }

    // Không thuộc các trạng thái đã kết thúc/ngoại lệ
    if (NON_DUPLICATE_STATUSES.has(report.status)) {
      continue;
    }

    // Trong vòng 14 ngày gần nhất (không bỏ qua hồ sơ vừa tạo nếu đồng hồ thực tế > demoNow)
    const createdMs = new Date(report.createdAt).getTime();
    const ageMs = nowMs - createdMs;
    if (ageMs > maxAgeMs) {
      continue;
    }

    // Khoảng cách <= 50m
    const distanceMeters = haversineMeters(candidate.lat, candidate.lng, report.lat, report.lng);

    if (distanceMeters <= MAX_DUPLICATE_DISTANCE_METERS) {
      matches.push({ report, distanceMeters });
    }
  }

  // Sắp xếp theo khoảng cách tăng dần, lấy tối đa 3
  matches.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return matches.slice(0, 3);
}
