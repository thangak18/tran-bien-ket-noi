import { describe, it, expect } from 'vitest';
import { canTransition, transition, splitReport, progressStep } from '@/domain/status';
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

  it('8. Chuyển sang can_bo_sung, chuyen_co_quan không có lý do hoặc lý do < 10 ký tự -> lỗi', () => {
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
});
