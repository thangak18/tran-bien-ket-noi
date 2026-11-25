import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, isApiMode } from '@/lib/api';
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
import { useAppStore } from '@/store/AppStore';
import { maskPhone } from '@/domain/privacy';
import { formatDistance } from '@/domain/format';
import { FontScale } from '@/domain/types';
import { applyFontScale, resolveFontScale } from '@/lib/senior';
import { applyTheme, getInitialTheme, ThemeMode } from '@/lib/theme';
import { CitizenAccountRecord } from '@/lib/accounts';
import {
  clearVolunteerSession,
  getVolunteerSession,
  MOCK_VOLUNTEER_ACCOUNTS,
  setVolunteerSession,
  VolunteerSession,
} from '@/lib/portalSession';
import { HotlineModal } from '@/components/common/HotlineModal';
import { PortalAuthFlow } from '@/components/common/PortalAuthFlow';
import { PortalSettingsCards } from '@/components/common/PortalSettingsCards';
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

export function VolunteerProfileView({
  onVolunteerChange,
  todoCount,
  doneCount,
  nearestMeters,
  hasGps,
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
  const [gpsEnabled, setGpsEnabled] = useState(hasGps);
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [session, setSession] = useState<VolunteerSession | null>(() => getVolunteerSession());
  const [draftName, setDraftName] = useState(session?.name ?? '');
  const [draftArea, setDraftArea] = useState(session?.area ?? 'Đội TNV P. Trấn Biên');

  const fontScale = resolveFontScale(state.settings);

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
    if (isApiMode()) {
      // Đăng nhập thật: xoá token và tài khoản ở thiết bị rồi về màn đăng nhập.
      clearSession();
      navigate('/dang-nhap', { replace: true });
      return;
    }
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

  const handleResetDemo = () => {
    dispatch({ type: 'RESET' });
    showToast('Đã khôi phục dữ liệu mẫu');
  };

  if (subView === 'auth') {
    return (
      <PortalAuthFlow
        portalLabel="Tình nguyện viên"
        roleSummary="Nhận nhiệm vụ xác minh, chụp ảnh hiện trường thực tế và báo cáo về UBND phường."
        accent="emerald"
        defaultAddress="Đội TNV P. Trấn Biên"
        addressLabel="Đội / Khu phố phụ trách"
        addressPlaceholder="VD: Đội TNV Khu phố 3"
        reports={state.reports}
        mockAccounts={MOCK_VOLUNTEER_ACCOUNTS.map((a) => ({
          name: a.name,
          subtitle: a.area,
          address: a.area,
          phone: a.phone,
        }))}
        onCancel={() => setSubView('main')}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (subView === 'settings') {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 animate-fade-up">
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSubView('main')}
            aria-label="Quay lại hồ sơ"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Cài đặt tình nguyện viên</h1>
        </div>

        <PortalSettingsCards
          accent="emerald"
          theme={theme}
          onToggleTheme={handleToggleTheme}
          fontScale={fontScale}
          onSelectFontScale={handleSelectFontScale}
          notificationsEnabled={notifEnabled}
          onToggleNotifications={onToggleNotif}
          gpsEnabled={gpsEnabled}
          onToggleGps={() => setGpsEnabled((v) => !v)}
          onOpenHotline={() => setHotlineOpen(true)}
          onOpenPrivacy={() => setPrivacyOpen(true)}
          onResetDemo={handleResetDemo}
        />

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
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 animate-fade-up">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

      {/* Hero Card */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  data-testid="screen-title"
                  className="text-lg font-extrabold text-[var(--color-text)]"
                >
                  {session ? session.name : 'Chưa đăng nhập'}
                </h1>
                {session && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    Tình nguyện viên
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                {session ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {session.area}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {maskPhone(session.phone)}
                    </span>
                  </>
                ) : (
                  <span>Đăng nhập tài khoản tình nguyện viên để nhận nhiệm vụ hiện trường</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(session.name);
                    setDraftArea(session.area);
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]"
              >
                <LogIn className="h-3.5 w-3.5" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Role & Duties */}
        <div className="mt-4 rounded-2xl bg-[var(--color-bg)] px-3.5 py-2.5 text-xs text-[var(--color-text-muted)]">
          <span className="font-bold text-[var(--color-text)]">Vai trò Tình nguyện viên: </span>
          Đi hiện trường xác minh sự cố, đánh giá mức độ, chụp ảnh tại chỗ và nghiệm thu sau xử lý
          cho UBND phường.
        </div>

        {/* Task KPI Strip */}
        {session && (
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-center">
              <div className="text-lg font-extrabold text-yellow-500 dark:text-yellow-400">
                {todoCount}
              </div>
              <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Đang chờ
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-center">
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {doneCount}
              </div>
              <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Đã xong
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--color-bg)] px-3 py-2.5 text-center">
              <div className="text-lg font-extrabold text-[var(--color-text)]">
                {nearestMeters !== null ? formatDistance(nearestMeters) : '–'}
              </div>
              <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Gần nhất
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/tnv/thong-ke')}
          className="flex w-full items-center justify-between p-4 text-left transition-colors duration-150 hover:bg-[var(--color-surface-elevated)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--color-text)]">Thống kê hiện trường</div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Nhiệm vụ xác minh, nghiệm thu &amp; kết quả đã gửi
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
                Cài đặt giao diện &amp; ứng dụng
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Nền sáng/tối, cỡ chữ, thông báo, GPS
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Cập nhật hồ sơ tình nguyện viên"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-muted)]">
              Họ và tên
            </label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-muted)]">
              Đội / Khu phố phụ trách
            </label>
            <input
              type="text"
              value={draftArea}
              onChange={(e) => setDraftArea(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="btn-primary-action flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Lưu thay đổi
          </button>
        </div>
      </Modal>
    </div>
  );
}
