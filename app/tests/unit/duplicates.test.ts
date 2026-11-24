import { describe, it, expect } from 'vitest';
import { haversineMeters, findDuplicates } from '@/domain/duplicates';
import { Report } from '@/domain/types';

describe('UT-013 – Duplicates (spec 3.5)', () => {
  const now = '2026-11-24T09:00:00+07:00';

  it('1. haversineMeters giữa 2 điểm cách nhau 0,0004° vĩ độ ≈ 44,5 m (sai số ±1 m)', () => {
    const d = haversineMeters(10.95, 106.82, 10.9504, 106.82);
    expect(Math.abs(d - 44.48)).toBeLessThan(1);
  });

  const baseReport: Report = {
    id: 'TB-0002',
    category: 'mat_duong',
    photos: ['/p.jpg'],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: 'Đường CMT8',
    createdAt: '2026-11-21T09:00:00+07:00', // 3 ngày trước now
    status: 'da_giao',
    priority: 'binh_thuong',
    anonymous: false,
    subscribedLater: false,
    secretCode: '1111',
    onBehalf: false,
    followers: ['0909111222'],
    anonymousFollows: 0,
    timeline: [],
  };

  it('2. Cùng loại, 30 m, 3 ngày, trạng thái da_giao -> là trùng', () => {
    // 30m ~ 0.00027 độ vĩ độ
    const candidate = {
      category: 'mat_duong' as const,
      lat: 10.95027,
      lng: 106.82,
    };
    const res = findDuplicates(candidate, [baseReport], now);
    expect(res).toHaveLength(1);
    expect(res[0]?.report.id).toBe('TB-0002');
  });

  it('3. Khác loại, 10 m -> không trùng', () => {
    const candidate = {
      category: 'den_duong' as const,
      lat: 10.95009,
      lng: 106.82,
    };
    const res = findDuplicates(candidate, [baseReport], now);
    expect(res).toHaveLength(0);
  });

  it('4. Cùng loại, 51 m -> không trùng; đúng 50 m -> trùng', () => {
    // 50m: lat diff = 50 / 6371000 * (180 / Math.PI) = 0.00044966
    const lat50m = 10.95 + (50 / 6371000) * (180 / Math.PI);
    const candidate50m = { category: 'mat_duong' as const, lat: lat50m, lng: 106.82 };
    expect(findDuplicates(candidate50m, [baseReport], now)).toHaveLength(1);

    const lat51m = 10.95 + (51 / 6371000) * (180 / Math.PI);
    const candidate51m = { category: 'mat_duong' as const, lat: lat51m, lng: 106.82 };
    expect(findDuplicates(candidate51m, [baseReport], now)).toHaveLength(0);
  });

  it('5. Cùng loại, 20 m, 15 ngày trước -> không trùng', () => {
    const oldReport: Report = {
      ...baseReport,
      createdAt: '2026-11-08T09:00:00+07:00', // 16 ngày trước now
    };
    const candidate = {
      category: 'mat_duong' as const,
      lat: 10.95015,
      lng: 106.82,
    };
    expect(findDuplicates(candidate, [oldReport], now)).toHaveLength(0);
  });

  it('6. Cùng loại, 20 m, trạng thái dong / da_gop / chuyen_co_quan / khong_xac_nhan -> không trùng', () => {
    const nonDupeStatuses = ['dong', 'da_gop', 'chuyen_co_quan', 'khong_xac_nhan'] as const;
    const candidate = {
      category: 'mat_duong' as const,
      lat: 10.95015,
      lng: 106.82,
    };

    for (const status of nonDupeStatuses) {
      const r: Report = { ...baseReport, status };
      expect(findDuplicates(candidate, [r], now)).toHaveLength(0);
    }
  });

  it('7. Trả tối đa 3 kết quả, sắp theo khoảng cách tăng dần', () => {
    const candidate = { category: 'mat_duong' as const, lat: 10.95, lng: 106.82 };
    const r1: Report = {
      ...baseReport,
      id: 'TB-0010',
      lat: 10.9503,
      lng: 106.82,
    }; // ~33m
    const r2: Report = {
      ...baseReport,
      id: 'TB-0011',
      lat: 10.9501,
      lng: 106.82,
    }; // ~11m
    const r3: Report = {
      ...baseReport,
      id: 'TB-0012',
      lat: 10.9502,
      lng: 106.82,
    }; // ~22m
    const r4: Report = {
      ...baseReport,
      id: 'TB-0013',
      lat: 10.9504,
      lng: 106.82,
    }; // ~44m

    const res = findDuplicates(candidate, [r1, r2, r3, r4], now);
    expect(res).toHaveLength(3);
    expect(res.map((x) => x.report.id)).toEqual(['TB-0011', 'TB-0012', 'TB-0010']);
    expect(res[0]!.distanceMeters).toBeLessThan(res[1]!.distanceMeters);
    expect(res[1]!.distanceMeters).toBeLessThan(res[2]!.distanceMeters);
  });

  it('8. Không tự so sánh với chính nó', () => {
    const candidate = {
      id: 'TB-0002',
      category: 'mat_duong' as const,
      lat: 10.95,
      lng: 106.82,
    };
    expect(findDuplicates(candidate, [baseReport], now)).toHaveLength(0);
  });
});
