import { describe, it, expect } from 'vitest';
import {
  canTransition,
  transition,
  splitReport,
  progressStep,
  publicTimeline,
} from '@/domain/status';
import { Report } from '@/domain/types';

describe('UT-012 – Status', () => {
  const baseReport: Report = {
    id: 'TB-0001',
    category: 'den_duong',
    photos: ['/photo1.jpg'],
    photosApproved: true,
    lat: 10.95,
    lng: 106.82,
    address: '123 Đường 30/4',
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

  const now = '2026-11-24T09:00:00+07:00';

  it('1. canTransition(moi, da_tiep_nhan, CB) = true; (moi, hoan_thanh, CB) = false', () => {
    expect(canTransition('moi', 'da_tiep_nhan', 'CB')).toBe(true);
    expect(canTransition('moi', 'hoan_thanh', 'CB')).toBe(false);
  });

  it('2. transition sang hoan_thanh khi không có resultPhotos -> ném lỗi có thông điệp tiếng Việt', () => {
    const report: Report = { ...baseReport, status: 'da_giao' };
    expect(() =>
      transition(report, 'hoan_thanh', 'CB', 'Cán bộ Minh', now, {
        resultPhotos: [],
        resultNote: 'Đã thay bóng đèn đường mới',
      })
    ).toThrowError(/hình ảnh kết quả/i);
  });

  it('3. transition sang hoan_thanh lần đầu set completedAt; lần hai giữ nguyên completedAt cũ', () => {
    const report: Report = { ...baseReport, status: 'da_giao' };
    const { report: completedReport } = transition(report, 'hoan_thanh', 'CB', 'Cán bộ Minh', now, {
      resultPhotos: ['/after1.jpg'],
      resultNote: 'Đã thay bóng đèn đường mới xong hoàn tất',
    });
    expect(completedReport.completedAt).toBe(now);

    // Mở lại rồi hoàn thành lại
    const reopenedReport: Report = { ...completedReport, status: 'da_giao' };
    const laterNow = '2026-11-25T10:00:00+07:00';
    const { report: completedAgain } = transition(
      reopenedReport,
      'hoan_thanh',
      'CB',
      'Cán bộ Minh',
      laterNow,
      {
        resultPhotos: ['/after2.jpg'],
        resultNote: 'Đã kiểm tra và xử lý lại bóng đèn',
      }
    );
    expect(completedAgain.completedAt).toBe(now); // Giữ nguyên completedAt cũ
  });

  it('4. Mọi transition thành công thêm đúng 1 mục timeline với at = now', () => {
    const countBefore = baseReport.timeline.length;
    const { report: updated } = transition(baseReport, 'da_tiep_nhan', 'CB', 'Cán bộ Minh', now, {
      department: 'Phòng KT-HT&ĐT – Đội chiếu sáng công cộng',
      dueAt: '2026-11-27T08:00:00+07:00',
    });
    expect(updated.timeline.length).toBe(countBefore + 1);
    const lastEntry = updated.timeline[updated.timeline.length - 1];
    expect(lastEntry?.at).toBe(now);
    expect(lastEntry?.status).toBe('da_tiep_nhan');
    expect(lastEntry?.actor).toBe('Cán bộ Minh');
  });

  it('5. TNV không thể chuyển bất kỳ trạng thái nào trực tiếp (canTransition luôn false)', () => {
    expect(canTransition('cho_xac_minh', 'da_tiep_nhan', 'TNV')).toBe(false);
    expect(canTransition('cho_xac_minh', 'khong_xac_nhan', 'TNV')).toBe(false);
    expect(canTransition('hoan_thanh', 'dong', 'TNV')).toBe(false);
  });

  it('6. split khôi phục statusBeforeMerge', () => {
    const mergedReport: Report = {
      ...baseReport,
      status: 'da_gop',
      statusBeforeMerge: 'da_tiep_nhan',
      mergedInto: 'TB-0002',
    };
    const restored = splitReport(mergedReport, now, 'Cán bộ Minh');
    expect(restored.status).toBe('da_tiep_nhan');
    expect(restored.mergedInto).toBeUndefined();
    expect(restored.statusBeforeMerge).toBeUndefined();
  });

  it('7. progressStep: moi->1, da_tiep_nhan->2, cho_xac_minh->2, da_giao->3, mo_lai->3, hoan_thanh->4, dong->4, da_gop->exception', () => {
    expect(progressStep('moi')).toBe(1);
    expect(progressStep('da_tiep_nhan')).toBe(2);
    expect(progressStep('cho_xac_minh')).toBe(2);
    expect(progressStep('da_giao')).toBe(3);
    expect(progressStep('mo_lai')).toBe(3);
    expect(progressStep('hoan_thanh')).toBe(4);
    expect(progressStep('dong')).toBe(4);
    expect(progressStep('da_gop')).toBe('exception');
  });

  it('7. Chuyển sang can_bo_sung, chuyen_co_quan không có lý do hoặc lý do < 10 ký tự -> lỗi', () => {
    expect(() =>
      transition(baseReport, 'can_bo_sung', 'CB', 'Cán bộ Minh', now, {
        note: 'Ngắn',
      })
    ).toThrowError(/lý do/i);

    expect(() =>
      transition(baseReport, 'chuyen_co_quan', 'CB', 'Cán bộ Minh', now, {
        targetAgency: 'Điện lực Đồng Nai',
        note: 'Ngắn',
      })
    ).toThrowError(/lý do/i);
  });

  it('8. publicTimeline hồ sơ da_tiep_nhan có dueAt -> mốc 1 done (có giờ), mốc 2 current (có giờ), mốc 3 upcoming, mốc 4 upcoming kèm expected = dueAt', () => {
    const report: Report = {
      ...baseReport,
      status: 'da_tiep_nhan',
      dueAt: '2026-11-28T09:00:00+07:00',
      timeline: [
        { at: '2026-11-20T08:00:00+07:00', status: 'moi', actor: 'Người dân' },
        { at: '2026-11-20T10:00:00+07:00', status: 'da_tiep_nhan', actor: 'Cán bộ Minh' },
      ],
    };

    const timeline = publicTimeline(report);
    expect(timeline).toHaveLength(4);

    // Mốc 1: done (có giờ)
    expect(timeline[0]?.status).toBe('done');
    expect(timeline[0]?.at).toBe('2026-11-20T08:00:00+07:00');

    // Mốc 2: current (có giờ)
    expect(timeline[1]?.status).toBe('current');
    expect(timeline[1]?.at).toBe('2026-11-20T10:00:00+07:00');

    // Mốc 3: upcoming
    expect(timeline[2]?.status).toBe('upcoming');

    // Mốc 4: upcoming kèm expected = dueAt
    expect(timeline[3]?.status).toBe('upcoming');
    expect(timeline[3]?.expected).toBe('2026-11-28T09:00:00+07:00');
  });

  it('9. publicTimeline hồ sơ dong -> 4 mốc đều done, mỗi mốc có giờ lấy từ timeline', () => {
    const report: Report = {
      ...baseReport,
      status: 'dong',
      completedAt: '2026-11-22T15:00:00+07:00',
      timeline: [
        { at: '2026-11-20T08:00:00+07:00', status: 'moi', actor: 'Người dân' },
        { at: '2026-11-20T10:00:00+07:00', status: 'da_tiep_nhan', actor: 'Cán bộ' },
        { at: '2026-11-21T09:00:00+07:00', status: 'da_giao', actor: 'Cán bộ' },
        { at: '2026-11-22T15:00:00+07:00', status: 'hoan_thanh', actor: 'Cán bộ' },
        { at: '2026-11-22T16:00:00+07:00', status: 'dong', actor: 'Người dân' },
      ],
    };

    const timeline = publicTimeline(report);
    expect(timeline).toHaveLength(4);
    expect(timeline.every((s) => s.status === 'done')).toBe(true);
    expect(timeline[0]?.at).toBe('2026-11-20T08:00:00+07:00');
    expect(timeline[1]?.at).toBe('2026-11-20T10:00:00+07:00');
    expect(timeline[2]?.at).toBe('2026-11-21T09:00:00+07:00');
    expect(timeline[3]?.at).toBe('2026-11-22T15:00:00+07:00');
  });

  it('10. publicTimeline hồ sơ moi -> mốc 1 current, 3 mốc còn lại upcoming', () => {
    const report: Report = {
      ...baseReport,
      status: 'moi',
      createdAt: '2026-11-20T08:00:00+07:00',
      timeline: [{ at: '2026-11-20T08:00:00+07:00', status: 'moi', actor: 'Người dân' }],
    };

    const timeline = publicTimeline(report);
    expect(timeline[0]?.status).toBe('current');
    expect(timeline[0]?.at).toBe('2026-11-20T08:00:00+07:00');
    expect(timeline[1]?.status).toBe('upcoming');
    expect(timeline[2]?.status).toBe('upcoming');
    expect(timeline[3]?.status).toBe('upcoming');
  });

  it('11. Trạng thái ngoại lệ: tính theo trạng thái thường gần nhất; một mốc chỉ done khi timeline có mục tương ứng', () => {
    // Trường hợp 1: can_bo_sung ngay từ moi -> trạng thái thường gần nhất là moi -> mốc 1 current, mốc 2 KHÔNG được done
    const rFromMoi: Report = {
      ...baseReport,
      status: 'can_bo_sung',
      timeline: [
        { at: '2026-11-20T08:00:00+07:00', status: 'moi', actor: 'Người dân' },
        {
          at: '2026-11-20T09:00:00+07:00',
          status: 'can_bo_sung',
          actor: 'Cán bộ',
          note: 'Thiếu ảnh',
        },
      ],
    };

    const tlFromMoi = publicTimeline(rFromMoi);
    expect(tlFromMoi[0]?.status).toBe('current');
    expect(tlFromMoi[1]?.status).toBe('upcoming'); // mốc 2 KHÔNG được done
    expect(tlFromMoi[2]?.status).toBe('upcoming');
    expect(tlFromMoi[3]?.status).toBe('upcoming');

    // Trường hợp 2: can_bo_sung sau da_tiep_nhan -> trạng thái thường gần nhất là da_tiep_nhan -> mốc 1 done, mốc 2 current
    const rFromTiepNhan: Report = {
      ...baseReport,
      status: 'can_bo_sung',
      timeline: [
        { at: '2026-11-20T08:00:00+07:00', status: 'moi', actor: 'Người dân' },
        { at: '2026-11-20T10:00:00+07:00', status: 'da_tiep_nhan', actor: 'Cán bộ' },
        {
          at: '2026-11-20T11:00:00+07:00',
          status: 'can_bo_sung',
          actor: 'Cán bộ',
          note: 'Thiếu ảnh vị trí',
        },
      ],
    };

    const tlFromTiepNhan = publicTimeline(rFromTiepNhan);
    expect(tlFromTiepNhan[0]?.status).toBe('done');
    expect(tlFromTiepNhan[1]?.status).toBe('current');
    expect(tlFromTiepNhan[2]?.status).toBe('upcoming');
    expect(tlFromTiepNhan[3]?.status).toBe('upcoming');
  });

  it('12. mo_lai -> mốc 3 current; mốc 4 upcoming (không hiển thị giờ completedAt cũ cho mốc 4)', () => {
    const report: Report = {
      ...baseReport,
      status: 'mo_lai',
      dueAt: '2026-11-27T17:00:00+07:00',
      completedAt: '2026-11-22T15:00:00+07:00', // Completed cũ
      timeline: [
        { at: '2026-11-20T08:00:00+07:00', status: 'moi', actor: 'Người dân' },
        { at: '2026-11-20T10:00:00+07:00', status: 'da_tiep_nhan', actor: 'Cán bộ' },
        { at: '2026-11-21T09:00:00+07:00', status: 'da_giao', actor: 'Cán bộ' },
        { at: '2026-11-22T15:00:00+07:00', status: 'hoan_thanh', actor: 'Cán bộ' },
        { at: '2026-11-23T08:00:00+07:00', status: 'mo_lai', actor: 'Người dân' },
      ],
    };

    const timeline = publicTimeline(report);
    expect(timeline[0]?.status).toBe('done');
    expect(timeline[1]?.status).toBe('done');
    expect(timeline[2]?.status).toBe('current');
    expect(timeline[2]?.at).toBe('2026-11-23T08:00:00+07:00');

    // Mốc 4 upcoming, KHÔNG hiển thị giờ completedAt cũ
    expect(timeline[3]?.status).toBe('upcoming');
    expect(timeline[3]?.at).toBeUndefined();
    expect(timeline[3]?.expected).toBe('2026-11-27T17:00:00+07:00');
  });
});
