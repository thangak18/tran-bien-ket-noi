import { ReactNode, useState } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { BarChart3, Camera, ChevronRight, MapPin, Phone, Plus, User } from 'lucide-react';
import { HotlineModal } from '../components/common/HotlineModal';

interface CitizenLayoutProps {
  children: ReactNode;
}

function DualSpeechBubblesIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Back outlined speech bubble */}
      <path
        d="M9 4.5C9 3.67 9.67 3 10.5 3H19.5C20.33 3 21 3.67 21 4.5V11.5C21 12.33 20.33 13 19.5 13H17.5V15.5L14.5 13H10.5C9.67 13 9 12.33 9 11.5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Front solid speech bubble */}
      <path
        d="M3 9.5C3 8.67 3.67 8 4.5 8H14.5C15.33 8 16 8.67 16 9.5V16.5C16 17.33 15.33 18 14.5 18H9L5.5 21V18H4.5C3.67 18 3 17.33 3 16.5V9.5Z"
        fill="currentColor"
      />
    </svg>
  );
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

function CitizenDesktopSidebar({ onOpenHotline }: { onOpenHotline: () => void }) {
  const { pathname } = useLocation();

  if (
    pathname === '/quanh-day' ||
    pathname === '/bao-su-co/anh' ||
    pathname === '/bao-su-co/vi-tri'
  ) {
    return null;
  }

  const isReportsActive =
    pathname === '/' || pathname.startsWith('/phan-anh') || pathname === '/tim-kiem';
  const isTransparencyActive = pathname === '/minh-bach';
  const isProfileActive = pathname === '/cua-toi' || pathname === '/ho-so';
  const isCreatingReport = pathname.startsWith('/bao-su-co');

  const mainNavItems = [
    {
      to: '/',
      label: 'Phản ánh cộng đồng',
      active: isReportsActive,
      icon: <DualSpeechBubblesIcon className="h-4 w-4" />,
    },
    {
      to: '/quanh-day',
      label: 'Bản đồ quanh đây',
      active: false,
      icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: '/minh-bach',
      label: 'Bảng thống kê',
      active: isTransparencyActive,
      icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
    },
    {
      to: '/cua-toi',
      label: 'Hồ sơ & Cài đặt',
      active: isProfileActive,
      icon: <User className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <aside
      data-testid="citizen-sidebar"
      aria-label="Thanh điều hướng máy tính"
      className="hidden md:flex md:w-[228px] lg:w-[272px] shrink-0 flex-col border-r border-slate-200/85 bg-[var(--color-surface)] px-3 lg:px-4 py-5 sticky top-0 h-screen select-none dark:border-slate-800"
    >
      {/* 1. Brand Identity Header */}
      <Link
        to="/"
        className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0084E8] to-[#0066B8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.28)] transition-transform group-hover:scale-105">
          <DualSpeechBubblesIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-extrabold tracking-tight text-[var(--color-text)]">
            Trấn Biên Kết Nối
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#0084E8] dark:text-[#38BDF8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0084E8] dark:bg-[#38BDF8]" />
            <span>Cổng phản ánh người dân</span>
          </div>
        </div>
      </Link>

      {/* 2. Primary CTA: Gửi phản ánh mới */}
      <div className="mt-5 mb-5 px-1">
        <Link
          to="/bao-su-co/anh"
          className={`group flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-extrabold text-white shadow-[0_8px_20px_-4px_rgba(0,132,232,0.38)] transition-all active:scale-[0.99] ${
            isCreatingReport
              ? 'bg-[#006EC4] ring-4 ring-[#0084E8]/20'
              : 'bg-gradient-to-r from-[#0084E8] to-[#0273C9] hover:from-[#0077D4] hover:to-[#0062B0] hover:shadow-[0_10px_24px_-4px_rgba(0,132,232,0.45)]'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
              <Camera className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Gửi phản ánh mới</span>
          </span>
          <Plus className="h-4 w-4 opacity-85 transition-transform group-hover:rotate-90" />
        </Link>
      </div>

      {/* 3. Main Navigation Links */}
      <div className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Danh mục chính
      </div>
      <nav className="space-y-1.5" aria-label="Điều hướng chính trên máy tính">
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

      {/* 4. Hotline Trigger & Ward Attribution Footer */}
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
                Đường dây nóng
              </div>
              <div className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                0251 382 0000 · Trực 24/7
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
              Tiếp nhận &amp; xử lý hiện trường
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

function CitizenMobileChrome({ onOpenHotline }: { onOpenHotline: () => void }) {
  const { pathname } = useLocation();

  if (
    pathname.startsWith('/bao-su-co') ||
    pathname.startsWith('/phan-anh/') ||
    pathname === '/thong-bao' ||
    pathname === '/quanh-day' ||
    pathname === '/minh-bach'
  ) {
    return null;
  }

  const isReportsActive =
    pathname === '/' ||
    pathname.startsWith('/phan-anh') ||
    pathname === '/quanh-day' ||
    pathname === '/minh-bach';
  const isProfileActive = pathname === '/cua-toi' || pathname === '/ho-so';
  const showHotline = pathname === '/' || pathname === '/cua-toi' || pathname === '/ho-so';

  return (
    /* Mobile-only Fixed Bottom Compact Notched Navbar + Side-by-Side Call Button (Hidden on PC md:hidden) */
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-2.5 md:hidden">
      <div className="flex w-full max-w-[420px] items-end gap-2">
        {/* Compact Curved Notched 3-Item Bottom Navbar */}
        <nav
          aria-label="Điều hướng người dân"
          data-testid="citizen-bottom-nav"
          className="pointer-events-auto relative h-[68px] flex-1 overflow-visible"
        >
          <NotchedDockBackground />
          <div className="relative z-10 grid h-full grid-cols-3 items-end px-2 pb-2.5 pt-1">
            <Link
              to="/"
              className={`flex flex-col items-center justify-end gap-0.5 rounded-xl px-1 py-0.5 text-[11px] leading-tight transition-colors ${
                isReportsActive
                  ? 'font-bold text-[#0084E8] dark:text-[#38BDF8]'
                  : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <DualSpeechBubblesIcon className="h-5 w-5" />
              <span>Phản ánh</span>
            </Link>

            <Link
              to="/bao-su-co/anh"
              aria-label="Gửi phản ánh"
              className="group flex flex-col items-center justify-end gap-1"
            >
              <span className="-mt-6 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#0084E8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.45)] transition-transform group-hover:scale-105 group-active:scale-95">
                <Camera className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className="text-[11px] font-bold leading-tight text-[#0084E8] dark:text-[#38BDF8]">
                Gửi phản ánh
              </span>
            </Link>

            <Link
              to="/cua-toi"
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

export function CitizenLayout({ children }: CitizenLayoutProps) {
  const inRouter = useInRouterContext();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isMapRoute = inRouter ? undefined : pathname === '/quanh-day';

  return (
    <CitizenLayoutInner inRouter={inRouter} fallbackIsMap={Boolean(isMapRoute)}>
      {children}
    </CitizenLayoutInner>
  );
}

function CitizenLayoutInner({
  children,
  inRouter,
  fallbackIsMap,
}: {
  children: ReactNode;
  inRouter: boolean;
  fallbackIsMap: boolean;
}) {
  return inRouter ? (
    <CitizenLayoutWithLocation>{children}</CitizenLayoutWithLocation>
  ) : (
    <div className="min-h-screen theme-outer-bg flex justify-center">
      <div
        data-testid="citizen-layout-container"
        className={`w-full ${
          fallbackIsMap ? 'max-w-none' : 'max-w-[430px] md:max-w-[960px]'
        } min-h-screen theme-surface shadow-sm relative flex flex-col`}
      >
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}

function CitizenLayoutWithLocation({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [hotlineOpen, setHotlineOpen] = useState(false);

  const isMap = pathname === '/quanh-day';
  const isPhotoStudio = pathname === '/bao-su-co/anh';
  const isDetail = pathname.startsWith('/phan-anh/') || pathname === '/thong-bao';
  const isFullBleed = pathname.startsWith('/bao-su-co') || isDetail || isMap;

  return (
    <div className="min-h-screen theme-outer-bg flex flex-row justify-center md:justify-start">
      {/* Desktop Left Sidebar (visible on md+, hidden on /quanh-day and /bao-su-co/anh) */}
      <CitizenDesktopSidebar onOpenHotline={() => setHotlineOpen(true)} />

      {/* Main Content Container */}
      <div
        data-testid="citizen-layout-container"
        className={`w-full ${
          isMap
            ? 'max-w-none h-[100dvh] overflow-hidden'
            : isPhotoStudio
              ? 'max-w-none min-h-[100dvh]'
              : 'max-w-[430px] md:max-w-none flex-1 min-w-0 min-h-screen'
        } theme-surface shadow-sm relative flex flex-col`}
      >
        <main className={`flex-1 flex flex-col ${isFullBleed ? '' : 'pb-28 md:pb-8'}`}>
          {children}
        </main>
        <CitizenMobileChrome onOpenHotline={() => setHotlineOpen(true)} />
      </div>

      {/* Unified Hotline Modal */}
      <HotlineModal isOpen={hotlineOpen} onClose={() => setHotlineOpen(false)} />
    </div>
  );
}
