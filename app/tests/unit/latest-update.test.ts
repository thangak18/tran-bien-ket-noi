import { describe, it, expect } from 'vitest';
import { computeDelayDays, formatLatestUpdate } from '@/domain/latestUpdate';
import { Report, Status } from '@/domain/types';

describe('UT-013 – Latest update & delay (spec 3.4c, 3.6a)', () => {
  const now = '2026-11-24T09:00:00+07:00';

  const baseReport: Report = {
    id: 'TB-0001',
    category: 'den_duong',
    photos: ['/photo1.jpg'],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: '123 CMT8',
    createdAt: '2026-11-20T08:00:00+07:00',
    status: 'moi',
    priority: 'binh_thuong',
    anonymous: false,
    subscribedLater: false,
    secretCode: '1234',
    onBehalf: false,
    followers: ['0909000068'],
    anonymousFollows: 0,
    timeline: [
      {
        at: '2026-11-20T08:00:00+07:00',
        status: 'moi',
        actor: 'Người dân',
      },
    ],
  };

  it('1. Mỗi trạng thái trong 3.4c sinh đúng câu, thay hết biến (không còn ký tự {)', () => {
    const statuses: Status[] = [
      'moi',
      'da_tiep_nhan',
      'cho_xac_minh',
      'da_giao',
      'hoan_thanh',
      'dong',
      'mo_lai',
      'can_bo_sung',
      'da_gop',
      'chuyen_co_quan',
      'khong_xac_nhan',
    ];

    for (const status of statuses) {
      const r: Report = {
        ...baseReport,
        status,
        department: 'Đội chiếu sáng',
        dueAt: '2026-11-25T17:00:00+07:00',
        completedAt: '2026-11-23T10:00:00+07:00',
        mergedInto: 'TB-0002',
        timeline: [
          ...baseReport.timeline,
          {
            at: '2026-11-21T09:00:00+07:00',
            status,
            actor: 'Cán bộ',
            note: 'Chuyển tới Điện lực Đồng Nai: Sai thẩm quyền',
          },
        ],
      };

      const msg = formatLatestUpdate(r, now);
      expect(msg).toBeTruthy();
      expect(msg).not.toContain('{');
      expect(msg).not.toContain('}');
    }
  });

  it('2. da_giao, dueAt = now − 26h -> delayDays = 2 (làm tròn lên); câu có thêm "chậm hơn dự kiến 2 ngày"', () => {
    // 26 giờ trước now
    const past26h = new Date(new Date(now).getTime() - 26 * 60 * 60 * 1000).toISOString();
    const report: Report = {
      ...baseReport,
      status: 'da_giao',
      department: 'Đội duy tu đường',
      dueAt: past26h,
    };

    const delay = computeDelayDays(report, now);
    expect(delay).toBe(2);

    const msg = formatLatestUpdate(report, now);
    expect(msg).toContain('chậm hơn dự kiến 2 ngày');
  });

  it('3. dong có dueAt trong quá khứ -> delayDays = 0 (đã xong thì không báo chậm)', () => {
    const pastDue = new Date(new Date(now).getTime() - 48 * 60 * 60 * 1000).toISOString();
    const report: Report = {
      ...baseReport,
      status: 'dong',
      completedAt: '2026-11-22T10:00:00+07:00',
      dueAt: pastDue,
    };

    const delay = computeDelayDays(report, now);
    expect(delay).toBe(0);

    const msg = formatLatestUpdate(report, now);
    expect(msg).not.toContain('chậm');
  });

  it('4. Không có dueAt -> câu không chứa "Dự kiến"', () => {
    const report: Report = {
      ...baseReport,
      status: 'da_tiep_nhan',
      department: 'Đội thoát nước',
      dueAt: undefined,
    };

    const msg = formatLatestUpdate(report, now);
    expect(msg).not.toContain('Dự kiến');
  });

  it('5. can_bo_sung: lý do lấy từ note của timeline can_bo_sung; không có thì dùng "cung cấp thêm thông tin" (không dùng locationNote)', () => {
    // Trường hợp có note trong timeline can_bo_sung
    const rWithNote: Report = {
      ...baseReport,
      status: 'can_bo_sung',
      locationNote: 'Gần cột điện số 5 (không được dùng)',
      timeline: [
        ...baseReport.timeline,
        {
          at: '2026-11-21T09:00:00+07:00',
          status: 'can_bo_sung',
          actor: 'Cán bộ Minh',
          note: 'Chụp lại ảnh góc rộng hơn',
        },
      ],
    };
    expect(formatLatestUpdate(rWithNote, now)).toBe(
      'Phường cần bạn bổ sung: Chụp lại ảnh góc rộng hơn.'
    );

    // Trường hợp timeline không có note và có locationNote
    const rWithoutNote: Report = {
      ...baseReport,
      status: 'can_bo_sung',
      locationNote: 'Gần cột điện số 5 (không được dùng)',
      timeline: [
        ...baseReport.timeline,
        {
          at: '2026-11-21T09:00:00+07:00',
          status: 'can_bo_sung',
          actor: 'Cán bộ Minh',
        },
      ],
    };
    expect(formatLatestUpdate(rWithoutNote, now)).toBe(
      'Phường cần bạn bổ sung: cung cấp thêm thông tin.'
    );
  });
});
