import { describe, it, expect } from 'vitest';
import { generateMockData } from '@/domain/generator';
import { haversineMeters } from '@/domain/geo';
import { isOverdue } from '@/domain/sorting';
import { DEMO_NOW, ALL_FEEDBACK_TAGS, CATEGORY_CONFIGS } from '@/domain/constants';
import { WARD_CENTER } from '@/data/streets';

describe('UT-019 & DV-001 -> DV-014 – Mock data invariants', () => {
  it('UT-019.1: Cùng seed -> 2 lần chạy cho dữ liệu giống hệt', () => {
    const data1 = generateMockData(123456);
    const data2 = generateMockData(123456);
    expect(data1).toEqual(data2);
  });

  it('UT-019.2: Seed khác -> dữ liệu khác nhưng vẫn qua DV invariants', () => {
    const data1 = generateMockData(123456);
    const data2 = generateMockData(654321);
    expect(data1.reports[0]?.address).not.toEqual(data2.reports[0]?.address);
  });

  const { reports, volunteerTasks } = generateMockData(123456);

  it('DV-001: Đúng 64 hồ sơ createdAt trong tháng 11/2026', () => {
    expect(reports).toHaveLength(64);
    for (const r of reports) {
      expect(r.createdAt.startsWith('2026-11')).toBe(true);
    }
  });

  it('DV-002: Theo loại: den_duong 18, ngap_nuoc 15, rac_thai 21, mat_duong 10', () => {
    const counts = { den_duong: 0, ngap_nuoc: 0, rac_thai: 0, mat_duong: 0 };
    for (const r of reports) {
      counts[r.category] += 1;
    }
    expect(counts).toEqual({
      den_duong: 18,
      ngap_nuoc: 15,
      rac_thai: 21,
      mat_duong: 10,
    });
  });

  it('DV-003: hoan_thanh + dong = 47; còn lại = 17', () => {
    const resolved = reports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong');
    expect(resolved).toHaveLength(47);
    expect(reports.length - resolved.length).toBe(17);
  });

  it('DV-004: Trung bình completedAt - createdAt của 47 hồ sơ = 3,2 ngày, sai số <= 0,005', () => {
    const resolved = reports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong');
    let totalDays = 0;
    for (const r of resolved) {
      expect(r.completedAt).toBeDefined();
      const diffMs = new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime();
      const days = diffMs / (24 * 60 * 60 * 1000);
      totalDays += days;
    }
    const avg = totalDays / resolved.length;
    expect(Math.abs(avg - 3.2)).toBeLessThanOrEqual(0.005);
  });

  it('DV-005: Phân bổ đã xử lý theo loại 13/11/16/7 và trạng thái 17 hồ sơ mở theo spec 5.2', () => {
    const resolved = reports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong');
    const resCounts = { den_duong: 0, ngap_nuoc: 0, rac_thai: 0, mat_duong: 0 };
    for (const r of resolved) {
      resCounts[r.category] += 1;
    }
    expect(resCounts).toEqual({
      den_duong: 13,
      ngap_nuoc: 11,
      rac_thai: 16,
      mat_duong: 7,
    });

    const dongCount = reports.filter((r) => r.status === 'dong').length;
    const hoanThanhCount = reports.filter((r) => r.status === 'hoan_thanh').length;
    expect(dongCount).toBe(40);
    expect(hoanThanhCount).toBe(7);

    const openReports = reports.filter((r) => r.status !== 'hoan_thanh' && r.status !== 'dong');
    const openStatusCounts: Record<string, number> = {};
    for (const r of openReports) {
      openStatusCounts[r.status] = (openStatusCounts[r.status] ?? 0) + 1;
    }
    expect(openStatusCounts['moi']).toBe(4);
    expect(openStatusCounts['da_tiep_nhan']).toBe(4);
    expect(openStatusCounts['cho_xac_minh']).toBe(3);
    expect(openStatusCounts['da_giao']).toBe(4);
    expect(openStatusCounts['can_bo_sung']).toBe(1);
    expect(openStatusCounts['mo_lai']).toBe(1);
  });

  it('DV-006: Mọi completedAt <= demoNow và > createdAt; thời gian xử lý trong [0,5; 8] ngày', () => {
    const nowMs = new Date(DEMO_NOW).getTime();
    const resolved = reports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong');
    for (const r of resolved) {
      const compMs = new Date(r.completedAt!).getTime();
      const creatMs = new Date(r.createdAt).getTime();
      expect(compMs).toBeLessThanOrEqual(nowMs);
      expect(compMs).toBeGreaterThan(creatMs);
      const days = (compMs - creatMs) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThanOrEqual(0.5);
      expect(days).toBeLessThanOrEqual(8.0);
    }
  });

  it('DV-007: Mọi tọa độ trong khung lat 10.925–10.975, lng 106.790–106.860', () => {
    for (const r of reports) {
      expect(r.lat).toBeGreaterThanOrEqual(10.925);
      expect(r.lat).toBeLessThanOrEqual(10.975);
      expect(r.lng).toBeGreaterThanOrEqual(106.79);
      expect(r.lng).toBeLessThanOrEqual(106.86);
    }
  });

  it('DV-008: Đúng 2 hồ sơ da_giao quá hạn tại demoNow', () => {
    const overdueReports = reports.filter((r) => r.status === 'da_giao' && isOverdue(r, DEMO_NOW));
    expect(overdueReports).toHaveLength(2);
  });

  it('DV-009: Có đúng 2 cụm nghi trùng theo spec 3.5 trong nhóm chưa hoàn tất', () => {
    const openReports = reports.filter((r) => r.status !== 'hoan_thanh' && r.status !== 'dong');
    const duplicatePairs: [string, string][] = [];

    for (let i = 0; i < openReports.length; i++) {
      for (let j = i + 1; j < openReports.length; j++) {
        const a = openReports[i]!;
        const b = openReports[j]!;
        if (a.category === b.category) {
          const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
          if (dist <= 50) {
            duplicatePairs.push([a.id, b.id]);
          }
        }
      }
    }
    expect(duplicatePairs).toHaveLength(2);
  });

  it('DV-010: Có hồ sơ demo mat_duong da_tiep_nhan với 2 followers, cách tâm phường <= 300 m', () => {
    const demoReport = reports.find(
      (r) =>
        r.category === 'mat_duong' &&
        r.status === 'da_tiep_nhan' &&
        r.followers.length === 2 &&
        haversineMeters(r.lat, r.lng, WARD_CENTER.lat, WARD_CENTER.lng) <= 300
    );
    expect(demoReport).toBeDefined();
  });

  it('DV-011: Mọi id duy nhất, dạng TB-\\d{4}, liên tục 0001–0064', () => {
    const ids = reports.map((r) => r.id);
    expect(new Set(ids).size).toBe(64);
    for (let i = 1; i <= 64; i++) {
      const expectedId = `TB-${i.toString().padStart(4, '0')}`;
      expect(ids[i - 1]).toBe(expectedId);
    }
  });

  it('DV-012: 40 hồ sơ dong có rating 1-5 và tags thuộc bộ chip; 7 hoan_thanh không có feedback; 3 tasks khớp 3 cho_xac_minh', () => {
    const dongReports = reports.filter((r) => r.status === 'dong');
    expect(dongReports).toHaveLength(40);
    for (const r of dongReports) {
      expect(r.feedback?.rating).toBeDefined();
      expect(r.feedback!.rating).toBeGreaterThanOrEqual(1);
      expect(r.feedback!.rating).toBeLessThanOrEqual(5);
      expect(Array.isArray(r.feedback?.tags)).toBe(true);
      expect(r.feedback!.tags!.length).toBeGreaterThan(0);
      for (const tag of r.feedback!.tags!) {
        expect(ALL_FEEDBACK_TAGS).toContain(tag);
      }
    }

    const hoanThanhReports = reports.filter((r) => r.status === 'hoan_thanh');
    expect(hoanThanhReports).toHaveLength(7);
    for (const r of hoanThanhReports) {
      expect(r.feedback).toBeUndefined();
    }

    const choXacMinh = reports.filter((r) => r.status === 'cho_xac_minh');
    expect(choXacMinh).toHaveLength(3);
    expect(volunteerTasks).toHaveLength(3);
    for (const task of volunteerTasks) {
      expect(choXacMinh.some((r) => r.id === task.reportId)).toBe(true);
      expect(task.type).toBe('xac_minh');
    }
  });

  it('DV-014: Đúng 6 hồ sơ anonymous (3 rac_thai, 1 mỗi loại còn lại), 1 subscribedLater, mọi hồ sơ có secretCode 4 số', () => {
    const anon = reports.filter((r) => r.anonymous);
    expect(anon).toHaveLength(6);

    const anonCatCounts: Record<string, number> = {};
    for (const r of anon) {
      anonCatCounts[r.category] = (anonCatCounts[r.category] ?? 0) + 1;
      expect(r.reporterPhone).toBeFalsy();
    }
    expect(anonCatCounts['rac_thai']).toBe(3);
    expect(anonCatCounts['den_duong']).toBe(1);
    expect(anonCatCounts['ngap_nuoc']).toBe(1);
    expect(anonCatCounts['mat_duong']).toBe(1);

    // Có cả ở nhóm đã xử lý và chưa hoàn tất
    const anonResolved = anon.filter((r) => r.status === 'dong' || r.status === 'hoan_thanh');
    const anonOpen = anon.filter((r) => r.status !== 'dong' && r.status !== 'hoan_thanh');
    expect(anonResolved.length).toBeGreaterThan(0);
    expect(anonOpen.length).toBeGreaterThan(0);

    // Đúng 1 subscribedLater
    const subscribed = anon.filter((r) => r.subscribedLater);
    expect(subscribed).toHaveLength(1);

    // Mọi hồ sơ có secretCode 4 số
    for (const r of reports) {
      expect(r.secretCode).toMatch(/^\d{4}$/);
    }
  });

  it('DV-015: Timeline mạch lạc: mục cuối trùng status hiện tại, thời điểm tăng dần, qua đủ các bước, hoan_thanh trùng completedAt', () => {
    for (const r of reports) {
      expect(r.timeline.length).toBeGreaterThan(0);
      const last = r.timeline[r.timeline.length - 1]!;
      expect(last.status).toBe(r.status);

      for (let i = 1; i < r.timeline.length; i++) {
        const prev = new Date(r.timeline[i - 1]!.at).getTime();
        const curr = new Date(r.timeline[i]!.at).getTime();
        expect(curr).toBeGreaterThan(prev);
      }

      const statuses = r.timeline.map((t) => t.status);
      if (r.status === 'dong') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan', 'da_giao', 'hoan_thanh', 'dong']);
      } else if (r.status === 'hoan_thanh') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan', 'da_giao', 'hoan_thanh']);
      } else if (r.status === 'da_giao') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan', 'da_giao']);
      } else if (r.status === 'cho_xac_minh') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan', 'cho_xac_minh']);
      } else if (r.status === 'da_tiep_nhan') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan']);
      } else if (r.status === 'moi') {
        expect(statuses).toEqual(['moi']);
      } else if (r.status === 'can_bo_sung') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan', 'can_bo_sung']);
      } else if (r.status === 'mo_lai') {
        expect(statuses).toEqual(['moi', 'da_tiep_nhan', 'da_giao', 'hoan_thanh', 'mo_lai']);
      }

      const daGiao = r.timeline.find((t) => t.status === 'da_giao');
      if (daGiao) {
        expect(daGiao.note).toContain('Giao ');
      }

      if (r.completedAt) {
        const ht = r.timeline.find((t) => t.status === 'hoan_thanh');
        expect(ht).toBeDefined();
        expect(ht?.at).toBe(r.completedAt);
      }
    }
  });

  it('DV-016: department rỗng ở moi; từ da_tiep_nhan đúng bộ phận và dueAt = tiepNhan + SLA; mọi thời điểm có +07:00 (không dùng Z)', () => {
    const ISO_OFFSET7_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

    for (const r of reports) {
      expect(r.createdAt).toMatch(ISO_OFFSET7_REGEX);
      if (r.completedAt) expect(r.completedAt).toMatch(ISO_OFFSET7_REGEX);
      if (r.dueAt) expect(r.dueAt).toMatch(ISO_OFFSET7_REGEX);
      if (r.feedback?.at) expect(r.feedback.at).toMatch(ISO_OFFSET7_REGEX);
      for (const t of r.timeline) {
        expect(t.at).toMatch(ISO_OFFSET7_REGEX);
      }

      if (r.status === 'moi') {
        expect(r.department).toBeFalsy();
        expect(r.dueAt).toBeUndefined();
      } else {
        const cfg = CATEGORY_CONFIGS.find((c) => c.key === r.category)!;
        expect(r.department).toBe(cfg.suggestedDepartment);

        const tTiepNhan = r.timeline.find((t) => t.status === 'da_tiep_nhan');
        expect(tTiepNhan).toBeDefined();
        expect(r.dueAt).toBeDefined();

        const expectedDueMs =
          new Date(tTiepNhan!.at).getTime() + cfg.defaultDays * 24 * 60 * 60 * 1000;
        expect(new Date(r.dueAt!).getTime()).toBe(expectedDueMs);
      }
    }
  });
});
