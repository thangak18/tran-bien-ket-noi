import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { CategoryTile } from '@/components/citizen/CategoryTile';
import { LocationRow } from '@/components/citizen/LocationRow';
import { ReportCard } from '@/components/citizen/ReportCard';
import { LatestUpdate } from '@/components/citizen/LatestUpdate';
import { Report } from '@/domain/types';

describe('CT-037 – Report Components', () => {
  describe('BeforeAfter', () => {
    it('không có ảnh sau -> ô "Chưa có ảnh sau xử lý"; alt "Trước xử lý" và "Sau xử lý"', () => {
      const { rerender } = render(<BeforeAfter beforePhotos={['/demo-photos/mat_duong/1.jpg']} />);

      // Ảnh trước có alt "Trước xử lý"
      const beforeImg = screen.getByAltText('Trước xử lý');
      expect(beforeImg).toBeInTheDocument();
      expect(beforeImg).toHaveAttribute('src', '/demo-photos/mat_duong/1.jpg');

      // Ô sau chưa có ảnh
      expect(screen.getByText('Chưa có ảnh sau xử lý')).toBeInTheDocument();

      // Khi có ảnh sau -> hiện ảnh với alt "Sau xử lý"
      rerender(
        <BeforeAfter
          beforePhotos={['/demo-photos/mat_duong/1.jpg']}
          afterPhotos={['/demo-photos/after/mat_duong.jpg']}
        />
      );
      expect(screen.getByAltText('Sau xử lý')).toBeInTheDocument();
    });
  });

  describe('CategoryTile', () => {
    it('có aria-pressed, chọn bằng bàn phím/click, có ✓ khi chọn', () => {
      const handleSelect = vi.fn();
      const { rerender } = render(
        <CategoryTile category="mat_duong" selected={false} onSelect={handleSelect} />
      );

      const tile = screen.getByRole('button', { name: /Mặt đường/i });
      expect(tile).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(tile);
      expect(handleSelect).toHaveBeenCalledWith('mat_duong');

      // Khi selected = true
      rerender(<CategoryTile category="mat_duong" selected={true} onSelect={handleSelect} />);
      expect(tile).toHaveAttribute('aria-pressed', 'true');
      // Có dấu check ✓
      expect(tile.querySelector('svg.check-icon')).toBeInTheDocument();
    });
  });

  describe('LocationRow', () => {
    it('hiển thị địa chỉ và có nút "Đổi" khi truyền onChange', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <LocationRow
          address="125 Đường Cách Mạng Tháng Tám"
          distanceMeters={250}
          onChange={handleChange}
        />
      );

      expect(screen.getByText(/125 Đường Cách Mạng Tháng Tám/)).toBeInTheDocument();
      expect(screen.getByText(/250 m/)).toBeInTheDocument();

      const changeBtn = screen.getByRole('button', { name: 'Đổi' });
      fireEvent.click(changeBtn);
      expect(handleChange).toHaveBeenCalledTimes(1);

      // Không truyền onChange -> không có nút "Đổi"
      rerender(<LocationRow address="125 Đường Cách Mạng Tháng Tám" distanceMeters={250} />);
      expect(screen.queryByRole('button', { name: 'Đổi' })).not.toBeInTheDocument();
    });
  });

  describe('LatestUpdate', () => {
    it('render câu cập nhật mới nhất từ formatLatestUpdate', () => {
      const report: Report = {
        id: 'TB-0001',
        category: 'mat_duong',
        photos: [],
        photosApproved: true,
        lat: 10.95,
        lng: 106.82,
        address: '123 CMT8',
        createdAt: '2026-11-20T08:00:00+07:00',
        status: 'moi',
        priority: 'binh_thuong',
        department: '',
        secretCode: '1234',
        followers: [],
        anonymous: false,
        subscribedLater: false,
        onBehalf: false,
        anonymousFollows: 0,
        timeline: [],
      };

      render(<LatestUpdate report={report} now="2026-11-24T09:00:00+07:00" />);
      expect(screen.getByText('Cập nhật mới nhất')).toBeInTheDocument();
      expect(
        screen.getByText(/Phường đã nhận phản ánh và sẽ xem xét trong ngày làm việc/i)
      ).toBeInTheDocument();
    });
  });

  describe('ReportCard', () => {
    it('hiện ảnh, loại, mã, StatusChip, câu cập nhật 1 dòng', () => {
      const report: Report = {
        id: 'TB-0009',
        category: 'den_duong',
        photos: ['/demo-photos/den_duong/1.jpg'],
        photosApproved: true,
        lat: 10.95,
        lng: 106.82,
        address: '45 Đường Nguyễn Ái Quốc',
        createdAt: '2026-11-21T08:00:00+07:00',
        status: 'da_giao',
        priority: 'binh_thuong',
        department: 'Phòng KT-HT&ĐT – Đội chiếu sáng công cộng',
        dueAt: '2026-11-24T17:00:00+07:00',
        secretCode: '1234',
        followers: ['0909000068'],
        anonymous: false,
        subscribedLater: false,
        onBehalf: false,
        anonymousFollows: 0,
        timeline: [],
      };

      render(<ReportCard report={report} now="2026-11-24T09:00:00+07:00" />);

      // Mã hồ sơ
      expect(screen.getByText('TB-0009')).toBeInTheDocument();
      // Loại
      expect(screen.getByText('Đèn đường')).toBeInTheDocument();
      // StatusChip
      expect(screen.getByText('Đang xử lý')).toBeInTheDocument();
      // Địa chỉ
      expect(screen.getByText(/45 Đường Nguyễn Ái Quốc/)).toBeInTheDocument();
      // Ảnh
      const img = screen.getByAltText(/TB-0009/);
      expect(img).toHaveAttribute('src', '/demo-photos/den_duong/1.jpg');
      // Câu cập nhật 1 dòng
      expect(screen.getByText(/đang xử lý\. Dự kiến xong trước/i)).toBeInTheDocument();
    });
  });
});
