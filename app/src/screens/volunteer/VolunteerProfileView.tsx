import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  Edit3,
  Headphones,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Type,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { maskPhone } from '@/domain/privacy';
import { FontScale } from '@/domain/types';
import { applyFontScale, resolveFontScale } from '@/lib/senior';
import { applyTheme, getInitialTheme, ThemeMode } from '@/lib/theme';
import { CitizenAccountRecord } from '@/lib/accounts';
import {
  clearVolunteerSession,
  getVolunteerSession,
  setVolunteerSession,
  VolunteerSession,
} from '@/lib/portalSession';
import { HotlineModal } from '@/components/common/HotlineModal';
import { PortalAuthFlow } from '@/components/common/PortalAuthFlow';
import { useGpsSetting } from '@/lib/gpsSettings';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';

export interface VolunteerProfileViewProps {
  currentVolunteer: string;
  onVolunteerChange: (name: string) => void;
  todoCount: number;
  doneCount: number;
  nearestMeters: number | null;
  hasGps: boolean;
  notifEnabled: boolean;
  onToggleNotif: () => void;
}

type VolunteerSubView = 'main' | 'auth' | 'settings';

const FONT_SCALE_OPTIONS: ReadonlyArray<{ id: FontScale; label: string }> = [
  { id: 'small', label: 'Nhỏ' },
  { id: 'normal', label: 'Thường' },
  { id: 'large', label: 'Lớn' },
  { id: 'xlarge', label: 'Siêu lớn' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TV';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function VolunteerProfileView({
  onVolunteerChange,
  todoCount,
  doneCount,
  notifEnabled,
  onToggleNotif,
}: VolunteerProfileViewProps) {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 2600);
  };

  const [subView, setSubView] = useState<VolunteerSubView>('main');
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const { gpsEnabled, gpsSubtitle, toggleGps } = useGpsSetting();
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [session, setSession] = useState<VolunteerSession | null>(() => getVolunteerSession());
  const [draftName, setDraftName] = useState(session?.name ?? '');
  const [draftArea, setDraftArea] = useState(session?.area ?? 'Đội TNV P. Trấn Biên');

  const activeFontScale = resolveFontScale(state.settings);
  const activeFontLabel =
    FONT_SCALE_OPTIONS.find((opt) => opt.id === activeFontScale)?.label ?? 'Thường';

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
    const nextSession: VolunteerSession = {
      name: record.name,
      area: record.address || 'Đội TNV P. Trấn Biên',
      phone: record.phone,
    };
    setVolunteerSession(nextSession);
    setSession(nextSession);
    onVolunteerChange(nextSession.name);
    setSubView('main');
    showToast(`Đã đăng nhập: ${nextSession.name}`);
  };

  const handleLogout = () => {
    clearVolunteerSession();
    setSession(null);
    showToast('Đã đăng xuất tài khoản tình nguyện viên');
  };

  const handleSaveProfile = () => {
    if (!session) return;
    const cleanName = draftName.trim();
    const cleanArea = draftArea.trim() || 'Đội TNV P. Trấn Biên';
    if (cleanName.length < 2) {
      showToast('Vui lòng nhập họ và tên');
      return;
    }
    const nextSession: VolunteerSession = {
      ...session,
      name: cleanName,
      area: cleanArea,
    };
    setVolunteerSession(nextSession);
    setSession(nextSession);
    onVolunteerChange(cleanName);
    setEditOpen(false);
    showToast('Đã cập nhật hồ sơ tình nguyện viên');
  };

  if (subView === 'auth') {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <PortalAuthFlow
          portalLabel="Tình nguyện viên"
          roleSummary="Nhận nhiệm vụ xác minh, chụp ảnh hiện trường thực tế và báo cáo về UBND phường."
          accent="emerald"
          defaultAddress="Đội TNV P. Trấn Biên"
          addressLabel="Đội / Khu phố phụ trách"
          addressPlaceholder="VD: Đội TNV Khu phố 3"
          reports={state.reports}
          onCancel={() => setSubView('main')}
          onAuthenticated={handleAuthenticated}
        />
      </div>
    );
  }

  if (subView === 'settings') {
    return (
      <div className="flex flex-1 flex-col pb-24 md:pb-12">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3.5 dark:border-slate-800">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <button
              type="button"
              onClick={() => setSubView('main')}
              aria-label="Quay lại hồ sơ"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-[var(--color-bg)] text-[var(--color-text)] transition hover:bg-slate-100 dark:border-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-extrabold text-[var(--color-text)]">Cài đặt ứng dụng</h1>
          </div>
        </header>

        <div className="mx-auto w-full max-w-2xl px-4 md:px-6 pt-5 space-y-3">
          {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

          {/* Giao diện */}
          <div className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] px-4 py-3 shadow-2xs dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-amber-300">
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

          {/* Cỡ chữ */}
          <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] px-4 py-3.5 shadow-2xs dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                <Type className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">Cỡ chữ</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Đang chọn: {activeFontLabel}
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
                        : 'border border-slate-200/90 bg-slate-50 text-slate-600 hover:border-[#0084E8]/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thông báo */}
          <div className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] px-4 py-3 shadow-2xs dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">Thông báo đẩy</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {notifEnabled ? 'Nhận tin khi có nhiệm vụ mới' : 'Đang tạm tắt'}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              aria-label="Bật tắt thông báo đẩy"
              onClick={onToggleNotif}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                notifEnabled ? 'bg-[#0084E8]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  notifEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* GPS */}
          <div className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] px-4 py-3 shadow-2xs dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">Vị trí GPS</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{gpsSubtitle}</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={gpsEnabled}
              aria-label="Bật tắt vị trí GPS"
              onClick={() => void toggleGps()}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                gpsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  gpsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-24 md:pb-12">
      {/* Top Sticky Header matching C05Mine */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3.5 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <h1
            data-testid="screen-title"
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]"
          >
            Hồ sơ
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
        {toastMsg && (
          <div className="mb-4">
            <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN (lg:col-span-5): ACCOUNT + STATS */}
          <div className="lg:col-span-5 space-y-5">
            {!session ? (
              <section className="overflow-hidden rounded-3xl border border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] via-[#F8FCFF] to-white p-5 shadow-xs space-y-4 dark:border-sky-800/80 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                      <User className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base sm:text-lg font-extrabold text-[var(--color-text)]">
                        Chưa đăng nhập
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                        Đăng nhập tài khoản tình nguyện viên để nhận nhiệm vụ hiện trường.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubView('auth')}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#0084E8] px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(0,132,232,0.3)] transition hover:bg-[#006EC4]"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Đăng nhập</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/tnv')}
                    className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-yellow-400 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="text-lg font-extrabold text-yellow-500 dark:text-yellow-400">
                      {todoCount}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">Đang chờ</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/tnv')}
                    className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-center shadow-2xs transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="text-lg font-extrabold text-[#16A34A]">{doneCount}</div>
                    <div className="text-[11px] font-semibold text-slate-500">Đã xong</div>
                  </button>
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-3xl border border-[#BAE6FD] bg-gradient-to-br from-[#F0F9FF] via-[#F8FCFF] to-white p-5 shadow-xs space-y-4 dark:border-sky-800/80 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-xl font-extrabold text-white shadow-[0_6px_16px_rgba(0,132,232,0.3)]">
                      {getInitials(session.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-base sm:text-lg font-extrabold text-[var(--color-text)]">
                          {session.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span>{maskPhone(session.phone)}</span>
                        <span>·</span>
                        <span className="truncate">{session.area}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(session.name);
                      setDraftArea(session.area);
                      setEditOpen(true);
                    }}
                    aria-label="Chỉnh sửa hồ sơ cá nhân"
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#BAE6FD] bg-white/90 px-2.5 py-1.5 text-xs font-bold text-[#0084E8] shadow-2xs transition hover:bg-[#E6F3FD] dark:border-sky-800 dark:bg-slate-800 dark:text-[#38BDF8]"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sửa</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/tnv')}
                    className="rounded-2xl border border-white/90 bg-[var(--color-surface)] p-3 text-center shadow-2xs transition-all hover:-translate-y-0.5 hover:border-yellow-400 hover:shadow-sm dark:border-slate-700"
                  >
                    <div className="text-xl font-extrabold text-yellow-500 dark:text-yellow-400">
                      {todoCount}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      Đang chờ
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/tnv')}
                    className="rounded-2xl border border-white/90 bg-[var(--color-surface)] p-3 text-center shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-slate-700"
                  >
                    <div className="text-xl font-extrabold text-[#16A34A]">{doneCount}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      Đã xong
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* Stats Card matching C05Mine */}
            <button
              type="button"
              onClick={() => navigate('/tnv/thong-ke')}
              className="group flex w-full items-center justify-between gap-3.5 rounded-3xl border border-[#BAE6FD] bg-[#F0F9FF] p-4 sm:p-5 text-left shadow-2xs transition-all hover:border-[#0084E8]/50 hover:bg-[#E0F2FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] dark:border-sky-800 dark:bg-sky-950/40"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-xs transition-transform group-hover:scale-105 dark:bg-[#38BDF8] dark:text-slate-950">
                  <BarChart3 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
                    Thống kê nhiệm vụ
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {todoCount} đang chờ · {doneCount} đã hoàn thành
                  </div>
                </div>
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[#0084E8] transition-transform group-hover:translate-x-0.5 dark:text-[#38BDF8]"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* RIGHT COLUMN (lg:col-span-7): APP SETTINGS & SUPPORT */}
          <div className="lg:col-span-7 space-y-5">
            {/* Mobile Only: Button to open Settings subview */}
            <button
              type="button"
              onClick={() => setSubView('settings')}
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

            {/* Tablet & PC: CÀI ĐẶT ỨNG DỤNG */}
            <section className="hidden md:block rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3.5 dark:border-slate-800">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cài đặt ứng dụng
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Card 1: Giao diện */}
                <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-amber-300">
                      {theme === 'dark' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--color-text)]">
                        Giao diện (Sáng / Tối)
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
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

                {/* Card 2: Thông báo đẩy */}
                <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0084E8] shadow-2xs dark:bg-slate-800 dark:text-[#38BDF8]">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--color-text)]">
                        Thông báo đẩy
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {notifEnabled ? 'Nhận tin khi có nhiệm vụ mới' : 'Đang tạm tắt'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifEnabled}
                    aria-label="Bật tắt thông báo đẩy"
                    onClick={onToggleNotif}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      notifEnabled ? 'bg-[#0084E8]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                        notifEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Card 3: Vị trí GPS */}
                <div className="sm:col-span-2 flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs dark:bg-slate-800 dark:text-emerald-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--color-text)]">Vị trí GPS</div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {gpsSubtitle}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={gpsEnabled}
                    aria-label="Bật tắt vị trí GPS"
                    onClick={() => void toggleGps()}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      gpsEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                        gpsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Card 4: Cỡ chữ */}
                <div className="sm:col-span-2 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
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
              </div>
            </section>

            {/* THÔNG TIN & HỖ TRỢ */}
            <section className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-3 dark:border-slate-800">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Thông tin &amp; Hỗ trợ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm transition hover:border-[#0084E8]/40 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-800/80"
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
                  className="flex min-h-[54px] items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-sm transition hover:border-[#0084E8]/40 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-800/80"
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
                    v1.0 Chính thức
                  </span>
                </div>
              </div>
            </section>

            {/* Đăng xuất */}
            {session && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-extrabold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <HotlineModal isOpen={hotlineOpen} onClose={() => setHotlineOpen(false)} />

      <Modal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Quy định bảo mật & dữ liệu"
      >
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
          Ảnh xác minh hiện trường và vị trí GPS của tình nguyện viên được bảo mật và chỉ phục vụ
          công tác điều phối tại Phường Trấn Biên.
        </p>
      </Modal>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Chỉnh sửa hồ sơ tình nguyện viên"
      >
        <div className="space-y-4 text-sm">
          <div>
            <label
              htmlFor="tnv-name-input"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Họ và tên hiển thị
            </label>
            <input
              id="tnv-name-input"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="VD: Lê Thảo Vy"
              className="w-full rounded-2xl border border-slate-200 bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] focus:border-[#0084E8] focus:outline-none dark:border-slate-700"
            />
          </div>

          <div>
            <label
              htmlFor="tnv-area-input"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Đội / Khu phố phụ trách
            </label>
            <input
              id="tnv-area-input"
              type="text"
              value={draftArea}
              onChange={(e) => setDraftArea(e.target.value)}
              placeholder="VD: Đội TNV Khu phố 3"
              className="w-full rounded-2xl border border-slate-200 bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] focus:border-[#0084E8] focus:outline-none dark:border-slate-700"
            />
          </div>

          {session?.phone && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Số điện thoại
              </label>
              <div className="w-full rounded-2xl border border-slate-200/80 bg-slate-100/80 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300">
                {maskPhone(session.phone)}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="rounded-2xl bg-[#0084E8] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#006EC4]"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
