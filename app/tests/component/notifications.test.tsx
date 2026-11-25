import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from '@/components/citizen/NotificationBell';
import { PortalNotificationBell } from '@/components/common/PortalNotificationBell';
import { SmsPreview } from '@/components/citizen/SmsPreview';
import { MockLabel } from '@/components/common/MockLabel';
import { C09Notifications } from '@/screens/citizen/C09Notifications';
import { AppStoreProvider, getInitialState } from '@/store/AppStore';
import { Notification } from '@/domain/types';

describe('CT-038 – NotificationBell, SmsPreview và MockLabel', () => {
  const sampleNotifications: Notification[] = [
    {
      id: 'N-001',
      phone: '0909000068',
      reportId: 'TB-0010',
      message: 'Phường đã giao Phòng KT-HT&ĐT xử lý phản ánh của bạn.',
      createdAt: '2026-11-20T10:02:00+07:00',
      read: false,
      channel: 'app',
    },
    {
      id: 'N-002',
      phone: '0909000068',
      reportId: 'TB-0011',
      message: 'Sự cố đã được khắc phục tại hiện trường.',
      createdAt: '2026-11-21T08:00:00+07:00',
      read: true,
      channel: 'sms_mo_phong',
    },
  ];

  describe('NotificationBell', () => {
    it('hiển thị số chưa đọc đúng, mở danh sách và gọi đánh dấu đã đọc', () => {
      const handleMarkRead = vi.fn();
      render(<NotificationBell notifications={sampleNotifications} onMarkRead={handleMarkRead} />);

      // Có 1 thông báo chưa đọc (read: false) -> badge hiện "1"
      expect(screen.getByText('1')).toBeInTheDocument();

      // Click chuông để mở danh sách
      const bellBtn = screen.getByRole('button', { name: /Thông báo/i });
      fireEvent.click(bellBtn);

      // Danh sách mở ra, hiển thị tiêu đề các thông báo
      expect(screen.getByText(/TB-0010/)).toBeInTheDocument();
      expect(
        screen.getByText('Phường đã giao Phòng KT-HT&ĐT xử lý phản ánh của bạn.')
      ).toBeInTheDocument();
      expect(screen.getByText(/TB-0011/)).toBeInTheDocument();
      expect(screen.getByText('Sự cố đã được khắc phục tại hiện trường.')).toBeInTheDocument();

      // Đã gọi onMarkRead
      expect(handleMarkRead).toHaveBeenCalledTimes(1);
    });

    it('không hiện badge số khi không có thông báo chưa đọc', () => {
      render(
        <NotificationBell
          notifications={[sampleNotifications[1]!]} // read: true
        />
      );
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('SmsPreview', () => {
    it('hiển thị nội dung SMS, người gửi và có nhãn "Mô phỏng"', () => {
      render(
        <SmsPreview
          phone="0909000068"
          message="UBND P. Tran Bien: Phan anh TB-0010 da duoc tiep nhan. Theo doi tai: https://tranbien.vn/p/TB-0010?k=1234"
          time="20/11 10:02"
        />
      );

      expect(screen.getAllByText(/UBND P. Tran Bien/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/0909000068/)).toBeInTheDocument();
      expect(screen.getByText(/TB-0010/)).toBeInTheDocument();
      // Bắt buộc có nhãn "Mô phỏng"
      expect(screen.getByText('Mô phỏng')).toBeInTheDocument();
    });
  });

  describe('MockLabel', () => {
    it('render nhãn Mô phỏng chuẩn', () => {
      render(<MockLabel />);
      expect(screen.getByText('Mô phỏng')).toBeInTheDocument();
    });
  });

  describe('PortalNotificationBell (Cán bộ & Tình nguyện viên)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('hiển thị thông báo chỉ thị cho TNV, đánh dấu đã đọc và không lộ SĐT', () => {
      render(
        <MemoryRouter>
          <AppStoreProvider initialState={getInitialState()}>
            <PortalNotificationBell role="volunteer" volunteerName="Lê Thảo Vy" />
          </AppStoreProvider>
        </MemoryRouter>
      );

      const btn = screen.getByRole('button', { name: /Thông báo tình nguyện viên/i });
      fireEvent.click(btn);

      expect(screen.getByText(/Chỉ thị & Nhiệm vụ TNV/i)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/0\d{9}/);

      const markAll = screen.getByRole('button', { name: /Đánh dấu đã đọc/i });
      fireEvent.click(markAll);
      expect(screen.queryByTestId('portal-notif-badge')).not.toBeInTheDocument();
    });

    it('hiển thị thông báo phản ánh mới / quá hạn cho Cán bộ phường', () => {
      render(
        <MemoryRouter>
          <AppStoreProvider initialState={getInitialState()}>
            <PortalNotificationBell role="officer" />
          </AppStoreProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Thông báo cán bộ/i }));
      expect(screen.getByText(/Thông báo điều hành/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Phản ánh mới|Quá hạn|Mở lại/i).length).toBeGreaterThan(0);
    });
  });

  describe('C09Notifications (Người dân)', () => {
    it('hiển thị nút Xem tin nhắn mẫu kèm nhãn Mô phỏng (AC-C09-3)', () => {
      const initial = getInitialState();
      const withPhone = {
        ...initial,
        settings: { ...initial.settings, phone: '0909000068' },
        notifications: [sampleNotifications[0]!],
      };

      render(
        <MemoryRouter initialEntries={['/thong-bao']}>
          <AppStoreProvider initialState={withPhone}>
            <C09Notifications />
          </AppStoreProvider>
        </MemoryRouter>
      );

      const smsBtn = screen.getAllByRole('button', { name: /Xem tin nhắn mẫu/i })[0]!;
      fireEvent.click(smsBtn);
      expect(screen.getByText('Mô phỏng')).toBeInTheDocument();
    });
  });
});
