import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackingLinkCard } from '@/components/citizen/TrackingLinkCard';
import { SubscribeCard } from '@/components/citizen/SubscribeCard';
import { RatingSheet } from '@/components/citizen/RatingSheet';
import * as shareLib from '@/lib/share';

describe('CT-039 & CT-039b – TrackingLinkCard, SubscribeCard và RatingSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CT-039 – TrackingLinkCard', () => {
    it('hiển thị mã bí mật >= 28px, render ảnh QR mã hoá url chứa ?k=', async () => {
      render(
        <TrackingLinkCard
          reportId="TB-0065"
          secretCode="4821"
          origin="http://localhost"
          showSecretDefault={true}
        />
      );

      // Mã bí mật hiển thị rõ và có font size lớn
      const codeEl = screen.getByText('4821');
      expect(codeEl).toBeInTheDocument();
      expect(codeEl.className).toMatch(/text-3xl|text-4xl/);

      // QR image
      const qrImg = await screen.findByRole('img', { name: /Mã QR theo dõi phản ánh/i });
      expect(qrImg).toBeInTheDocument();
      // QR image src phải là data URL
      expect(qrImg.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    });

    it('nút "Lưu link" gọi shareOrCopy và hiển thị thông báo "Đã sao chép link"', async () => {
      const shareSpy = vi.spyOn(shareLib, 'shareOrCopy').mockResolvedValue('copied');

      render(<TrackingLinkCard reportId="TB-0065" secretCode="4821" origin="http://localhost" />);

      const saveBtn = screen.getByRole('button', { name: /Lưu link/i });
      fireEvent.click(saveBtn);

      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost/phan-anh/TB-0065?k=4821',
        })
      );

      await waitFor(() => {
        expect(screen.getByText(/Đã sao chép link/i)).toBeInTheDocument();
      });
    });

    it('hỗ trợ ẩn/hiện mã bí mật khi showSecretDefault=false', () => {
      render(
        <TrackingLinkCard
          reportId="TB-0065"
          secretCode="4821"
          origin="http://localhost"
          showSecretDefault={false}
        />
      );

      // Mặc định ẩn
      expect(screen.queryByText('4821')).not.toBeInTheDocument();
      expect(screen.getByText('••••')).toBeInTheDocument();

      // Bấm nút "Hiện"
      const toggleBtn = screen.getByRole('button', { name: /Hiện/i });
      fireEvent.click(toggleBtn);

      expect(screen.getByText('4821')).toBeInTheDocument();
    });
  });

  describe('CT-039 – SubscribeCard', () => {
    it('khi chưa có SĐT: mở OTP khi bấm nhận tin, xác thực thành công gọi onSubscribe', async () => {
      const handleSubscribe = vi.fn();
      render(<SubscribeCard reportId="TB-0065" onSubscribe={handleSubscribe} />);

      // Thẻ có nội dung mời nhận tin báo
      expect(screen.getByText('Nhận tin báo cho phản ánh này')).toBeInTheDocument();
      expect(screen.getByText(/Số điện thoại chỉ dùng cho phản ánh này/i)).toBeInTheDocument();

      // Bấm nút nhận tin báo
      const btn = screen.getByRole('button', { name: /Nhận tin báo/i });
      fireEvent.click(btn);

      // PhoneOtpSheet mở ra
      expect(screen.getByText('Xác thực số điện thoại')).toBeInTheDocument();

      // Nhập SĐT hợp lệ
      const phoneInput = screen.getByLabelText(/Số điện thoại/i);
      fireEvent.change(phoneInput, { target: { value: '0909000068' } });

      const continueBtn = screen.getByRole('button', { name: /Tiếp tục/i });
      fireEvent.click(continueBtn);

      // Màn OTP
      expect(screen.getByLabelText(/Mã OTP/i)).toBeInTheDocument();
      const otpInput = screen.getByLabelText(/Mã OTP/i);
      fireEvent.change(otpInput, { target: { value: '123456' } });

      const verifyBtn = screen.getByRole('button', { name: /Xác nhận/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(handleSubscribe).toHaveBeenCalledWith('0909000068');
      });
    });

    it('khi đã đăng ký: hiển thị "Đang nhận tin qua 0909 *** 068 · Huỷ" và bấm Huỷ gọi onUnsubscribe', () => {
      const handleUnsubscribe = vi.fn();
      render(
        <SubscribeCard
          reportId="TB-0065"
          currentPhone="0909000068"
          onSubscribe={vi.fn()}
          onUnsubscribe={handleUnsubscribe}
        />
      );

      expect(screen.getByText(/0909 \*\*\* 068/)).toBeInTheDocument();
      expect(screen.getByText(/Đang nhận tin qua/i)).toBeInTheDocument();
      const cancelBtn = screen.getByRole('button', { name: /Huỷ/i });
      expect(cancelBtn).toBeInTheDocument();

      fireEvent.click(cancelBtn);
      expect(handleUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('CT-039b – RatingSheet', () => {
    it('hiển thị đầy đủ thông điệp, 5 sao có nhãn chữ, chip theo số sao, tắt nút khi chưa chọn sao', () => {
      const handleSubmit = vi.fn();
      const handleClose = vi.fn();

      render(<RatingSheet isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />);

      // Kiểm tra tiêu đề và phụ đề
      expect(screen.getByText('Bạn thấy kết quả thế nào?')).toBeInTheDocument();
      expect(screen.getByText(/Chưa đến 30 giây/i)).toBeInTheDocument();

      // Nút "Gửi đánh giá" ban đầu bị disabled
      const submitBtn = screen.getByRole('button', { name: /Gửi đánh giá/i });
      expect(submitBtn).toBeDisabled();

      // Chọn 5 sao
      const star5 = screen.getByRole('button', { name: /5 sao/i });
      fireEvent.click(star5);

      // Nhãn chữ "Rất hài lòng" hiển thị
      expect(screen.getByText('Rất hài lòng')).toBeInTheDocument();
      // Nút submit giờ đã enable
      expect(submitBtn).not.toBeDisabled();

      // Hiển thị các chip tích cực (AC-C06-5)
      expect(screen.getByText('Xử lý nhanh')).toBeInTheDocument();
      expect(screen.getByText('Sạch sẽ, gọn gàng')).toBeInTheDocument();

      // Chọn 1 chip
      fireEvent.click(screen.getByText('Xử lý nhanh'));

      // Đổi sang 2 sao -> nhãn "Không hài lòng", đổi sang bộ chip chưa tốt
      const star2 = screen.getByRole('button', { name: /2 sao/i });
      fireEvent.click(star2);

      expect(screen.getByText('Không hài lòng')).toBeInTheDocument();
      expect(screen.getByText('Xử lý chậm')).toBeInTheDocument();
      expect(screen.getByText('Chưa triệt để')).toBeInTheDocument();

      // Chọn chip "Xử lý chậm" và nhập ý kiến
      fireEvent.click(screen.getByText('Xử lý chậm'));
      const commentInput = screen.getByPlaceholderText(/góp ý|làm tốt hơn/i);
      fireEvent.change(commentInput, { target: { value: 'Cần dọn sạch hơn một chút' } });

      // Bấm gửi đánh giá
      fireEvent.click(submitBtn);

      expect(handleSubmit).toHaveBeenCalledWith({
        rating: 2,
        tags: ['Xử lý chậm'],
        comment: 'Cần dọn sạch hơn một chút',
      });
    });
  });
});
