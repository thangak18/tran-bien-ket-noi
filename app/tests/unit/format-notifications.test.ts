import { describe, it, expect } from 'vitest';
import { formatDays, formatDistance, formatDate } from '@/domain/format';
import { buildNotification, shouldNotifyOnTransition } from '@/domain/notifications';

describe('UT-017 – Format & notifications (spec 3.4, 7.6)', () => {
  it('1. formatDays(3.2) = "3,2 ngày"; formatDistance(950) = "950 m"; formatDistance(1250) = "1,3 km"', () => {
    expect(formatDays(3.2)).toBe('3,2 ngày');
    expect(formatDistance(950)).toBe('950 m');
    expect(formatDistance(1250)).toBe('1,3 km');
  });

  it('2. formatDate = dd/MM/yyyy theo UTC+7 (ISO 2026-11-23T18:00:00Z -> 24/11/2026)', () => {
    expect(formatDate('2026-11-23T18:00:00Z')).toBe('24/11/2026');
  });

  it('3. buildNotification cho mỗi sự kiện spec 3.4 thay đúng biến, không còn ký tự {', () => {
    const msg1 = buildNotification('submit_success', { id: 'TB-0001' });
    expect(msg1).toBe(
      'Phường Trấn Biên đã nhận phản ánh #TB-0001. Bạn sẽ nhận tin khi có cập nhật.'
    );
    expect(msg1).not.toContain('{');

    const msg2 = buildNotification('da_tiep_nhan', {
      id: 'TB-0001',
      date: '27/11/2026',
    });
    expect(msg2).toContain('TB-0001');
    expect(msg2).toContain('27/11/2026');
    expect(msg2).not.toContain('{');

    const msg3 = buildNotification('da_giao', {
      id: 'TB-0001',
      department: 'Đội duy tu đường',
      date: '28/11/2026',
    });
    expect(msg3).toContain('Đội duy tu đường');
    expect(msg3).not.toContain('{');

    const msg4 = buildNotification('hoan_thanh', { id: 'TB-0001' });
    expect(msg4).toContain('ảnh kết quả');
    expect(msg4).not.toContain('{');

    const msg5 = buildNotification('can_bo_sung', {
      id: 'TB-0001',
      reason: 'Thiếu hình ảnh rõ ràng',
    });
    expect(msg5).toContain('Thiếu hình ảnh rõ ràng');
    expect(msg5).not.toContain('{');

    const msg6 = buildNotification('da_gop', {
      id: 'TB-0001',
      mainId: 'TB-0002',
      count: 3,
    });
    expect(msg6).toContain('TB-0002');
    expect(msg6).toContain('3');
    expect(msg6).not.toContain('{');

    const msg7 = buildNotification('mo_lai', { id: 'TB-0001' });
    expect(msg7).toContain('kiểm tra lại');
    expect(msg7).not.toContain('{');

    const msg8 = buildNotification('subscribe_later', { id: 'TB-0001' });
    expect(msg8).toContain('chỉ dùng cho phản ánh này');
    expect(msg8).not.toContain('{');
  });

  it('4. Chuyển cho_xac_minh -> da_tiep_nhan không sinh thông báo', () => {
    expect(shouldNotifyOnTransition('cho_xac_minh', 'da_tiep_nhan')).toBe(false);
    expect(shouldNotifyOnTransition('moi', 'da_tiep_nhan')).toBe(true);
    expect(shouldNotifyOnTransition('da_giao', 'hoan_thanh')).toBe(true);
  });
});
