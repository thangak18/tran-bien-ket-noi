import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Hash,
  Headphones,
  KeyRound,
  LogOut,
  MapPin,
  Moon,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Type,
  User,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { filterMyReports, getMyReports, lookupReportByCode } from '@/domain/access';
import { computeKpi } from '@/domain/kpi';
import { maskPhone } from '@/domain/privacy';
import { formatDateTime, formatDays } from '@/domain/format';
import { FontScale, Notification } from '@/domain/types';
import { applyFontScale, FONT_SCALE_OPTIONS, resolveFontScale } from '@/lib/senior';
import {
  CITIZEN_ADDRESS_STORAGE_KEY,
  CITIZEN_NAME_STORAGE_KEY,
  findAccountByPhone,
  saveAccountRecord,
} from '@/lib/accounts';
import { SmsPreview } from '@/components/citizen/SmsPreview';
import { HotlineModal } from '@/components/common/HotlineModal';
import { Button, Modal, Toast } from '@/components/ui';

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  const saved = window.localStorage.getItem('tbkn:theme');
  return saved === 'dark' ? 'dark' : 'light';
}

function getInitialCitizenName(): string {
  if (typeof window === 'undefined') return 'Công dân Trấn Biên';
  const saved = window.localStorage.getItem(CITIZEN_NAME_STORAGE_KEY);
  return saved && saved.trim().length > 0 ? saved.trim() : 'Công dân Trấn Biên';
}

function getInitialCitizenAddress(): string {
  if (typeof window === 'undefined') return 'P. Trấn Biên';
  const saved = window.localStorage.getItem(CITIZEN_ADDRESS_STORAGE_KEY);
  return saved && saved.trim().length > 0 ? saved.trim() : 'P. Trấn Biên';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CD';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function formatDisplayPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return rawPhone;
}

export function C05Mine() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const now = state.settings.demoNow;

  const [citizenName, setCitizenName] = useState<string>(getInitialCitizenName);
  const [citizenAddress, setCitizenAddress] = useState<string>(getInitialCitizenAddress);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(citizenName);
  const [addressDraft, setAddressDraft] = useState(citizenAddress);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phoneInput, setPhoneInput] = useState(state.settings.phone ?? '');
  const [phoneError, setPhoneError] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerError, setRegisterError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPin, setLookupPin] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (otpOpen) {
      document.documentElement.setAttribute('data-otp-open', 'true');
    } else {
      document.documentElement.removeAttribute('data-otp-open');
    }
    return () => {
      document.documentElement.removeAttribute('data-otp-open');
    };
  }, [otpOpen]);

  const currentMonth = now.slice(0, 7);
  const kpi = useMemo(
    () => computeKpi(state.reports, currentMonth, now),
    [state.reports, currentMonth, now]
  );

  const accessContext = useMemo(
    () => ({
      phone: state.settings.phone,
      deviceReports: state.settings.deviceReports,
    }),
    [state.settings.phone, state.settings.deviceReports]
  );

  const myReports = useMemo(
    () => getMyReports(state.reports, accessContext),
    [state.reports, accessContext]
  );

  const myNotifications = useMemo(() => {
    const myIds = new Set(myReports.map((r) => r.id));
    return state.notifications.filter(
      (n) => (state.settings.phone && n.phone === state.settings.phone) || myIds.has(n.reportId)
    );
  }, [state.notifications, state.settings.phone, myReports]);

  const counts = useMemo(
    () => ({
      all: myReports.length,
      processing: filterMyReports(myReports, 'processing').length,
      resolved: filterMyReports(myReports, 'resolved').length,
    }),
    [myReports]
  );

  const handleSaveCitizenName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameDraft.trim() || 'Công dân Trấn Biên';
    const trimmedAddress = addressDraft.trim() || 'P. Trấn Biên';
    setCitizenName(trimmedName);
    setCitizenAddress(trimmedAddress);
    setNameDraft(trimmedName);
    setAddressDraft(trimmedAddress);
    setIsEditingName(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CITIZEN_NAME_STORAGE_KEY, trimmedName);
      window.localStorage.setItem(CITIZEN_ADDRESS_STORAGE_KEY, trimmedAddress);
    }
    if (state.settings.phone) {
      saveAccountRecord({
        phone: state.settings.phone,
        name: trimmedName,
        address: trimmedAddress,
        createdAt: new Date().toISOString(),
      });
    }
    setToastMsg('Đã cập nhật hồ sơ cá nhân');
  };

  const handleOpenChangePhone = () => {
    setPhoneInput(state.settings.phone ? formatDisplayPhone(state.settings.phone) : '');
    setPhoneError('');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setOtpStep('phone');
    setOtpOpen(true);
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanDigits = value.replace(/\D/g, '');
    if (cleanDigits.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6 - index && i < cleanDigits.length; i++) {
        next[index + i] = cleanDigits[i] ?? '';
      }
      setOtpDigits(next);
      if (otpError) setOtpError('');
      const focusIdx = Math.min(5, index + cleanDigits.length);
      otpRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = cleanDigits.slice(-1);
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

  const handleRequestOtpFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    const digits = phoneInput.replace(/\D/g, '');
    if (!/^(03|05|07|08|09)\d{8}$/.test(digits)) {
      setPhoneError('Vui lòng nhập số điện thoại 10 số hợp lệ (VD: 0909 000 068)');
      return;
    }
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setOtpStep('otp');
    setOtpOpen(true);
    window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (!/^\d{6}$/.test(code)) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã xác thực OTP');
      return;
    }
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (!cleanPhone) {
      setOtpError('Số điện thoại không hợp lệ');
      return;
    }
    const existing = findAccountByPhone(cleanPhone, state.reports);
    if (existing) {
      setCitizenName(existing.name);
      setCitizenAddress(existing.address);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CITIZEN_NAME_STORAGE_KEY, existing.name);
        window.localStorage.setItem(CITIZEN_ADDRESS_STORAGE_KEY, existing.address);
      }
      dispatch({ type: 'SET_SETTINGS', payload: { phone: cleanPhone } });
      setOtpOpen(false);
      setToastMsg(`Đã đăng nhập số ${maskPhone(cleanPhone)}`);
      return;
    }
    setRegisterName('');
    setRegisterAddress('');
    setRegisterError('');
    setOtpStep('register');
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = registerName.trim();
    const trimmedAddress = registerAddress.trim();
    if (!trimmedName) {
      setRegisterError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!trimmedAddress) {
      setRegisterError('Vui lòng nhập khu vực hoặc địa chỉ bạn đang sinh sống.');
      return;
    }
    const cleanPhone = phoneInput.replace(/\D/g, '');
    saveAccountRecord({
      phone: cleanPhone,
      name: trimmedName,
      address: trimmedAddress,
      createdAt: new Date().toISOString(),
    });
    setCitizenName(trimmedName);
    setCitizenAddress(trimmedAddress);
    dispatch({ type: 'SET_SETTINGS', payload: { phone: cleanPhone } });
    setOtpOpen(false);
    setToastMsg(`Chào mừng ${trimmedName}! Đăng ký thành công`);
  };

  const handleLookupCodeInput = (raw: string) => {
    if (lookupError) setLookupError('');
    // Nếu người dùng dán cả đường link theo dõi (VD: .../phan-anh/TB-0065?k=1234) thì tự tách mã và 4 số bí mật
    const urlMatch = raw.match(/(TB-\d{3,6})/i);
    const keyMatch = raw.match(/[?&]k=(\d{4})/);
    if (urlMatch && keyMatch) {
      setLookupCode(urlMatch[1]!.toUpperCase());
      setLookupPin(keyMatch[1]!);
      return;
    }
    setLookupCode(raw.toUpperCase());
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCode = lookupCode.trim().toUpperCase().replace(/^#/, '');
    // Tự động chuẩn hoá nếu người dùng chỉ nhập số (VD: "0001" hoặc "1" -> "TB-0001") hoặc "TB0001" -> "TB-0001"
    let normalizedCode = rawCode;
    if (/^\d{1,4}$/.test(rawCode)) {
      normalizedCode = `TB-${rawCode.padStart(4, '0')}`;
    } else if (/^TB\d{1,4}$/.test(rawCode)) {
      normalizedCode = `TB-${rawCode.slice(2).padStart(4, '0')}`;
    }

    const cleanPin = lookupPin.replace(/\D/g, '').slice(0, 4);
    if (!normalizedCode) {
      setLookupError('Vui lòng nhập mã phản ánh (VD: TB-0001).');
      return;
    }
    if (cleanPin.length !== 4) {
      setLookupError('Vui lòng nhập đủ 4 chữ số mã bí mật hoặc 4 số cuối SĐT.');
      return;
    }

    const found = lookupReportByCode(state.reports, normalizedCode, cleanPin);
    if (!found) {
      setLookupError('Không tìm thấy phản ánh khớp mã hồ sơ và 4 số xác nhận.');
      return;
    }

    setLookupError('');
    setLookupCode(found.id);
    const alreadyInDevice = state.settings.deviceReports.some((d) => d.id === found.id);
    if (!alreadyInDevice) {
      dispatch({
        type: 'SET_SETTINGS',
        payload: {
          deviceReports: [
            { id: found.id, secretCode: found.secretCode },
            ...state.settings.deviceReports,
          ],
        },
      });
    }
    navigate(`/phan-anh/${found.id}?k=${found.secretCode}`);
  };

  const handleToggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tbkn:theme', next);
    }
  };

  const activeFontScale = resolveFontScale(state.settings);
  const activeFontLabel =
    FONT_SCALE_OPTIONS.find((o) => o.id === activeFontScale)?.label ?? 'Thường';

  const handleSelectFontScale = (scale: FontScale) => {
    applyFontScale(scale);
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        fontScale: scale,
        seniorMode: scale === 'large' || scale === 'xlarge',
      },
    });
  };

  const handleLogout = () => {
    dispatch({ type: 'SET_SETTINGS', payload: { phone: undefined } });
    setPhoneInput('');
    setToastMsg('Đã đăng xuất số điện thoại');
  };

  const transparencyPercent = kpi.resolvedPercent.toFixed(1).replace('.', ',');
  const transparencyAvg = kpi.avgDays !== null ? formatDays(kpi.avgDays) : '—';
  const last4Phone = (phoneInput.replace(/\D/g, '') || '0000').slice(-4);
  const isLoggedIn = Boolean(state.settings.phone);

  // Fullscreen / Centered OTP Verification Screen (Clean, zero "Mô phỏng" or "Mã demo", no bottom navbar)
  if (otpOpen) {
    return (
      <div className="flex min-h-[100dvh] flex-1 flex-col bg-[var(--color-bg)] px-4 sm:px-6 pt-4 pb-10">
        <span data-testid="screen-title" className="sr-only">
          Phản ánh của tôi
        </span>

        {/* Top Header */}
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (otpStep === 'register') {
                setOtpStep('otp');
                setRegisterError('');
                return;
              }
              if (otpStep === 'otp') {
                setOtpStep('phone');
                setOtpError('');
                return;
              }
              setOtpOpen(false);
              setOtpError('');
              setPhoneError('');
            }}
            aria-label="Quay lại"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-surface)] px-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại</span>
          </button>
        </div>

        {otpStep === 'phone' ? (
          <form
            onSubmit={handleRequestOtpFromModal}
            className="mx-auto my-auto flex w-full max-w-md flex-col rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-6 sm:p-8 shadow-xl space-y-5 dark:border-slate-800"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-[0_8px_24px_rgba(0,132,232,0.3)]">
              <Phone className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
                Đăng nhập
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Nhập số điện thoại để đăng nhập hoặc đăng ký tài khoản mới
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="change-phone-input"
                className="block text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                Số điện thoại
              </label>
              <input
                id="change-phone-input"
                type="tel"
                inputMode="numeric"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                placeholder="Nhập 10 chữ số (VD: 0909 000 068)"
                autoFocus
                className="w-full rounded-2xl border border-slate-300 bg-[var(--color-surface)] px-4 py-3.5 text-base font-bold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 focus:border-[#0084E8] focus:outline-none focus:ring-4 focus:ring-[#0084E8]/15 dark:border-slate-700"
              />
              {phoneError && <p className="text-xs font-semibold text-red-600">{phoneError}</p>}
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0084E8] px-6 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4]"
            >
              Xác nhận
            </button>
          </form>
        ) : otpStep === 'otp' ? (
          <form
            onSubmit={handleVerifyOtp}
            className="mx-auto my-auto flex w-full max-w-md flex-col items-center rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-6 sm:p-8 text-center shadow-xl space-y-5 dark:border-slate-800"
          >
            {/* Rounded Square Blue Phone Badge with Glow */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-[0_10px_28px_rgba(0,132,232,0.38)]">
              <Smartphone className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
                Nhập mã xác thực
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mã xác thực 6 chữ số đã được gửi tới số{' '}
                <span className="font-extrabold text-[var(--color-text)]">•••• {last4Phone}</span>
              </p>
            </div>

            {/* 6 OTP Digit Boxes split 3 - 3 */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              {otpDigits.map((digit, idx) => (
                <React.Fragment key={idx}>
                  {idx === 3 && (
                    <span className="px-0.5 text-lg font-bold text-slate-300 select-none">–</span>
                  )}
                  <input
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    aria-label={`Mã OTP số ${idx + 1}`}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="h-[54px] w-[44px] sm:h-[58px] sm:w-[48px] rounded-2xl border border-slate-300 bg-[var(--color-surface)] text-center text-xl font-extrabold text-[var(--color-text)] transition focus:border-2 focus:border-[#0084E8] focus:outline-none focus:ring-4 focus:ring-[#0084E8]/15 dark:border-slate-700"
                  />
                </React.Fragment>
              ))}
            </div>

            {otpError && <p className="text-xs font-semibold text-red-600">{otpError}</p>}

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Chưa nhận được tin nhắn?</span>
              <button
                type="button"
                onClick={() => {
                  setOtpDigits(['', '', '', '', '', '']);
                  setOtpError('');
                  setToastMsg(`Đã gửi lại mã OTP tới số •••• ${last4Phone}`);
                  otpRefs.current[0]?.focus();
                }}
                className="font-extrabold text-[#0084E8] hover:underline dark:text-[#38BDF8]"
              >
                Gửi lại mã
              </button>
            </div>

            <button
              type="submit"
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#0084E8] px-6 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(0,132,232,0.32)] transition hover:bg-[#006EC4]"
            >
              Xác nhận &amp; Tiếp tục
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleCompleteRegistration}
            className="mx-auto my-auto flex w-full max-w-md flex-col rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-6 sm:p-8 shadow-xl space-y-4 dark:border-slate-800"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-[0_8px_24px_rgba(0,132,232,0.3)]">
              <User className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
                Đăng ký hồ sơ mới
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Số điện thoại chưa có tài khoản. Vui lòng cho biết thông tin của bạn:
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-name-input"
                className="block text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                Bạn tên gì?
              </label>
              <input
                id="register-name-input"
                type="text"
                maxLength={40}
                value={registerName}
                onChange={(e) => {
                  setRegisterName(e.target.value);
                  if (registerError) setRegisterError('');
                }}
                placeholder="VD: Nguyễn Văn An"
                autoFocus
                className="w-full rounded-2xl border border-slate-300 bg-[var(--color-surface)] px-4 py-3 text-sm font-bold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 focus:border-[#0084E8] focus:outline-none focus:ring-4 focus:ring-[#0084E8]/15 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-address-input"
                className="block text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              >
                Bạn sống ở đâu?
              </label>
              <input
                id="register-address-input"
                type="text"
                maxLength={80}
                value={registerAddress}
                onChange={(e) => {
                  setRegisterAddress(e.target.value);
                  if (registerError) setRegisterError('');
                }}
                placeholder="VD: KP 2, Đường Hà Huy Giáp, P. Trấn Biên"
                className="w-full rounded-2xl border border-slate-300 bg-[var(--color-surface)] px-4 py-3 text-sm font-bold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 focus:border-[#0084E8] focus:outline-none focus:ring-4 focus:ring-[#0084E8]/15 dark:border-slate-700"
              />
            </div>

            {registerError && <p className="text-xs font-semibold text-red-600">{registerError}</p>}

            <button
              type="submit"
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#0084E8] px-6 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(0,132,232,0.32)] transition hover:bg-[#006EC4]"
            >
              Hoàn tất đăng ký
            </button>
          </form>
        )}
      </div>
    );
  }

  // Trang Cài đặt ứng dụng riêng biệt trên giao diện Điện thoại (khi người dùng bấm nút Cài đặt ứng dụng)
  if (mobileSettingsOpen) {
    return (
      <div className="flex min-h-[calc(100dvh-80px)] flex-1 flex-col bg-[var(--color-bg)] pb-24 md:hidden">
        <span data-testid="screen-title" className="sr-only">
          Cài đặt ứng dụng
        </span>

        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-[var(--color-surface)] px-4 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMobileSettingsOpen(false)}
            aria-label="Quay lại Hồ sơ"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Hồ sơ</span>
          </button>

          <h1 className="text-base font-extrabold text-[var(--color-text)]">Cài đặt ứng dụng</h1>

          <div className="w-16" aria-hidden="true" />
        </header>

        {/* Settings List */}
        <div className="flex-1 space-y-4 px-4 pt-4">
          <div className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs space-y-3 dark:border-slate-800">
            <div className="px-1 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hiển thị &amp; Trải nghiệm
            </div>

            {/* Row 1: Giao diện (Sáng / Tối) */}
            <div className="flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-amber-300">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)]">
                    Giao diện (Sáng / Tối)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {theme === 'dark' ? 'Đang bật chế độ Tối' : 'Đang bật chế độ Sáng'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label="Chuyển giao diện sáng tối"
                onClick={handleToggleTheme}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-[#0084E8]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Row 2: Cỡ chữ 4 mức (Nhỏ / Thường / Lớn / Siêu lớn) */}
            <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0084E8] shadow-2xs dark:bg-slate-800 dark:text-[#38BDF8]">
                    <Type className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      Cỡ chữ hiển thị
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Đang chọn: {activeFontLabel}
                    </div>
                  </div>
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label="Chọn kích cỡ chữ"
                className="grid grid-cols-4 gap-1.5"
              >
                {FONT_SCALE_OPTIONS.map((opt) => {
                  const selected = activeFontScale === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleSelectFontScale(opt.id)}
                      className={`flex h-10 items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                        selected
                          ? 'bg-[#0084E8] text-white shadow-xs dark:bg-[#38BDF8] dark:text-slate-950'
                          : 'border border-slate-200/90 bg-white text-slate-600 hover:border-[#0084E8]/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs space-y-3 dark:border-slate-800">
            <div className="px-1 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Thông báo &amp; Định vị
            </div>

            {/* Row 3: Thông báo đẩy */}
            <div className="flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0084E8] shadow-2xs dark:bg-slate-800 dark:text-[#38BDF8]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)]">Thông báo đẩy</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {pushEnabled ? 'Nhận tin khi xử lý xong' : 'Đang tạm tắt'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushEnabled}
                aria-label="Bật tắt thông báo đẩy"
                onClick={() => setPushEnabled((p) => !p)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  pushEnabled ? 'bg-[#0084E8]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    pushEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Row 4: Định vị GPS */}
            <div className="flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs dark:bg-slate-800 dark:text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--color-text)]">Vị trí GPS</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Tự động định vị hiện trường
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Đang bật
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-24 md:pb-12">
      <span data-testid="screen-title" className="sr-only">
        Phản ánh của tôi
      </span>

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3.5 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              Hồ sơ
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content: Responsive 12-column grid for Mobile (1 col), Tablet & PC (5 + 7 cols) */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* =================================================================
              LEFT COLUMN (lg:col-span-5): ACCOUNT / LOGIN + STATS + LOOKUP
             ================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Account Card: Logged-Out vs Logged-In */}
            {!isLoggedIn ? (
              <section className="overflow-hidden rounded-3xl border border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] via-[#F8FCFF] to-white p-5 shadow-xs dark:border-sky-800/80 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
                {/* Report Counters */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=personal')}
                    className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-[#0084E8]/40 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="text-lg font-extrabold text-[var(--color-text)]">
                      {counts.all}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">Đã gửi</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=personal')}
                    className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-yellow-400 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="text-lg font-extrabold text-yellow-500 dark:text-yellow-400">
                      {counts.processing}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">Đang xử lý</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=personal')}
                    className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="text-lg font-extrabold text-[#16A34A]">{counts.resolved}</div>
                    <div className="text-[11px] font-semibold text-slate-500">Đã xử lý</div>
                  </button>
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-3xl border border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] via-[#F8FCFF] to-white p-5 shadow-xs space-y-4 dark:border-sky-800/80 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-base font-extrabold text-white shadow-[0_6px_16px_rgba(0,132,232,0.3)]">
                    {getInitials(citizenName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-base sm:text-lg font-extrabold text-[var(--color-text)]">
                        {citizenName}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>{formatDisplayPhone(state.settings.phone!)}</span>
                      <span>·</span>
                      <span className="truncate">{citizenAddress}</span>
                    </div>
                  </div>
                </div>

                {/* 3 Interactive Report Counter Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=personal')}
                    className="rounded-2xl border border-white/90 bg-[var(--color-surface)] p-3 text-center shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#0084E8]/40 hover:shadow-sm dark:border-slate-700"
                  >
                    <div className="text-xl font-extrabold text-[var(--color-text)]">
                      {counts.all}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      Đã gửi
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=personal')}
                    className="rounded-2xl border border-white/90 bg-[var(--color-surface)] p-3 text-center shadow-2xs transition-all hover:-translate-y-0.5 hover:border-yellow-400 hover:shadow-sm dark:border-slate-700"
                  >
                    <div className="text-xl font-extrabold text-yellow-500 dark:text-yellow-400">
                      {counts.processing}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      Đang xử lý
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/?tab=personal')}
                    className="rounded-2xl border border-white/90 bg-[var(--color-surface)] p-3 text-center shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-slate-700"
                  >
                    <div className="text-xl font-extrabold text-[#16A34A]">{counts.resolved}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      Đã xử lý
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* 2. Tra cứu bằng mã phản ánh (Dropdown Box bung ra khi bấm vào) */}
            <section
              data-testid="lookup-dropdown-box"
              className={`overflow-hidden rounded-3xl border bg-[var(--color-surface)] shadow-2xs transition-all dark:border-slate-800 ${
                lookupOpen
                  ? 'border-[#0084E8]/50 ring-2 ring-[#0084E8]/10'
                  : 'border-slate-200/90 hover:border-[#0084E8]/40'
              }`}
            >
              <button
                type="button"
                aria-expanded={lookupOpen}
                onClick={() => setLookupOpen((prev) => !prev)}
                className="group flex w-full items-center justify-between gap-3.5 p-4 sm:p-5 text-left transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0084E8] dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                      lookupOpen
                        ? 'bg-[#0084E8] text-white shadow-[0_4px_12px_rgba(0,132,232,0.28)] dark:bg-[#38BDF8] dark:text-slate-950'
                        : 'bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]'
                    }`}
                  >
                    <Search className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm sm:text-base font-extrabold text-[var(--color-text)]">
                      Tra cứu bằng mã phản ánh
                    </h2>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                      {lookupCode
                        ? `Đang nhập mã: ${lookupCode}`
                        : 'Bấm để mở khung nhập mã TB-xxxx và 4 số xác thực'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {lookupOpen && (lookupCode || lookupPin) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLookupCode('');
                        setLookupPin('');
                        setLookupError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setLookupCode('');
                          setLookupPin('');
                          setLookupError('');
                        }
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      Xoá
                    </span>
                  )}
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                      lookupOpen
                        ? 'rotate-180 bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-[#E6F3FD] group-hover:text-[#0084E8] dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </button>

              {lookupOpen && (
                <form
                  onSubmit={handleLookupSubmit}
                  className="animate-fade-up border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 space-y-3.5 dark:border-slate-800/80"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Col 1: Mã phản ánh (7/12 on sm+) */}
                    <div className="sm:col-span-7 space-y-1.5">
                      <label
                        htmlFor="lookup-code-input"
                        className="block text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Mã phản ánh
                      </label>
                      <div className="relative">
                        <Hash className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="lookup-code-input"
                          type="text"
                          value={lookupCode}
                          onChange={(e) => handleLookupCodeInput(e.target.value)}
                          placeholder="VD: TB-0001"
                          aria-label="Mã phản ánh"
                          autoFocus
                          className="h-12 w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] pr-3.5 pl-9 font-mono text-sm font-extrabold tracking-wide text-[var(--color-text)] uppercase placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 transition focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-900/70"
                        />
                      </div>
                    </div>

                    {/* Col 2: Mã bí mật / 4 số cuối SĐT (5/12 on sm+) */}
                    <div className="sm:col-span-5 space-y-1.5">
                      <label
                        htmlFor="lookup-pin-input"
                        className="block text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Mã bí mật / 4 số SĐT
                      </label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="lookup-pin-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={lookupPin}
                          onChange={(e) => {
                            setLookupPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                            if (lookupError) setLookupError('');
                          }}
                          placeholder="4 chữ số"
                          aria-label="4 số cuối SĐT / mã bí mật"
                          className="h-12 w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] pr-3.5 pl-9 font-mono text-sm font-extrabold tracking-widest text-[var(--color-text)] placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 transition focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-900/70"
                        />
                      </div>
                    </div>
                  </div>

                  {lookupError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                    >
                      {lookupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 text-sm font-extrabold text-[#0084E8] shadow-2xs transition-all hover:border-[#0084E8] hover:bg-[#0084E8] hover:text-white active:scale-[0.99] dark:border-sky-800 dark:bg-sky-950/60 dark:text-[#38BDF8] dark:hover:bg-[#0084E8] dark:hover:text-white"
                  >
                    <Search className="h-4 w-4" />
                    <span>Tra cứu phản ánh</span>
                  </button>

                  {/* Quick 1-tap lookup chips for recent reports saved on this device */}
                  {state.settings.deviceReports.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 mr-0.5">
                        Gần đây:
                      </span>
                      {state.settings.deviceReports.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(`/phan-anh/${item.id}?k=${item.secretCode}`)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 transition hover:border-[#0084E8] hover:bg-[#F0F9FF] hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <span>#{item.id}</span>
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              )}
            </section>

            {/* 3. Bảng minh bạch phường Card */}
            <button
              type="button"
              onClick={() => navigate('/minh-bach')}
              className="group flex w-full items-center justify-between gap-3.5 rounded-3xl border border-[#BAE6FD] bg-[#F0F9FF] p-4 sm:p-5 text-left shadow-2xs transition-all hover:border-[#0084E8]/50 hover:bg-[#E0F2FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] dark:border-sky-800 dark:bg-sky-950/40"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-xs transition-transform group-hover:scale-105 dark:bg-[#38BDF8] dark:text-slate-950">
                  <BarChart3 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
                    Bảng thống kê phường
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {kpi.total} phản ánh · {kpi.resolved} đã xử lý ({transparencyPercent}%) · Thời
                    gian TB {transparencyAvg}
                  </div>
                </div>
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[#0084E8] transition-transform group-hover:translate-x-0.5 dark:text-[#38BDF8]"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* =================================================================
              RIGHT COLUMN (lg:col-span-7): ACCOUNT SETTINGS, APP SETTINGS & SUPPORT
             ================================================================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. TÀI KHOẢN & THÔNG BÁO (When Logged In) */}
            {isLoggedIn && (
              <section className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Quản lý tài khoản
                  </h2>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Đang hoạt động
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(citizenName);
                      setAddressDraft(citizenAddress);
                      setIsEditingName(true);
                    }}
                    className="flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm transition hover:border-[#0084E8]/40 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-[#0084E8]" />
                      <div>
                        <div className="font-bold text-[var(--color-text)]">Hồ sơ cá nhân</div>
                        <div className="text-xs text-slate-500">{citizenName}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenChangePhone}
                    className="flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm transition hover:border-[#0084E8]/40 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="h-4 w-4 text-[#0084E8]" />
                      <div>
                        <div className="font-bold text-[var(--color-text)]">Đổi số điện thoại</div>
                        <div className="text-xs text-slate-500">
                          {formatDisplayPhone(state.settings.phone!)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </section>
            )}

            {/* 2. Thông báo tiến độ gần đây (nếu có) */}
            {myNotifications.length > 0 && (
              <section className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#0084E8]" />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Thông báo tiến độ mới nhất
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(myNotifications[0]!)}
                    className="text-xs font-extrabold text-[#0084E8] hover:underline dark:text-[#38BDF8]"
                  >
                    Xem chi tiết
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs leading-relaxed text-[var(--color-text)] dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="font-medium">{myNotifications[0]!.message}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(myNotifications[0]!.createdAt)}
                  </p>
                </div>
              </section>
            )}

            {/* 3A. MOBILE ONLY (< 768px): Nút gom "Cài đặt ứng dụng" để mở trang Cài đặt riêng */}
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(true)}
              className="flex w-full items-center justify-between gap-3.5 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 text-left shadow-2xs transition-all hover:border-[#0084E8]/40 active:scale-[0.99] md:hidden dark:border-slate-800"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[var(--color-text)]">
                    Cài đặt ứng dụng
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Giao diện {theme === 'dark' ? 'Tối' : 'Sáng'} · Cỡ chữ {activeFontLabel} · Thông
                    báo &amp; GPS
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>

            {/* 3B. TABLET & PC (>= 768px): CÀI ĐẶT ỨNG DỤNG hiển thị trực tiếp dạng lưới 2 cột */}
            <section className="hidden md:block rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3.5 dark:border-slate-800">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cài đặt ứng dụng
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Card 1: Giao diện (Sáng / Tối) */}
                <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-amber-300">
                      {theme === 'dark' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--color-text)]">
                        Giao diện (Sáng / Tối)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {theme === 'dark' ? 'Đang bật chế độ Tối' : 'Đang bật chế độ Sáng'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label="Chuyển giao diện sáng tối"
                    onClick={handleToggleTheme}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      theme === 'dark' ? 'bg-[#0084E8]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                        theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Card 2: Cỡ chữ 4 mức (Nhỏ / Thường / Lớn / Siêu lớn) */}
                <div className="sm:col-span-2 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0084E8] shadow-2xs dark:bg-slate-800 dark:text-[#38BDF8]">
                        <Type className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--color-text)]">Cỡ chữ</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Đang chọn: {activeFontLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="Chọn kích cỡ chữ hiển thị"
                    className="grid grid-cols-4 gap-2"
                  >
                    {FONT_SCALE_OPTIONS.map((opt) => {
                      const selected = activeFontScale === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => handleSelectFontScale(opt.id)}
                          className={`flex h-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                            selected
                              ? 'bg-[#0084E8] text-white shadow-xs dark:bg-[#38BDF8] dark:text-slate-950'
                              : 'border border-slate-200/90 bg-white text-slate-600 hover:border-[#0084E8]/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card 3: Thông báo đẩy */}
                <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0084E8] shadow-2xs dark:bg-slate-800 dark:text-[#38BDF8]">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--color-text)]">
                        Thông báo đẩy
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {pushEnabled ? 'Nhận tin khi xử lý xong' : 'Đang tạm tắt'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pushEnabled}
                    aria-label="Bật tắt thông báo đẩy"
                    onClick={() => setPushEnabled((p) => !p)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      pushEnabled ? 'bg-[#0084E8]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                        pushEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Card 4: Định vị GPS */}
                <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs dark:bg-slate-800 dark:text-emerald-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--color-text)]">Vị trí GPS</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tự động định vị hiện trường
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100/80 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Đang bật
                  </span>
                </div>
              </div>
            </section>

            {/* 4. THÔNG TIN & HỖ TRỢ */}
            <section className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3 dark:border-slate-800">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Thông tin &amp; Hỗ trợ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm transition hover:border-[#0084E8]/40 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#0084E8]" />
                    <span className="font-bold text-[var(--color-text)]">Chính sách bảo mật</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setHotlineOpen(true)}
                  className="flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm transition hover:border-[#0084E8]/40 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="flex items-center gap-2.5">
                    <Headphones className="h-4 w-4 text-[#0084E8]" />
                    <span className="font-bold text-[var(--color-text)]">
                      Tổng đài hỗ trợ phường
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <div className="sm:col-span-2 flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70">
                  <span className="font-bold text-[var(--color-text)]">Phiên bản ứng dụng</span>
                  <span className="rounded-lg bg-slate-200/70 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    v1.2 Chính thức
                  </span>
                </div>
              </div>
            </section>

            {/* 5. Chuyển vai trò trên Mobile (Trên PC đã có thanh Sidebar trái cố định) */}
            <section
              aria-label="Chuyển đổi giao diện vai trò"
              className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3 md:hidden dark:border-slate-800"
            >
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cổng nghiệp vụ phường Trấn Biên
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/can-bo')}
                  className="flex min-h-[50px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold text-[#0084E8] transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:text-[#38BDF8]"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Cổng Cán bộ phường</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/tnv')}
                  className="flex min-h-[50px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold text-[#0084E8] transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 dark:text-[#38BDF8]"
                >
                  <span className="flex items-center gap-2.5">
                    <UserCheck className="h-4 w-4" />
                    <span>Cổng Tình nguyện viên</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </section>

            {/* Đăng xuất button (single unified action when logged in) */}
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-extrabold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chi tiết thông báo Modal */}
      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title="Chi tiết thông báo tiến độ"
        footer={
          selectedNotification && (
            <div className="flex w-full gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSelectedNotification(null)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={() => {
                  const reportId = selectedNotification.reportId;
                  setSelectedNotification(null);
                  navigate(`/phan-anh/${reportId}`);
                }}
              >
                Xem hồ sơ
              </Button>
            </div>
          )
        }
      >
        {selectedNotification && (
          <SmsPreview
            phone={selectedNotification.phone || 'Thiết bị này'}
            message={selectedNotification.message}
            time={formatDateTime(selectedNotification.createdAt)}
          />
        )}
      </Modal>

      {/* Chính sách bảo mật Modal */}
      <Modal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Chính sách bảo mật & Quyền riêng tư"
        footer={
          <Button variant="primary" fullWidth onClick={() => setPrivacyOpen(false)}>
            Đã hiểu
          </Button>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <div className="rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] p-3.5 text-slate-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-slate-100">
            <div className="font-extrabold text-[#0084E8] dark:text-[#38BDF8]">
              1. Bảo mật số điện thoại người gửi
            </div>
            <p className="mt-1 text-xs leading-relaxed">
              Số điện thoại của bạn được che tự động trên toàn bộ cổng thông tin và tuyệt đối không
              hiển thị công khai trên bảng tin cộng đồng.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100">
            <div className="font-extrabold">2. Quyền gửi phản ánh ẩn danh</div>
            <p className="mt-1 text-xs leading-relaxed">
              Khi không nhập số điện thoại, hệ thống tự động tạo Mã bí mật 4 số và mã QR riêng để
              bạn tự theo dõi tiến độ xử lý mà không cần cung cấp thông tin định danh.
            </p>
          </div>
        </div>
      </Modal>

      {/* Unified Hotline Modal (same as Floating Call Button) */}
      <HotlineModal isOpen={hotlineOpen} onClose={() => setHotlineOpen(false)} />

      {/* Hồ sơ cá nhân Modal (Chỉnh sửa họ tên hiển thị) */}
      <Modal
        isOpen={isEditingName}
        onClose={() => setIsEditingName(false)}
        title="Hồ sơ cá nhân"
        footer={
          <div className="flex w-full items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="min-h-[44px] rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={(e) => {
                handleSaveCitizenName(e as unknown as React.FormEvent);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#0084E8] px-5 py-2 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4]"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveCitizenName} className="space-y-4">
          <div className="flex items-center gap-3.5 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] p-3.5 dark:border-sky-800 dark:bg-sky-950/40">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-base font-extrabold text-white shadow-xs">
              {getInitials(nameDraft || citizenName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-[var(--color-text)]">
                {nameDraft.trim() || citizenName}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {state.settings.phone
                  ? formatDisplayPhone(state.settings.phone)
                  : 'Chưa liên kết SĐT'}{' '}
                · {addressDraft.trim() || citizenAddress}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="citizen-name-modal-input"
              className="block text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Họ và tên hiển thị
            </label>
            <input
              id="citizen-name-modal-input"
              type="text"
              maxLength={40}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Nhập họ tên hiển thị của bạn..."
              autoFocus
              className="h-12 w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] px-4 text-sm font-bold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 transition focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-900/70"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="citizen-address-modal-input"
              className="block text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Địa chỉ / Khu vực sinh sống
            </label>
            <input
              id="citizen-address-modal-input"
              type="text"
              maxLength={80}
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
              placeholder="VD: KP 2, Đường Hà Huy Giáp, P. Trấn Biên"
              className="h-12 w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] px-4 text-sm font-bold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 transition focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-900/70"
            />
          </div>
        </form>
      </Modal>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-[390px] -translate-x-1/2">
          <Toast message={toastMsg} type="success" onClose={() => setToastMsg(null)} />
        </div>
      )}
    </div>
  );
}
