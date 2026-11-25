import { describe, it, expect } from 'vitest';
import { formatDays, formatDistance, formatDate } from '@/domain/format';
import {
  buildCitizenNotifications,
  buildNotification,
  buildOfficerNotifications,
  buildVolunteerNotifications,
  shouldNotifyOnTransition,
} from '@/domain/notifications';
import { haversineMeters } from '@/domain/geo';
import { DEMO_NOW } from '@/domain/constants';
import { getInitialState } from '@/store/AppStore';

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

  it('5. haversineMeters giữa 2 điểm cách nhau 0,0004° vĩ độ ≈ 44,5 m (sai số ±1 m)', () => {
    const d = haversineMeters(10.95, 106.82, 10.9504, 106.82);
    expect(d).toBeGreaterThanOrEqual(43.5);
    expect(d).toBeLessThanOrEqual(45.5);
  });

  it('6. buildOfficerNotifications sinh thông báo phản ánh mới, quá hạn, mở lại và kết quả TNV', () => {
    const state = getInitialState();
    const list = buildOfficerNotifications(state.reports, state.volunteerTasks, DEMO_NOW);

    expect(list.some((item) => item.kind === 'new_report')).toBe(true);
    expect(list.some((item) => item.kind === 'overdue')).toBe(true);
    expect(list.some((item) => item.kind === 'reopened')).toBe(true);
    expect(list.every((item) => item.to.startsWith('/can-bo/'))).toBe(true);
  });

  it('7. buildVolunteerNotifications sinh thông báo chỉ thị cán bộ và tuyệt đối không lộ SĐT người dân', () => {
    const state = getInitialState();
    const list = buildVolunteerNotifications(
      state.reports,
      state.volunteerTasks,
      'Lê Thảo Vy',
      DEMO_NOW
    );

    expect(list.length).toBeGreaterThan(0);
    expect(list.every((item) => item.to.startsWith('/tnv/'))).toBe(true);
    const serialized = JSON.stringify(list);
    expect(serialized).not.toMatch(/0\d{9}/);
  });

  it('8. buildCitizenNotifications gộp thông báo realtime và mốc đã xử lý của SĐT đăng nhập', () => {
    const state = getInitialState();
    const completedReport = state.reports.find(
      (r) => r.status === 'hoan_thanh' && r.reporterPhone
    )!;
    const list = buildCitizenNotifications(
      state.reports,
      state.notifications,
      completedReport.reporterPhone!
    );

    expect(
      list.some((n) => n.reportId === completedReport.id && n.message.includes('xử lý xong'))
    ).toBe(true);
  });
});
