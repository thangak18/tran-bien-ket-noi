import { describe, it, expect } from 'vitest';
import { hasOwnerAccess, followerCount, canSendAnonymous } from '@/domain/access';
import { Report } from '@/domain/types';

describe('UT-016b – Access (spec 3.4a, 3.4b, 3.6)', () => {
  const now = '2026-11-24T09:00:00+07:00';
  const nowMs = new Date(now).getTime();

  const report: Report = {
    id: 'TB-0066',
    category: 'den_duong',
    photos: [],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: '123 CMT8',
    createdAt: '2026-11-20T08:00:00+07:00',
    status: 'da_giao',
    priority: 'binh_thuong',
    anonymous: true,
    subscribedLater: false,
    secretCode: '4821',
    onBehalf: false,
    followers: ['0909000068'],
    anonymousFollows: 2,
    timeline: [],
  };

  it('1. SĐT thiết bị nằm trong followers -> hasOwnerAccess true', () => {
    expect(hasOwnerAccess(report, { phone: '0909000068' })).toBe(true);
    expect(hasOwnerAccess(report, { phone: '0909999999' })).toBe(false);
  });

  it('2. deviceReports chứa {id, secretCode} đúng -> true; secretCode sai -> false', () => {
    expect(
      hasOwnerAccess(report, {
        deviceReports: [{ id: 'TB-0066', secretCode: '4821' }],
      })
    ).toBe(true);

    expect(
      hasOwnerAccess(report, {
        deviceReports: [{ id: 'TB-0066', secretCode: '9999' }],
      })
    ).toBe(false);
  });

  it('3. Tham số k khớp -> true; k sai -> false', () => {
    expect(hasOwnerAccess(report, { urlKey: '4821' })).toBe(true);
    expect(hasOwnerAccess(report, { urlKey: '0000' })).toBe(false);
  });

  it('4. Người lạ không SĐT, không deviceReports, không k -> false', () => {
    expect(hasOwnerAccess(report, {})).toBe(false);
  });

  it('5. followerCount = followers.length + anonymousFollows', () => {
    expect(followerCount(report)).toBe(3); // 1 + 2 = 3
  });

  it('6. canSendAnonymous: 4 mục anonymousLog trong 24h -> true; 5 -> false; 5 mục nhưng 1 mục cũ hơn 24h -> true', () => {
    const tMinus1h = new Date(nowMs - 1 * 3600 * 1000).toISOString();
    const tMinus2h = new Date(nowMs - 2 * 3600 * 1000).toISOString();
    const tMinus3h = new Date(nowMs - 3 * 3600 * 1000).toISOString();
    const tMinus4h = new Date(nowMs - 4 * 3600 * 1000).toISOString();
    const tMinus5h = new Date(nowMs - 5 * 3600 * 1000).toISOString();
    const tMinus25h = new Date(nowMs - 25 * 3600 * 1000).toISOString();

    // 4 mục trong 24h -> true
    expect(canSendAnonymous([tMinus1h, tMinus2h, tMinus3h, tMinus4h], now)).toBe(true);

    // 5 mục trong 24h -> false
    expect(canSendAnonymous([tMinus1h, tMinus2h, tMinus3h, tMinus4h, tMinus5h], now)).toBe(false);

    // 5 mục nhưng 1 mục cũ hơn 24h (chỉ 4 mục trong 24h) -> true
    expect(canSendAnonymous([tMinus1h, tMinus2h, tMinus3h, tMinus4h, tMinus25h], now)).toBe(true);
  });
});
