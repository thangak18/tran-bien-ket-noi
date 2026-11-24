import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Tabs } from '@/components/ui/Tabs';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Camera, AlertCircle } from 'lucide-react';

describe('CT-030 – UI Kit Components', () => {
  describe('Button', () => {
    it('render text và xử lý click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Báo sự cố</Button>);
      const btn = screen.getByRole('button', { name: 'Báo sự cố' });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('bắt buộc aria-label khi icon-only', () => {
      render(
        <Button aria-label="Chụp ảnh">
          <Camera />
        </Button>
      );
      expect(screen.getByRole('button', { name: 'Chụp ảnh' })).toBeInTheDocument();
    });

    it('disabled ngăn click', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Tiếp tục
        </Button>
      );
      const btn = screen.getByRole('button', { name: 'Tiếp tục' });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Card', () => {
    it('render nội dung bên trong card', () => {
      render(
        <Card className="test-card">
          <p>Nội dung thẻ</p>
        </Card>
      );
      expect(screen.getByText('Nội dung thẻ')).toBeInTheDocument();
    });
  });

  describe('BottomSheet', () => {
    it('có tay nắm drag handle, nút chính cố định đáy và đóng khi click nút đóng/overlay', () => {
      const handleClose = vi.fn();
      render(
        <BottomSheet
          isOpen={true}
          onClose={handleClose}
          title="Chọn loại phản ánh"
          footer={<Button>Xác nhận</Button>}
        >
          <p>Danh sách lựa chọn</p>
        </BottomSheet>
      );

      // Có tiêu đề
      expect(screen.getByText('Chọn loại phản ánh')).toBeInTheDocument();
      // Có tay nắm (data-testid="drag-handle")
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
      // Nút chính cố định đáy
      expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeInTheDocument();

      // Click nút đóng
      const closeBtn = screen.getByLabelText('Đóng');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    it('không render khi isOpen = false', () => {
      render(
        <BottomSheet isOpen={false} onClose={() => {}} title="Sheet ẩn">
          <p>Nội dung ẩn</p>
        </BottomSheet>
      );
      expect(screen.queryByText('Sheet ẩn')).not.toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('giữ role="dialog", aria-modal="true" và đóng khi bấm Esc', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Xác nhận huỷ">
          <p>Bạn có chắc chắn muốn huỷ bản nháp?</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Bấm Esc
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast', () => {
    it('có role="status" và hiển thị thông điệp', () => {
      render(<Toast message="Đã sao chép link theo dõi" type="success" />);
      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
      expect(screen.getByText('Đã sao chép link theo dõi')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('hiển thị danh sách tab có số đếm và chuyển tab', () => {
      const tabs = [
        { id: 'all', label: 'Tất cả', count: 64 },
        { id: 'done', label: 'Đã xử lý', count: 47 },
        { id: 'pending', label: 'Chưa xong', count: 17 },
      ];

      const Wrapper = () => {
        const [active, setActive] = useState('all');
        return <Tabs tabs={tabs} activeTab={active} onChange={setActive} />;
      };

      render(<Wrapper />);

      expect(screen.getByText('Tất cả')).toBeInTheDocument();
      expect(screen.getByText('64')).toBeInTheDocument();
      expect(screen.getByText('47')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Đã xử lý'));
      expect(screen.getByRole('tab', { name: /Đã xử lý/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('Chip', () => {
    it('render icon + chữ và toggle trạng thái', () => {
      const handleClick = vi.fn();
      render(
        <Chip
          icon={<AlertCircle data-testid="chip-icon" />}
          label="Mặt đường"
          selected={true}
          onClick={handleClick}
        />
      );

      expect(screen.getByText('Mặt đường')).toBeInTheDocument();
      expect(screen.getByTestId('chip-icon')).toBeInTheDocument();
      const chip = screen.getByRole('button', { name: /Mặt đường/ });
      fireEvent.click(chip);
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('TextField', () => {
    it('render label, helperText, error và nhận input', () => {
      const handleChange = vi.fn();
      render(
        <TextField
          label="Số điện thoại"
          value=""
          onChange={handleChange}
          error="Số điện thoại không hợp lệ"
          helperText="Dùng để nhận tin báo tiến độ"
        />
      );

      expect(screen.getByLabelText('Số điện thoại')).toBeInTheDocument();
      expect(screen.getByText('Số điện thoại không hợp lệ')).toBeInTheDocument();
      expect(screen.getByText('Dùng để nhận tin báo tiến độ')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('render minh hoạ, tiêu đề, mô tả và nút hành động', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          icon={<AlertCircle data-testid="empty-icon" />}
          title="Chưa có phản ánh nào"
          description="Bạn chưa gửi phản ánh nào từ thiết bị này."
          actionText="Báo sự cố ngay"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('Chưa có phản ánh nào')).toBeInTheDocument();
      expect(screen.getByText('Bạn chưa gửi phản ánh nào từ thiết bị này.')).toBeInTheDocument();
      expect(screen.getByTestId('empty-icon')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Báo sự cố ngay' });
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
