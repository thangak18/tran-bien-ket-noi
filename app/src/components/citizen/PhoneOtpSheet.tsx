import React, { useRef, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowLeft, Smartphone } from 'lucide-react';

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
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6 - index && i < clean.length; i++) {
        next[index + i] = clean[i] ?? '';
      }
      setOtpDigits(next);
      if (otpError) setOtpError('');
      const focusIdx = Math.min(5, index + clean.length);
      otpRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = clean.slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (otpError) setOtpError('');
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpDigits.join('').trim();
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
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
  };

  const last4Phone = (phone.replace(/\D/g, '') || '0068').slice(-4);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {step === 'otp' && (
              <button
                type="button"
                onClick={handleBackToPhone}
                className="mr-1 rounded-xl bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200"
                aria-label="Đổi số điện thoại"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span>{step === 'otp' ? 'Nhập mã xác thực' : title}</span>
          </div>
          {step === 'otp' && (
            <span className="rounded-full bg-[#E6F3FD] px-2.5 py-0.5 text-xs font-bold text-[#0084E8]">
              Mô phỏng
            </span>
          )}
        </div>
      }
      footer={
        step === 'phone' ? (
          <Button fullWidth onClick={handleRequestOtp}>
            Tiếp tục
          </Button>
        ) : (
          <Button fullWidth onClick={handleVerifyOtp}>
            Xác nhận &amp; Đăng nhập
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
        <form onSubmit={handleVerifyOtp} className="space-y-4 py-3 text-center">
          {/* Blue Smartphone Rounded Square Icon with Soft Glow (Image 4) */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-[0_8px_24px_rgba(0,132,232,0.35)]">
            <Smartphone className="h-7 w-7" strokeWidth={2} />
          </div>

          <div className="space-y-1">
            <div className="text-lg font-extrabold text-[var(--color-text)]">Nhập mã xác thực</div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Mã 6 số đã gửi tới{' '}
              <strong className="text-[var(--color-text)]">•••• {last4Phone}</strong>
            </p>
          </div>

          {/* 6 individual OTP boxes split 3 - 3 matching Image 4 */}
          <div className="flex items-center justify-center gap-1.5">
            {otpDigits.map((digit, idx) => (
              <React.Fragment key={idx}>
                {idx === 3 && (
                  <span className="px-0.5 text-base font-bold text-slate-300 select-none">–</span>
                )}
                <input
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  aria-label={idx === 0 ? 'Mã OTP' : `Chữ số thứ ${idx + 1}`}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="h-[52px] w-[42px] rounded-2xl border border-slate-300 bg-[var(--color-surface)] text-center text-lg font-extrabold text-[var(--color-text)] focus:border-2 focus:border-[#0084E8] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/25"
                />
              </React.Fragment>
            ))}
          </div>

          {otpError && <p className="text-xs font-medium text-red-600">{otpError}</p>}

          <div className="text-xs text-[var(--color-text-muted)]">
            Gửi lại mã sau 2:59 · Mã demo:{' '}
            <strong className="text-[var(--color-text)]">123456</strong>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setOtpDigits(['1', '2', '3', '4', '5', '6'])}
              className="text-xs font-semibold text-[#0084E8] hover:underline"
            >
              Tự động điền mã 123456
            </button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
};
