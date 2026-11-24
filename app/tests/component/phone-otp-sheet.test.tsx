import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';

describe('CT-036 – PhoneOtpSheet', () => {
  it('có dòng cam kết bảo mật, SĐT 9 số báo lỗi, 0909000068 mở OTP, OTP sai báo lỗi, 123456 thành công và có nhãn Mô phỏng', () => {
    const handleVerified = vi.fn();
    const handleClose = vi.fn();

    render(<PhoneOtpSheet isOpen={true} onClose={handleClose} onVerified={handleVerified} />);

    // Có dòng cam kết riêng tư: "chỉ dùng để báo tin cho bạn…"
    expect(screen.getByText(/chỉ dùng để báo tin cho bạn/i)).toBeInTheDocument();

    const phoneInput = screen.getByLabelText(/Số điện thoại/i);
    const continueBtn = screen.getByRole('button', { name: /Tiếp tục|Nhận mã OTP/i });

    // 1. Nhập SĐT 9 số -> báo lỗi
    fireEvent.change(phoneInput, { target: { value: '090900006' } });
    fireEvent.click(continueBtn);
    expect(screen.getByText(/Số điện thoại gồm 10 chữ số|không hợp lệ/i)).toBeInTheDocument();

    // 2. Nhập SĐT hợp lệ 0909000068 -> chuyển sang bước OTP
    fireEvent.change(phoneInput, { target: { value: '0909000068' } });
    fireEvent.click(continueBtn);

    // Có nhãn "Mô phỏng"
    expect(screen.getAllByText(/Mô phỏng/i).length).toBeGreaterThan(0);

    // Ô nhập OTP
    const otpInput = screen.getByLabelText(/Mã OTP|Mã xác thực/i);
    const verifyBtn = screen.getByRole('button', { name: /Xác nhận|Xác thực/i });

    // 3. Nhập OTP sai -> báo lỗi
    fireEvent.change(otpInput, { target: { value: '999999' } });
    fireEvent.click(verifyBtn);
    expect(screen.getByText(/Mã OTP không đúng/i)).toBeInTheDocument();
    expect(handleVerified).not.toHaveBeenCalled();

    // 4. Nhập 123456 -> gọi onVerified với 0909000068
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(verifyBtn);
    expect(handleVerified).toHaveBeenCalledWith('0909000068');
  });
});
