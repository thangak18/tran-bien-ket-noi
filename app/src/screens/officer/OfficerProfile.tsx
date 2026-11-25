import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { useAppStore } from '@/store/AppStore';
import { DEFAULT_OFFICER } from '@/domain/constants';
import { FontScale } from '@/domain/types';
import { applyFontScale, resolveFontScale } from '@/lib/senior';
import { applyTheme, getInitialTheme, ThemeMode } from '@/lib/theme';
import {
  CITIZEN_ADDRESS_STORAGE_KEY,
  CITIZEN_NAME_STORAGE_KEY,
  CitizenAccountRecord,
  saveAccountRecord,
} from '@/lib/accounts';
import { PortalAuthFlow } from '@/components/common/PortalAuthFlow';
import { PortalSettingsCards } from '@/components/common/PortalSettingsCards';
import { HotlineModal } from '@/components/common/HotlineModal';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';

const OFFICER_SIGNED_OUT_KEY = 'tbkn:officer-signed-out';

type OfficerSubView = 'main' | 'auth' | 'settings';

export function OfficerProfile() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 2600);
  };

  const [subView, setSubView] = useState<OfficerSubView>('main');
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [signedOut, setSignedOut] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(OFFICER_SIGNED_OUT_KEY) === 'true' && !state.settings.phone;
  });

  const [officerName, setOfficerName] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_OFFICER;
    return window.localStorage.getItem(CITIZEN_NAME_STORAGE_KEY)?.trim() || DEFAULT_OFFICER;
  });
  const [officerUnit, setOfficerUnit] = useState<string>(() => {
    if (typeof window === 'undefined') return 'UBND P. Trấn Biên';
    return window.localStorage.getItem(CITIZEN_ADDRESS_STORAGE_KEY)?.trim() || 'UBND P. Trấn Biên';
  });

  const [draftName, setDraftName] = useState(officerName);
  const [draftUnit, setDraftUnit] = useState(officerUnit);

  const fontScale = resolveFontScale(state.settings);
  const isLoggedIn = !signedOut;
  const activePhone = state.settings.phone || '02513820000';

  const officerStats = useMemo(() => {
    const total = state.reports.length;
    const pending = state.reports.filter((r) =>
      ['moi', 'da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'mo_lai'].includes(r.status)
    ).length;
    const completed = state.reports.filter((r) => ['hoan_thanh', 'dong'].includes(r.status)).length;
    return { total, pending, completed };
  }, [state.reports]);

  const handleToggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  };

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

  const handleAuthenticated = (record: CitizenAccountRecord) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(OFFICER_SIGNED_OUT_KEY);
    }
    setSignedOut(false);
    setOfficerName(record.name);
    setOfficerUnit(record.address);
    dispatch({ type: 'SET_SETTINGS', payload: { phone: record.phone } });
    setSubView('main');
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(OFFICER_SIGNED_OUT_KEY, 'true');
    }
    setSignedOut(true);
    dispatch({ type: 'SET_SETTINGS', payload: { phone: undefined } });
    showToast('Đã đăng xuất tài khoản cán bộ');
  };

  const handleSaveProfile = () => {
    const cleanName = draftName.trim();
    const cleanUnit = draftUnit.trim() || 'UBND P. Trấn Biên';
    if (cleanName.length < 2) {
      showToast('Vui lòng nhập họ và tên');
      return;
    }
    setOfficerName(cleanName);
    setOfficerUnit(cleanUnit);
    saveAccountRecord({
      phone: activePhone,
      name: cleanName,
      address: cleanUnit,
      createdAt: new Date().toISOString(),
    });
    setEditOpen(false);
    showToast('Đã cập nhật hồ sơ cán bộ');
  };

  const handleResetDemo = () => {
    dispatch({ type: 'RESET' });
    showToast('Đã khôi phục dữ liệu mẫu');
  };

  return (
    <OfficerLayout>
      <div className="mx-auto w-full max-w-2xl animate-fade-up">
        {toastMsg && (
          <div className="mb-3">
            <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
          </div>
        )}
        {subView === 'auth' && (
          <PortalAuthFlow
            portalLabel="Cán bộ phường"
            accent="sky"
            defaultAddress="UBND P. Trấn Biên"
            addressLabel="Đơn vị công tác"
            addressPlaceholder="VD: UBND P. Trấn Biên"
            reports={state.reports}
            onCancel={() => setSubView('main')}
            onAuthenticated={handleAuthenticated}
          />
        )}

        {subView === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSubView('main')}
                aria-label="Quay lại hồ sơ"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-bold text-[var(--color-text)]">Cài đặt cán bộ</h1>
            </div>

            <PortalSettingsCards
              accent="sky"
              theme={theme}
              onToggleTheme={handleToggleTheme}
              fontScale={fontScale}
              onSelectFontScale={handleSelectFontScale}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={() => setNotificationsEnabled((v) => !v)}
              gpsEnabled={gpsEnabled}
              onToggleGps={() => setGpsEnabled((v) => !v)}
              onOpenHotline={() => setHotlineOpen(true)}
              onOpenPrivacy={() => setPrivacyOpen(true)}
              onResetDemo={handleResetDemo}
            />
          </div>
        )}

        {subView === 'main' && (
          <div className="space-y-4">
            {/* Profile Hero Card */}
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                    <User className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1
                        data-testid="screen-title"
                        className="text-lg font-extrabold text-[var(--color-text)]"
                      >
                        {isLoggedIn ? officerName : 'Khách (Chưa đăng nhập)'}
                      </h1>
                      {isLoggedIn && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/70 dark:text-sky-300">
                          <ShieldCheck className="h-3 w-3" />
                          Cán bộ
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {isLoggedIn ? officerUnit : 'UBND P. Trấn Biên'}
                      </span>
                      {isLoggedIn && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {activePhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLoggedIn ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftName(officerName);
                          setDraftUnit(officerUnit);
                          setEditOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-bold text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition-colors duration-150 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubView('auth')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-sky-700 active:scale-[0.98]"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Đăng nhập
                    </button>
                  )}
                </div>
              </div>

              {/* Compact KPI Strip */}
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-center">
                  <div className="text-lg font-extrabold text-[var(--color-text)]">
                    {officerStats.total}
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    Tổng hồ sơ
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-center">
                  <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                    {officerStats.pending}
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    Đang xử lý
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-center">
                  <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    {officerStats.completed}
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    Hoàn thành
                  </div>
                </div>
              </div>
            </div>

            {/* Action List */}
            <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
              <button
                type="button"
                onClick={() => navigate('/can-bo/thong-ke')}
                className="flex w-full items-center justify-between p-4 text-left transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      Bảng thống kê xử lý
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Tiến độ &amp; chất lượng toàn phường
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
              </button>

              <button
                type="button"
                onClick={() => setSubView('settings')}
                className="flex w-full items-center justify-between p-4 text-left transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      Cài đặt giao diện &amp; hệ thống
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Nền sáng/tối, cỡ chữ, thông báo
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Cập nhật hồ sơ cán bộ">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Họ và tên
            </label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Đơn vị công tác
            </label>
            <input
              type="text"
              value={draftUnit}
              onChange={(e) => setDraftUnit(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="btn-primary-action flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-sky-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Lưu thay đổi
          </button>
        </div>
      </Modal>

      <HotlineModal isOpen={hotlineOpen} onClose={() => setHotlineOpen(false)} />

      <Modal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Quy định bảo mật nội bộ"
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Thông tin phản ánh, số điện thoại công dân và nhật ký điều phối chỉ sử dụng cho mục đích
          xử lý hiện trường tại Phường Trấn Biên.
        </p>
      </Modal>
    </OfficerLayout>
  );
}
