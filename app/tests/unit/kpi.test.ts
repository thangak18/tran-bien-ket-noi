import { describe, it, expect } from 'vitest';
import { computeKpi } from '@/domain/kpi';
import { Report } from '@/domain/types';

describe('UT-015 – KPI (spec 5.1, AC-C08-1, AC-A01-2)', () => {
  const now = '2026-11-24T09:00:00+07:00';

  it('2. Tập rỗng -> mọi số 0, avgDays null (UI hiện "–")', () => {
    const kpi = computeKpi([], '2026-11', now);
    expect(kpi.total).toBe(0);
    expect(kpi.resolved).toBe(0);
    expect(kpi.open).toBe(0);
    expect(kpi.resolvedPercent).toBe(0);
    expect(kpi.avgDays).toBeNull();
    expect(kpi.overdue).toBe(0);
    expect(kpi.dueSoon).toBe(0);
    expect(kpi.byCategory).toEqual({
      den_duong: { total: 0, resolved: 0, open: 0 },
      ngap_nuoc: { total: 0, resolved: 0, open: 0 },
      rac_thai: { total: 0, resolved: 0, open: 0 },
      mat_duong: { total: 0, resolved: 0, open: 0 },
    });
  });

  it('3. Hồ sơ da_gop không tính vào open', () => {
    const r1: Report = {
      id: 'TB-0001',
      category: 'den_duong',
      photos: [],
      photosApproved: true,
      lat: 10.95,
      lng: 106.82,
      address: 'Đường 30/4',
      createdAt: '2026-11-05T08:00:00+07:00',
      status: 'da_gop',
      priority: 'binh_thuong',
      anonymous: false,
      subscribedLater: false,
      secretCode: '1234',
      onBehalf: false,
      followers: [],
      anonymousFollows: 0,
      timeline: [],
    };
    const r2: Report = {
      ...r1,
      id: 'TB-0002',
      status: 'moi',
    };
    const kpi = computeKpi([r1, r2], '2026-11', now);
    expect(kpi.open).toBe(1); // Chỉ r2 tính vào open
  });

  it('4. Thêm 1 hồ sơ tháng 12 -> KPI tháng 11 không đổi', () => {
    const rNov: Report = {
      id: 'TB-0001',
      category: 'ngap_nuoc',
      photos: [],
      photosApproved: true,
      lat: 10.95,
      lng: 106.82,
      address: 'Đường 30/4',
      createdAt: '2026-11-10T08:00:00+07:00',
      status: 'hoan_thanh',
      completedAt: '2026-11-13T08:00:00+07:00',
      priority: 'binh_thuong',
      anonymous: false,
      subscribedLater: false,
      secretCode: '1234',
      onBehalf: false,
      followers: [],
      anonymousFollows: 0,
      timeline: [],
    };
    const rDec: Report = {
      ...rNov,
      id: 'TB-0002',
      createdAt: '2026-12-01T08:00:00+07:00',
      completedAt: '2026-12-02T08:00:00+07:00',
    };

    const kpiBefore = computeKpi([rNov], '2026-11', now);
    const kpiAfter = computeKpi([rNov, rDec], '2026-11', now);
    expect(kpiBefore).toEqual(kpiAfter);
  });
});
