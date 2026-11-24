import { Category, Report } from './types';

/**
 * Tính khoảng cách Haversine giữa 2 tọa độ (mét)
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    // Trong vòng 14 ngày gần nhất
    const createdMs = new Date(report.createdAt).getTime();
    const ageMs = nowMs - createdMs;
    if (ageMs < 0 || ageMs > maxAgeMs) {
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
