import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import { Report } from '@/domain/types';
import { CitizenAccountRecord, findAccountByPhone, saveAccountRecord } from '@/lib/accounts';
import { Toast } from '@/components/ui/Toast';

export type PortalAccent = 'sky' | 'emerald' | 'blue';

export interface PortalMockAccount {
  name: string;
  subtitle: string;
  address: string;
  phone: string;
}

export interface PortalAuthFlowProps {
  portalLabel: string;
  roleSummary?: string;
  accent?: PortalAccent;
  defaultAddress?: string;
  addressLabel?: string;
  addressPlaceholder?: string;
  reports?: Report[];
  mockAccounts?: PortalMockAccount[];
  onCancel?: () => void;
  onAuthenticated: (record: CitizenAccountRecord) => void;
}

const ACCENT_MAP: Record<PortalAccent, { badge: string; btn: string; ring: string; icon: string }> =
  {
    sky: {
      badge: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
      ring: 'focus:border-sky-500 focus:ring-sky-500/20',
      icon: 'text-sky-600 dark:text-sky-400',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
      ring: 'focus:border-emerald-500 focus:ring-emerald-500/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
      ring: 'focus:border-blue-500 focus:ring-blue-500/20',
      icon: 'text-blue-600 dark:text-blue-400',
    },
  };

export function PortalAuthFlow({
  portalLabel,
  roleSummary,
  accent = 'sky',
  defaultAddress = 'P. Trấn Biên',
  addressLabel = 'Địa bàn / Đơn vị',
  addressPlaceholder = 'VD: Khu phố 3, P. Trấn Biên',
  reports = [],
  mockAccounts,
  onCancel,
  onAuthenticated,
}: PortalAuthFlowProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 2600);
  };
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState(defaultAddress);

  const palette = ACCENT_MAP[accent];

  useEffect(() => {
    const isOtp = step === 'otp' || step === 'register';
    if (isOtp) {
      document.documentElement.setAttribute('data-otp-open', 'true');
    } else {
      document.documentElement.removeAttribute('data-otp-open');
    }
    return () => {
      document.documentElement.removeAttribute('data-otp-open');
    };
  }, [step]);

  const handleSendOtp = () => {
    const clean = phoneInput.replace(/\D/g, '');
    if (clean.length < 9 || clean.length > 11) {
      showToast('Vui lòng nhập số điện thoại hợp lệ (9–11 số)');
      return;
    }
    setOtpInput('');
    setStep('otp');
    showToast('Mã OTP demo: 123456');
  };

  const handleVerifyOtp = () => {
    if (otpInput.replace(/\D/g, '').length !== 6) {
      showToast('Vui lòng nhập đủ 6 số OTP');
      return;
    }
    const cleanPhone = phoneInput.replace(/\D/g, '');
    const existing = findAccountByPhone(cleanPhone, reports);
    if (existing) {
      saveAccountRecord(existing);
      showToast('Đăng nhập thành công');
      onAuthenticated(existing);
      return;
    }
    setRegName('');
    setRegAddress(defaultAddress);
    setStep('register');
  };

  const handleCompleteRegister = () => {
    const cleanPhone = phoneInput.replace(/\D/g, '');
    const trimmedName = regName.trim();
    const trimmedAddress = regAddress.trim() || defaultAddress;
    if (trimmedName.length < 2) {
      showToast('Vui lòng nhập họ và tên');
      return;
    }
    const record: CitizenAccountRecord = {
      phone: cleanPhone,
      name: trimmedName,
      address: trimmedAddress,
      createdAt: new Date().toISOString(),
    };
    saveAccountRecord(record);
    showToast('Tạo tài khoản thành công');
    onAuthenticated(record);
  };

  return (
    <div className="mx-auto w-full max-w-md animate-fade-up py-4">
      {toastMsg && (
        <div className="mb-3">
          <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
        </div>
      )}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          {(step !== 'phone' || onCancel) && (
            <button
              type="button"
              onClick={() => {
                if (step === 'otp') setStep('phone');
                else if (step === 'register') setStep('otp');
                else onCancel?.();
              }}
              aria-label="Quay lại"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors duration-150 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${palette.badge}`}
            >
              <ShieldCheck className="h-3 w-3" />
              {portalLabel}
            </span>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {step === 'phone' && 'Đăng nhập tài khoản'}
              {step === 'otp' && 'Xác thực OTP'}
              {step === 'register' && 'Hoàn tất hồ sơ'}
            </h2>
            {step === 'phone' && roleSummary && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{roleSummary}</p>
            )}
          </div>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            {mockAccounts && mockAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Chọn nhanh tài khoản demo
                </div>
                <div className="space-y-1.5">
                  {mockAccounts.map((acc) => (
                    <button
                      key={acc.phone}
                      type="button"
                      onClick={() => {
                        const record: CitizenAccountRecord = {
                          phone: acc.phone,
                          name: acc.name,
                          address: acc.address,
                          createdAt: new Date().toISOString(),
                        };
                        saveAccountRecord(record);
                        onAuthenticated(record);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-left transition-all duration-150 hover:border-sky-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-sky-700 dark:hover:bg-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {acc.name}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {acc.subtitle}
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-bold ${palette.icon}`}>
                        Vào ngay ›
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative py-1 text-center text-[11px] font-medium text-slate-400">
                  <span className="bg-white px-2 dark:bg-slate-900">hoặc đăng nhập SĐT</span>
                </div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  placeholder="0912 345 678"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all duration-150 focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800 ${palette.ring}`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              className={`btn-primary-action w-full rounded-xl px-4 text-sm font-bold shadow-sm transition-all duration-150 active:scale-[0.98] ${palette.btn}`}
            >
              Tiếp tục
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs dark:bg-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Mã gửi đến {phoneInput}</span>
              <span className={`font-bold ${palette.icon}`}>Demo: 123456</span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Mã xác thực 6 số
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="••••••"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none transition-all duration-150 focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800 ${palette.ring}`}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOtpInput('123456')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Điền nhanh
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                className={`btn-primary-action flex-1 rounded-xl px-4 text-sm font-bold shadow-sm transition-all duration-150 active:scale-[0.98] ${palette.btn}`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}

        {step === 'register' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Họ và tên
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all duration-150 focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${palette.ring}`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {addressLabel}
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder={addressPlaceholder}
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all duration-150 focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${palette.ring}`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteRegister}
              className={`btn-primary-action flex w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition-all duration-150 active:scale-[0.98] ${palette.btn}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Hoàn tất đăng ký
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
