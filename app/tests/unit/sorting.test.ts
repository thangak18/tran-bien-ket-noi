import { describe, it, expect } from 'vitest';
import { isOverdue, isDueSoon, sortInbox, computePriority } from '@/domain/sorting';
import { Report } from '@/domain/types';

describe('UT-014 – Sorting & priority (spec 3.6)', () => {
  const now = '2026-11-24T09:00:00+07:00';
  const nowMs = new Date(now).getTime();

  const baseReport: Report = {
    id: 'TB-0001',
    category: 'den_duong',
    photos: [],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: 'Đường 30/4',
    createdAt: '2026-11-20T08:00:00+07:00',
    status: 'da_giao',
    priority: 'binh_thuong',
    anonymous: false,
    subscribedLater: false,
    secretCode: '1234',
    onBehalf: false,
    followers: ['0909000068'],
    anonymousFollows: 0,
    timeline: [],
  };

  it('1. dueAt = now - 1h, trạng thái da_giao -> overdue', () => {
    const dueAt = new Date(nowMs - 60 * 60 * 1000).toISOString();
    const r: Report = { ...baseReport, dueAt, status: 'da_giao' };
    expect(isOverdue(r, now)).toBe(true);
  });

  it('2. dueAt = now - 1h, trạng thái dong -> không overdue', () => {
    const dueAt = new Date(nowMs - 60 * 60 * 1000).toISOString();
    const r: Report = { ...baseReport, dueAt, status: 'dong' };
    expect(isOverdue(r, now)).toBe(false);
  });

  it('3. dueAt = now + 23h -> dueSoon; now + 25h -> không', () => {
    const dueAt23 = new Date(nowMs + 23 * 60 * 60 * 1000).toISOString();
    const r23: Report = { ...baseReport, dueAt: dueAt23, status: 'da_giao' };
    expect(isDueSoon(r23, now)).toBe(true);

    const dueAt25 = new Date(nowMs + 25 * 60 * 60 * 1000).toISOString();
    const r25: Report = { ...baseReport, dueAt: dueAt25, status: 'da_giao' };
    expect(isDueSoon(r25, now)).toBe(false);
  });

  it('4. sortInbox với tập [moi, overdue 2 ngày, overdue 1 ngày, dueSoon, da_giao bình thường] -> thứ tự đúng', () => {
    const rMoi: Report = {
      ...baseReport,
      id: 'R_MOI',
      status: 'moi',
      createdAt: '2026-11-23T08:00:00+07:00',
      dueAt: undefined,
    };
    const rOverdue2d: Report = {
      ...baseReport,
      id: 'R_OVERDUE_2D',
      status: 'da_giao',
      dueAt: new Date(nowMs - 48 * 60 * 60 * 1000).toISOString(),
    };
    const rOverdue1d: Report = {
      ...baseReport,
      id: 'R_OVERDUE_1D',
      status: 'da_giao',
      dueAt: new Date(nowMs - 24 * 60 * 60 * 1000).toISOString(),
    };
    const rDueSoon: Report = {
      ...baseReport,
      id: 'R_DUESOON',
      status: 'da_giao',
      dueAt: new Date(nowMs + 12 * 60 * 60 * 1000).toISOString(),
    };
    const rNormal: Report = {
      ...baseReport,
      id: 'R_NORMAL',
      status: 'da_giao',
      dueAt: new Date(nowMs + 72 * 60 * 60 * 1000).toISOString(),
    };

    const sorted = sortInbox([rMoi, rOverdue1d, rNormal, rOverdue2d, rDueSoon], now);
    expect(sorted.map((r) => r.id)).toEqual([
      'R_OVERDUE_2D',
      'R_OVERDUE_1D',
      'R_DUESOON',
      'R_MOI',
      'R_NORMAL',
    ]);
  });

  it('5. computePriority: followerCount 3 -> cao; 2 -> binh_thuong; followers 1 + anonymousFollows 2 -> cao; CB đặt tay cao giữ nguyên', () => {
    const r1: Report = { ...baseReport, followers: ['01', '02', '03'], anonymousFollows: 0 };
    expect(computePriority(r1)).toBe('cao');

    const r2: Report = { ...baseReport, followers: ['01', '02'], anonymousFollows: 0 };
    expect(computePriority(r2)).toBe('binh_thuong');

    const r3: Report = { ...baseReport, followers: ['01'], anonymousFollows: 2 };
    expect(computePriority(r3)).toBe('cao');

    const rManual: Report = {
      ...baseReport,
      priority: 'cao',
      followers: ['01'],
      anonymousFollows: 0,
    };
    expect(computePriority(rManual)).toBe('cao');
  });
});
