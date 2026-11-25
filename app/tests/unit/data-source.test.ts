import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDataSource } from '@/data/LocalDataSource';
import { dataSource } from '@/data';
import { ApiError, getDeviceId } from '@/lib/api';

describe('Frontend DataSource Abstraction (spec 16.1, AC-DATA-1)', () => {
  describe('DS-001: LocalDataSource Contracts', () => {
    const ds = new LocalDataSource();

    it('getReports trả về danh sách 64 hồ sơ mẫu', async () => {
      const reports = await ds.getReports();
      expect(reports.length).toBe(64);
      expect(reports[0]?.id).toMatch(/^TB-[0-9]{4}$/);
    });

    it('getPublicKpi trả về đúng KPI 64/47/2/3.2', async () => {
      const kpi = await ds.getPublicKpi();
      expect(kpi.totalReports).toBe(64);
      expect(kpi.resolvedCount).toBe(47);
      expect(kpi.overdueCount).toBe(2);
      expect(kpi.avgResolutionDays).toBe(3.2);
    });

    it('getReportById tìm thấy theo mã TB-0001', async () => {
      const r = await ds.getReportById('TB-0001');
      expect(r).not.toBeNull();
      expect(r?.id).toBe('TB-0001');
    });

    it('Lọc reports theo category và search', async () => {
      const lights = await ds.getReports({ category: 'den_duong' });
      expect(lights.length).toBe(18);

      const searched = await ds.getReports({ search: 'Phan Đình Phùng' });
      expect(searched.length).toBeGreaterThan(0);
    });
  });

  describe('DS-002: LocalDataSource State Mutations', () => {
    let ds: LocalDataSource;

    beforeEach(() => {
      ds = new LocalDataSource();
    });

    it('createReport chưa có SĐT (ẩn danh) bị từ chối; có SĐT thì sinh TB-0065 và mã bí mật 4 số', async () => {
      const base = {
        category: 'den_duong' as const,
        photos: ['/demo-photos/den_duong/1.jpg'],
        lat: 10.952,
        lng: 106.824,
        address: 'Đường Phan Chu Trinh',
      };
      // Spec v3.0 D1 / AC-DATA-6: chế độ local cũng không còn hồ sơ ẩn danh mới.
      await expect(ds.createReport({ ...base, anonymous: true })).rejects.toThrow(
        'Vui lòng đăng nhập số điện thoại để gửi phản ánh'
      );
      const res = await ds.createReport({ ...base, phone: '0911222333', anonymous: false });
      expect(res.report.id).toBe('TB-0065');
      expect(res.report.anonymous).toBe(false);
      expect(res.report.reporterPhone).toBe('0911222333');
      expect(res.secretCode).toMatch(/^[0-9]{4}$/);
      const lookup = await ds.lookupReport('TB-0065', res.secretCode!);
      expect(lookup.id).toBe('TB-0065');
    });
    it('supplementReport thêm timeline và ghi chú cho hồ sơ can_bo_sung', async () => {
      const reports = await ds.getReports();
      const target = reports.find((r) => r.status === 'can_bo_sung');
      expect(target).toBeDefined();

      const updated = await ds.supplementReport(target!.id, 'Bổ sung thêm hình ảnh hiện trường');
      expect(updated.id).toBe(target!.id);
      const lastTl = updated.timeline[updated.timeline.length - 1];
      expect(lastTl?.note).toBe('Bổ sung thêm hình ảnh hiện trường');
    });
  });

  describe('API-CLIENT: Client Helpers & Error Mapping', () => {
    it('getDeviceId sinh device ID duy nhất và lưu localStorage', () => {
      const devId = getDeviceId();
      expect(devId).toMatch(/^dev_/);
    });

    it('ApiError lưu đầy đủ status và code', () => {
      const err = new ApiError(
        'FORBIDDEN',
        'Bạn không có quyền',
        403,
        { reason: 'role' },
        'req-123'
      );
      expect(err.code).toBe('FORBIDDEN');
      expect(err.status).toBe(403);
      expect(err.requestId).toBe('req-123');
      expect(err.message).toBe('Bạn không có quyền');
    });
  });

  describe('DS-003: Singleton Export', () => {
    it('dataSource instance hợp lệ và có đầy đủ phương thức', () => {
      expect(dataSource).toBeDefined();
      expect(typeof dataSource.getReports).toBe('function');
      expect(typeof dataSource.createReport).toBe('function');
      expect(typeof dataSource.getPublicKpi).toBe('function');
    });
  });
});
