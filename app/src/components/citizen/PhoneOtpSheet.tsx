import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export interface PhoneOtpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phone: string) => void;
  initialPhone?: string;
  title?: string;
}

export const PhoneOtpSheet: React.FC<PhoneOtpSheetProps> = ({
  isOpen,
  onClose,
  onVerified,
  initialPhone = '',
  title = 'Xác thực số điện thoại',
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  const validatePhone = (p: string): boolean => {
    const clean = p.replace(/\s+/g, '');
    if (!/^\d{10}$/.test(clean)) {
      setPhoneError('Số điện thoại gồm 10 chữ số (ví dụ: 0909000068)');
      return false;
    }
    if (!/^(03|05|07|08|09)\d{8}$/.test(clean)) {
      setPhoneError('Số điện thoại không hợp lệ (cần đầu số 03, 05, 07, 08, 09)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePhone(phone)) {
      setPhoneError('');
      setStep('otp');
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp !== '123456') {
      setOtpError('Mã OTP không đúng (thử mã mô phỏng: 123456)');
      return;
    }
    setOtpError('');
    onVerified(phone.replace(/\s+/g, ''));
    onClose();
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setOtpError('');
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {step === 'otp' && (
            <button
              type="button"
              onClick={handleBackToPhone}
              className="mr-1 rounded-full p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Đổi số điện thoại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span>{title}</span>
        </div>
      }
      footer={
        step === 'phone' ? (
          <Button fullWidth onClick={handleRequestOtp}>
            Tiếp tục
          </Button>
        ) : (
          <Button fullWidth onClick={handleVerifyOtp}>
            Xác nhận
          </Button>
        )
      }
    >
      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4 py-2">
          <TextField
            label="Số điện thoại"
            type="tel"
            inputMode="numeric"
            placeholder="0909 000 068"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) setPhoneError('');
            }}
            error={phoneError}
            autoFocus
          />

          {/* Dòng cam kết bảo mật riêng tư */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
            <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              Số điện thoại <span className="font-semibold">chỉ dùng để báo tin cho bạn</span> khi
              có cập nhật, không hiển thị công khai.
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Mã xác thực đã gửi tới <strong className="text-gray-900">{phone}</strong>
            </span>
            <span className="rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
              Mô phỏng
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            💡 <strong>Mô phỏng:</strong> Nhập mã OTP là <strong>123456</strong> để tiếp tục.
          </div>

          <TextField
            label="Mã OTP"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value);
              if (otpError) setOtpError('');
            }}
            error={otpError}
            autoFocus
          />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setOtp('123456')}
              className="text-xs font-medium text-primary hover:underline"
            >
              Tự động điền mã 123456
            </button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
};
