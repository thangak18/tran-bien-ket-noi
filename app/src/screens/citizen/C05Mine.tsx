import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  Edit3,
  Headphones,
  LogOut,
  MapPin,
  Moon,
  Phone,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Type,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { apiFetch, isApiMode, setCitizenToken } from '@/lib/api';
import { filterMyReports } from '@/domain/access';
import { useMyReports } from '@/data/useMyReports';
import { computeKpi } from '@/domain/kpi';
import { maskPhone } from '@/domain/privacy';
import { formatDays } from '@/domain/format';
import { FontScale } from '@/domain/types';
import { applyFontScale, FONT_SCALE_OPTIONS, resolveFontScale } from '@/lib/senior';
import {
  CITIZEN_ADDRESS_STORAGE_KEY,
  CITIZEN_NAME_STORAGE_KEY,
  findAccountByPhone,
  saveAccountRecord,
} from '@/lib/accounts';
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
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const loginRequired = searchParams.get('login') === '1';
  const { state, dispatch } = useAppStore();
  const now = state.settings.demoNow;

  const [citizenName, setCitizenName] = useState<string>(getInitialCitizenName);
  const [citizenAddress, setCitizenAddress] = useState<string>(getInitialCitizenAddress);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(citizenName);
  const [addressDraft, setAddressDraft] = useState(citizenAddress);

  const [otpOpen, setOtpOpen] = useState(() => loginRequired && !state.settings.phone);
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState(state.settings.phone ?? '');
  const [phoneError, setPhoneError] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
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

  const [otpBusy, setOtpBusy] = useState(false);
  const myReports = useMyReports();

  const unreadNotifCount = useMemo(() => {
    const myPhone = state.settings.phone;
    if (!myPhone) return 0;
    return state.notifications.filter((n) => n.phone === myPhone && !n.read).length;
  }, [state.notifications, state.settings.phone]);

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

  const handleRequestOtpFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    const digits = phoneInput.replace(/\D/g, '');
    if (!/^(03|05|07|08|09)\d{8}$/.test(digits)) {
      setPhoneError('Vui lòng nhập số điện thoại 10 số hợp lệ (VD: 0909 000 068)');
      return;
    }
    if (isApiMode()) {
      // Chế độ API: máy chủ tạo mã OTP (vẫn là mô phỏng, mã 123456).
      setOtpBusy(true);
      try {
        await apiFetch('/citizen/otp/request', {
          method: 'POST',
          body: JSON.stringify({ phone: digits }),
        });
      } catch (err) {
        setPhoneError(
          err instanceof Error ? err.message : 'Không gửi được mã OTP. Vui lòng thử lại.'
        );
        return;
      } finally {
        setOtpBusy(false);
      }
    }
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setOtpStep('otp');
    setOtpOpen(true);
    window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  // Tự động nhận diện & dán mã OTP khi SMS về (WebOTP API + mô phỏng tự động điền)
  useEffect(() => {
    if (!otpOpen || otpStep !== 'otp') return;
    let cancelled = false;
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;

    const applyDetectedOtp = (code: string) => {
      if (cancelled) return;
      const clean = code.replace(/\D/g, '').slice(0, 6);
      if (clean.length === 6) {
        setOtpDigits(clean.split(''));
        setOtpError('');
        setToastMsg('Đã tự động nhận diện và dán mã OTP');
        otpRefs.current[5]?.focus();
      }
    };

    const creds =
      typeof navigator !== 'undefined'
        ? (
            navigator as Navigator & {
              credentials?: { get?: (opts: unknown) => Promise<{ code?: string } | null> };
            }
          ).credentials
        : undefined;

    if (creds && typeof creds.get === 'function') {
      creds
        .get({
          otp: { transport: ['sms'] },
          signal: ac?.signal,
        })
        .then((res) => {
          if (res?.code) applyDetectedOtp(res.code);
        })
        .catch(() => {});
    }

    const demoTimer = window.setTimeout(() => {
      setOtpDigits((prev) => {
        if (cancelled || prev.some((d) => d.length > 0)) return prev;
        setToastMsg('Đã tự động nhận diện và dán mã OTP');
        return ['1', '2', '3', '4', '5', '6'];
      });
    }, 650);

    return () => {
      cancelled = true;
      ac?.abort();
      window.clearTimeout(demoTimer);
    };
  }, [otpOpen, otpStep]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
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
    if (isApiMode()) {
      // Máy chủ xác minh OTP và cấp token người dân; hồ sơ gửi kèm token mới gắn với SĐT này.
      setOtpBusy(true);
      try {
        const res = await apiFetch<{ token: string }>('/citizen/otp/verify', {
          method: 'POST',
          body: JSON.stringify({ phone: cleanPhone, code }),
        });
        setCitizenToken(res.token);
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : 'Mã OTP không đúng. Vui lòng thử lại.');
        return;
      } finally {
        setOtpBusy(false);
      }
    }
    const existing = findAccountByPhone(cleanPhone, state.reports);
    const resolvedName = existing?.name ?? 'Công dân Trấn Biên';
    const resolvedAddress = existing?.address ?? 'P. Trấn Biên';

    if (!existing) {
      saveAccountRecord({
        phone: cleanPhone,
        name: resolvedName,
        address: resolvedAddress,
        createdAt: new Date().toISOString(),
      });
    }

    setCitizenName(resolvedName);
    setCitizenAddress(resolvedAddress);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CITIZEN_NAME_STORAGE_KEY, resolvedName);
      window.localStorage.setItem(CITIZEN_ADDRESS_STORAGE_KEY, resolvedAddress);
    }

    dispatch({ type: 'SET_SETTINGS', payload: { phone: cleanPhone } });
    setOtpOpen(false);
    setToastMsg(`Đã đăng nhập số ${maskPhone(cleanPhone)}`);
    if (redirectTarget && redirectTarget.startsWith('/')) {
      navigate(redirectTarget, { replace: true });
    }
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
    if (typeof window !== 'undefined') window.localStorage.removeItem('tb_citizen_token');
    dispatch({ type: 'SET_SETTINGS', payload: { phone: undefined } });
    setPhoneInput('');
    setToastMsg('Đã đăng xuất số điện thoại');
  };

  const transparencyPercent = kpi.resolvedPercent.toFixed(1).replace('.', ',');
  const transparencyAvg = kpi.avgDays !== null ? formatDays(kpi.avgDays) : '—';
  const last4Phone = (phoneInput.replace(/\D/g, '') || '0000').slice(-4);
  const isLoggedIn = Boolean(state.settings.phone);

  // Fullscreen / Centered OTP Verification Screen (no bottom navbar); có nhãn "Mô phỏng" theo AGENTS.md
  if (otpOpen) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col overflow-y-auto bg-[var(--color-bg)] px-4 sm:px-6 pt-4 pb-10">
        <span data-testid="screen-title" className="sr-only">
          Phản ánh của tôi
        </span>

        {/* Top Header */}
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => {
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

            {loginRequired && (
              <div className="rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-3.5 py-2.5 text-center text-xs font-semibold text-[#0369A1] dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                Vui lòng đăng nhập để hoàn tất gửi phản ánh.
              </div>
            )}

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
              disabled={otpBusy}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0084E8] px-6 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(0,132,232,0.28)] transition hover:bg-[#006EC4]"
            >
              Xác nhận
            </button>
          </form>
        ) : (
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
              {/* AGENTS.md: OTP chưa tích hợp thật nên phải có nhãn "Mô phỏng" */}
              <span className="inline-flex rounded-full bg-[#E6F3FD] px-2.5 py-0.5 text-xs font-bold text-[#0084E8]">
                Mô phỏng · mã 123456
              </span>
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
                    autoComplete={idx === 0 ? 'one-time-code' : undefined}
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
              disabled={otpBusy}
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#0084E8] px-6 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(0,132,232,0.32)] transition hover:bg-[#006EC4]"
            >
              {otpBusy ? 'Đang xác thực...' : 'Xác nhận & Đăng nhập'}
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
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => navigate('/thong-bao')}
              aria-label="Thông báo của tôi"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/90 bg-[var(--color-bg)] text-[var(--color-text)] shadow-2xs transition hover:border-[#0084E8]/40 hover:bg-[#E6F3FD] hover:text-[#0084E8] dark:border-slate-700 dark:hover:bg-sky-950/60 dark:hover:text-[#38BDF8]"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-xs">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>
          )}
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
              <section className="overflow-hidden rounded-3xl border border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] via-[#F8FCFF] to-white p-5 shadow-xs space-y-4 dark:border-sky-800/80 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-[var(--color-text)]">
                        Đăng nhập tài khoản
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Đồng bộ phản ánh, nhận tin báo &amp; đánh giá xử lý
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenChangePhone}
                    className="shrink-0 rounded-xl bg-[#0084E8] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#0073CC] active:scale-[0.98]"
                  >
                    Đăng nhập
                  </button>
                </div>

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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-xl font-extrabold text-white shadow-[0_6px_16px_rgba(0,132,232,0.3)]">
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

                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(citizenName);
                      setAddressDraft(citizenAddress);
                      setIsEditingName(true);
                    }}
                    aria-label="Chỉnh sửa hồ sơ cá nhân"
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#BAE6FD] bg-white/90 px-2.5 py-1.5 text-xs font-bold text-[#0084E8] shadow-2xs transition hover:bg-[#E6F3FD] dark:border-sky-800 dark:bg-slate-800 dark:text-[#38BDF8]"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sửa</span>
                  </button>
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
          <div className="space-y-1.5">
            <label
              htmlFor="citizen-phone-modal-input"
              className="block text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Số điện thoại
            </label>
            <input
              id="citizen-phone-modal-input"
              type="text"
              readOnly
              disabled
              value={
                state.settings.phone
                  ? formatDisplayPhone(state.settings.phone)
                  : 'Chưa liên kết SĐT'
              }
              className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200/80 bg-slate-100/80 px-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400"
            />
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
