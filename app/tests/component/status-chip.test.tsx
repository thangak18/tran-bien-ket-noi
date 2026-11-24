import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { Report } from '@/domain/types';

describe('CT-031 – StatusChip và DelayChip', () => {
  describe('StatusChip', () => {
    it('render icon + chữ cho trạng thái công khai', () => {
      render(<StatusChip status="moi" variant="public" />);
      // moi -> Chờ tiếp nhận
      const textEl = screen.getByText('Chờ tiếp nhận');
      expect(textEl).toBeInTheDocument();
      // có svg icon trong chip cha
      const chip = textEl.parentElement;
      expect(chip?.querySelector('svg')).toBeInTheDocument();
    });

    it('render nhãn cán bộ khi variant="officer"', () => {
      render(<StatusChip status="moi" variant="officer" />);
      // moi -> Mới
      expect(screen.getByText('Mới')).toBeInTheDocument();
    });

    it('render các trạng thái khác với nhãn công khai chuẩn', () => {
      const { rerender } = render(<StatusChip status="da_giao" variant="public" />);
      expect(screen.getByText('Đang xử lý')).toBeInTheDocument();

      rerender(<StatusChip status="hoan_thanh" variant="public" />);
      expect(screen.getByText('Đã xử lý')).toBeInTheDocument();

      rerender(<StatusChip status="cho_xac_minh" variant="public" />);
      expect(screen.getByText('Đã tiếp nhận')).toBeInTheDocument();
    });
  });

  describe('DelayChip', () => {
    it('chỉ render khi delayDays > 0 và hiện "Chậm n ngày"', () => {
      const overdueReport: Report = {
        id: 'TB-0001',
        category: 'den_duong',
        photos: [],
        photosApproved: true,
        lat: 10.95,
        lng: 106.82,
        address: '123 CMT8',
        createdAt: '2026-11-20T08:00:00+07:00',
        status: 'da_giao',
        priority: 'binh_thuong',
        department: 'Phòng KT-HT&ĐT',
        dueAt: '2026-11-22T09:00:00+07:00',
        secretCode: '1234',
        followers: [],
        anonymous: false,
        subscribedLater: false,
        onBehalf: false,
        anonymousFollows: 0,
        timeline: [],
      };

      const now = '2026-11-24T09:00:00+07:00'; // Quá hạn 2 ngày
      const { container, rerender } = render(<DelayChip report={overdueReport} now={now} />);

      expect(screen.getByText('Chậm 2 ngày')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();

      // Không quá hạn (dueAt sau now)
      const onTimeReport: Report = {
        ...overdueReport,
        dueAt: '2026-11-25T08:00:00+07:00',
      };
      rerender(<DelayChip report={onTimeReport} now={now} />);
      expect(screen.queryByText(/Chậm/)).not.toBeInTheDocument();
    });
  });
});
