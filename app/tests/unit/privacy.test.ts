import { describe, it, expect } from 'vitest';
import { maskPhone, toPublicReport } from '@/domain/privacy';
import { Report } from '@/domain/types';

describe('UT-016 – Privacy (spec 4.1)', () => {
  it('1. maskPhone("0909000068") = "0909 *** 068"', () => {
    expect(maskPhone('0909000068')).toBe('0909 *** 068');
  });

  const fullReport: Report = {
    id: 'TB-0001',
    category: 'den_duong',
    photos: ['/p.jpg'],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: '123 CMT8',
    createdAt: '2026-11-20T08:00:00+07:00',
    status: 'da_giao',
    priority: 'binh_thuong',
    department: 'Phòng KT-HT&ĐT',
    reporterPhone: '0909000068',
    anonymous: false,
    subscribedLater: true,
    secretCode: '4821',
    onBehalf: false,
    followers: ['0909000068', '0912345678'],
    anonymousFollows: 1,
    timeline: [
      {
        at: '2026-11-20T08:00:00+07:00',
        status: 'moi',
        actor: 'Người dân',
      },
      {
        at: '2026-11-20T09:00:00+07:00',
        status: 'da_tiep_nhan',
        actor: 'Nguyễn Văn Minh – Cán bộ tiếp nhận',
      },
      {
        at: '2026-11-21T09:00:00+07:00',
        status: 'cho_xac_minh',
        actor: 'Lê Thảo Vy – TNV',
      },
    ],
  };

  it('2. toPublicReport không có khoá reporterPhone, followers; có followerCount', () => {
    const pub = toPublicReport(fullReport);
    const pubRecord = pub as unknown as Record<string, unknown>;
    expect(pubRecord['reporterPhone']).toBeUndefined();
    expect(pubRecord['followers']).toBeUndefined();
    expect(pub.followerCount).toBe(3); // 2 followers + 1 anonymousFollows
  });

  it('3. Timeline công khai không chứa tên cán bộ/TNV; actor thay bằng "Phường Trấn Biên" hoặc "Tình nguyện viên"', () => {
    const pub = toPublicReport(fullReport);
    expect(pub.timeline[0]?.actor).toBe('Người dân');
    expect(pub.timeline[1]?.actor).toBe('Phường Trấn Biên');
    expect(pub.timeline[2]?.actor).toBe('Tình nguyện viên');
  });

  it('4. Serialize JSON của toPublicReport không chứa chuỗi khớp regex 0\\d{9}', () => {
    const pub = toPublicReport(fullReport);
    const serialized = JSON.stringify(pub);
    expect(/0\d{9}/.test(serialized)).toBe(false);
  });

  it('5. toPublicReport không có khoá secretCode, subscribedLater', () => {
    const pub = toPublicReport(fullReport);
    const pubRecord = pub as unknown as Record<string, unknown>;
    expect(pubRecord['secretCode']).toBeUndefined();
    expect(pubRecord['subscribedLater']).toBeUndefined();
  });
});
