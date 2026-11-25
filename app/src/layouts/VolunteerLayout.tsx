import { ReactNode, useState } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { ChevronRight, ClipboardList, Map, Phone, ShieldCheck, User, Users } from 'lucide-react';
import { HotlineModal } from '../components/common/HotlineModal';

interface VolunteerLayoutProps {
  children: ReactNode;
}

function NotchedDockBackground() {
  return (
    <svg
      viewBox="0 0 320 68"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    >
      <path
        d="M 30,12 L 114,12 C 128,12 135,40 160,40 C 185,40 192,12 206,12 L 290,12 A 27,27 0 0 1 290,66 L 30,66 A 27,27 0 0 1 30,12 Z"
        fill="var(--color-nav-bg)"
        stroke="var(--color-nav-border)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function VolunteerDesktopSidebar({ onOpenHotline }: { onOpenHotline: () => void }) {
  const { pathname } = useLocation();
  const isMapActive = pathname === '/tnv/ban-do';
  const isProfileActive = pathname === '/tnv/ho-so';
  const isTasksActive =
    pathname === '/tnv' || (pathname.startsWith('/tnv/') && !isMapActive && !isProfileActive);

  const mainNavItems = [
    {
      to: '/tnv',
      label: 'Nhiệm vụ xác minh',
      active: isTasksActive,
      icon: <ClipboardList className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: '/tnv/ban-do',
      label: 'Bản đồ nhiệm vụ',
      active: isMapActive,
      icon: <Map className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: '/tnv/ho-so',
      label: 'Hồ sơ TNV',
      active: isProfileActive,
      icon: <User className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <aside
      data-testid="volunteer-sidebar"
      aria-label="Thanh điều hướng tình nguyện viên máy tính"
      className="hidden md:flex md:w-[228px] lg:w-[272px] shrink-0 flex-col border-r border-slate-200/85 bg-[var(--color-surface)] px-3 lg:px-4 py-5 sticky top-0 h-screen select-none dark:border-slate-800"
    >
      {/* 1. Brand Identity Header */}
      <Link
        to="/tnv"
        className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 mb-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0084E8] to-[#0066B8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.28)] transition-transform group-hover:scale-105">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-extrabold tracking-tight text-[var(--color-text)]">
            Trấn Biên Kết Nối
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Tình nguyện viên khu phố</span>
          </div>
        </div>
      </Link>

      {/* 2. Main Navigation Menu */}
      <div className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Nghiệp vụ xác minh
      </div>
      <nav className="space-y-1.5" aria-label="Điều hướng TNV trên máy tính">
        {mainNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`group relative flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all ${
              item.active
                ? 'bg-[#E6F3FD] font-extrabold text-[#0084E8] shadow-2xs dark:bg-sky-950/70 dark:text-[#38BDF8]'
                : 'font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  item.active
                    ? 'bg-[#0084E8] text-white shadow-xs dark:bg-[#38BDF8] dark:text-slate-950'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0084E8] dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
            {item.active ? (
              <span className="h-2 w-2 rounded-full bg-[#0084E8] dark:bg-[#38BDF8]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-slate-600" />
            )}
          </Link>
        ))}
      </nav>

      {/* 3. Role Switcher Box */}
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Chuyển cổng nghiệp vụ
        </div>
        <div className="space-y-1">
          <Link
            to="/"
            className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold text-slate-600 transition-colors duration-150 hover:bg-white hover:text-[#0084E8] hover:shadow-2xs dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-[#38BDF8]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-2xs group-hover:text-[#0084E8] dark:bg-slate-800 dark:text-slate-400">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>Cổng Người dân</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            to="/can-bo"
            className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold text-slate-600 transition-colors duration-150 hover:bg-white hover:text-[#0084E8] hover:shadow-2xs dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-[#38BDF8]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-2xs group-hover:text-[#0084E8] dark:bg-slate-800 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>Cổng Cán bộ phường</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* 4. Hotline & Ward Attribution Footer */}
      <div className="mt-auto space-y-3 pt-4">
        <button
          type="button"
          onClick={onOpenHotline}
          className="group flex w-full items-center justify-between gap-2.5 rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-50/90 to-emerald-50/60 p-3 text-left transition-all hover:border-teal-300 hover:shadow-xs dark:border-teal-800/80 dark:from-teal-950/50 dark:to-emerald-950/30"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-xs transition-transform group-hover:scale-105">
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-xs font-extrabold text-teal-950 dark:text-teal-100">
                Tổng đài điều phối
              </div>
              <div className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                0251 382 0000 (nhánh 2)
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-teal-600/70 transition-transform group-hover:translate-x-0.5 dark:text-teal-400" />
        </button>

        <div className="flex items-center justify-between border-t border-slate-200/80 px-2 pt-3 dark:border-slate-800">
          <div>
            <div className="text-xs font-extrabold text-[var(--color-text)]">
              UBND Phường Trấn Biên
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Mạng lưới xác minh hiện trường
            </div>
          </div>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            v1.2
          </span>
        </div>
      </div>
    </aside>
  );
}

function VolunteerMobileChrome({ onOpenHotline }: { onOpenHotline: () => void }) {
  const { pathname } = useLocation();

  if (pathname.startsWith('/bao-su-co')) {
    return null;
  }

  const isMapActive = pathname === '/tnv/ban-do';
  const isProfileActive = pathname === '/tnv/ho-so';
  const isTasksActive =
    pathname === '/tnv' || (pathname.startsWith('/tnv/') && !isMapActive && !isProfileActive);
  const showHotline = pathname === '/tnv' || pathname === '/tnv/ho-so';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-2.5 md:hidden">
      <div className="flex w-full max-w-[420px] items-end gap-2">
        {/* Compact Curved Notched 3-Item Bottom Navbar */}
        <nav
          aria-label="Điều hướng tình nguyện viên"
          data-testid="volunteer-bottom-nav"
          className="pointer-events-auto relative h-[68px] flex-1 overflow-visible"
        >
          <NotchedDockBackground />
          <div className="relative z-10 grid h-full grid-cols-3 items-end px-2 pb-2.5 pt-1">
            <Link
              to="/tnv"
              className={`flex flex-col items-center justify-end gap-0.5 rounded-xl px-1 py-0.5 text-[11px] leading-tight transition-colors ${
                isTasksActive
                  ? 'font-bold text-[#0084E8] dark:text-[#38BDF8]'
                  : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              <span>Nhiệm vụ</span>
            </Link>

            <Link
              to="/tnv/ban-do"
              aria-label="Bản đồ"
              className="group flex flex-col items-center justify-end gap-1"
            >
              <span className="-mt-6 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#0084E8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.45)] transition-transform group-hover:scale-105 group-active:scale-95">
                <Map className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className="text-[11px] font-bold leading-tight text-[#0084E8] dark:text-[#38BDF8]">
                Bản đồ
              </span>
            </Link>

            <Link
              to="/tnv/ho-so"
              className={`flex flex-col items-center justify-end gap-0.5 rounded-xl px-1 py-0.5 text-[11px] leading-tight transition-colors ${
                isProfileActive
                  ? 'font-bold text-[#0084E8] dark:text-[#38BDF8]'
                  : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <User className="h-5 w-5" aria-hidden="true" />
              <span>Hồ sơ</span>
            </Link>
          </div>
        </nav>

        {/* Inline Floating Call Button sitting on the same horizontal row next to the notched navbar */}
        {showHotline && (
          <button
            type="button"
            onClick={onOpenHotline}
            aria-label="Đường dây nóng hỗ trợ"
            data-testid="hotline-fab"
            className="pointer-events-auto mb-[2px] flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--color-nav-border)] bg-[var(--color-nav-bg)] p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#0D9488] text-white shadow-[0_4px_12px_rgba(15,118,110,0.38)]">
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function VolunteerLayout({ children }: VolunteerLayoutProps) {
  const inRouter = useInRouterContext();
  const [hotlineOpen, setHotlineOpen] = useState(false);

  return (
    <div className="min-h-screen theme-outer-bg flex flex-row justify-center md:justify-start">
      {inRouter && <VolunteerDesktopSidebar onOpenHotline={() => setHotlineOpen(true)} />}

      <div
        data-testid="volunteer-layout-container"
        className="w-full max-w-[430px] md:max-w-none flex-1 min-w-0 min-h-screen theme-surface shadow-sm relative flex flex-col"
      >
        <main className="flex-1 flex flex-col pb-28 md:pb-8">{children}</main>
        {inRouter && <VolunteerMobileChrome onOpenHotline={() => setHotlineOpen(true)} />}
      </div>

      {/* Unified Hotline Modal */}
      <HotlineModal
        isOpen={hotlineOpen}
        onClose={() => setHotlineOpen(false)}
        defaultLineId="emergency"
      />
    </div>
  );
}
