import { ReactNode, useState, useEffect } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { Inbox, BarChart3, Search, Plus, User, LogIn, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { PortalNotificationBell } from '@/components/common/PortalNotificationBell';
import { getOfficerSession, OfficerSession, SESSION_CHANGE_EVENT } from '@/lib/portalSession';

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

export interface OfficerLayoutProps {
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onOpenOnBehalf?: () => void;
}

function useOfficerSession(): OfficerSession | null {
  const [session, setSession] = useState<OfficerSession | null>(() => getOfficerSession());

  useEffect(() => {
    const sync = () => setSession(getOfficerSession());
    window.addEventListener(SESSION_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SESSION_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return session;
}

function OfficerLayoutWithRouter(props: OfficerLayoutProps) {
  const { pathname } = useLocation();
  return <OfficerLayoutShell {...props} pathname={pathname} inRouter />;
}

export function OfficerLayout(props: OfficerLayoutProps) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <OfficerLayoutWithRouter {...props} />;
  }
  const fallbackPath = typeof window !== 'undefined' ? window.location.pathname : '/can-bo';
  return <OfficerLayoutShell {...props} pathname={fallbackPath} inRouter={false} />;
}

function OfficerLayoutShell({
  children,
  searchQuery = '',
  onSearchChange,
  onOpenOnBehalf,
  pathname,
  inRouter,
}: OfficerLayoutProps & { pathname: string; inRouter: boolean }) {
  const session = useOfficerSession();
  const officerInfo = {
    name: session?.name ?? 'Chưa đăng nhập',
    unit: session?.unit ?? 'Nhấn để đăng nhập',
    signedIn: Boolean(session),
  };

  const isStatsActive = pathname.startsWith('/can-bo/thong-ke');
  const isProfileActive = pathname.startsWith('/can-bo/ho-so');
  const isDetailPath = pathname.startsWith('/can-bo/') && !isStatsActive && !isProfileActive;
  const isInboxActive = pathname === '/can-bo' || isDetailPath;

  const navItems = [
    { to: '/can-bo', label: 'Hộp tiếp nhận', icon: Inbox, active: isInboxActive },
    { to: '/can-bo/thong-ke', label: 'Thống kê', icon: BarChart3, active: isStatsActive },
    { to: '/can-bo/ho-so', label: 'Hồ sơ & Cài đặt', icon: User, active: isProfileActive },
  ];

  const renderNavLink = (
    to: string,
    className: string,
    content: ReactNode,
    ariaCurrent?: 'page',
    ariaLabel?: string
  ) =>
    inRouter ? (
      <Link
        key={to}
        to={to}
        aria-current={ariaCurrent}
        aria-label={ariaLabel}
        className={className}
      >
        {content}
      </Link>
    ) : (
      <a key={to} href={to} aria-current={ariaCurrent} aria-label={ariaLabel} className={className}>
        {content}
      </a>
    );

  return (
    <div
      className={`min-h-screen flex flex-row bg-[var(--color-bg)] text-[var(--color-text)] ${
        isDetailPath ? 'pb-4 md:pb-0' : 'pb-24 md:pb-0'
      }`}
    >
      {/* Sidebar Desktop */}
      <aside
        data-testid="officer-sidebar"
        className="hidden md:flex md:w-[228px] lg:w-[264px] bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-col px-3 lg:px-4 py-5 shrink-0 sticky top-0 h-screen select-none"
      >
        {/* 1. Brand Identity Header */}
        {renderNavLink(
          '/can-bo',
          'group flex items-center gap-3 rounded-2xl px-2 py-1.5 mb-5 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
          <>
            <img
              src="/logo-app.jpg"
              alt="Logo Trấn Biên Kết Nối"
              className="h-10 w-10 shrink-0 rounded-2xl object-cover shadow-[0_6px_16px_rgba(0,132,232,0.24)] transition-transform duration-150 group-hover:scale-105"
            />
            <div className="min-w-0">
              <div className="truncate font-extrabold text-[var(--color-text)] text-[15px] tracking-tight">
                Trấn Biên Kết Nối
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0084E8] dark:text-[#38BDF8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0084E8] dark:bg-[#38BDF8]" />
                <span>Cổng cán bộ phường</span>
              </div>
            </div>
          </>
        )}

        {/* 2. Primary Navigation */}
        <div className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
          Điều hành nội bộ
        </div>
        <nav className="space-y-1.5" aria-label="Điều hướng cán bộ">
          {navItems.map((item) => {
            const Icon = item.icon;
            return renderNavLink(
              item.to,
              `group relative flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all ${
                item.active
                  ? 'bg-[#E6F3FD] font-extrabold text-[#0084E8] shadow-sm dark:bg-sky-950/70 dark:text-[#38BDF8] dark:ring-1 dark:ring-sky-800/60'
                  : 'font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
              }`,
              <>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      item.active
                        ? 'bg-[#0084E8] text-white shadow-xs dark:bg-[#38BDF8] dark:text-slate-950'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0084E8] dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-[#38BDF8]'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.active ? (
                  <span className="h-2 w-2 rounded-full bg-[#0084E8] dark:bg-[#38BDF8]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-slate-500" />
                )}
              </>,
              item.active ? 'page' : undefined
            );
          })}
          <PortalNotificationBell role="officer" variant="sidebar" />
        </nav>

        {/* 3. Officer Profile Footer */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          {renderNavLink(
            '/can-bo/ho-so',
            'flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 transition-colors duration-150 hover:border-sky-300 dark:hover:border-sky-700',
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                {officerInfo.signedIn ? (
                  <User className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-[var(--color-text)]">
                  {officerInfo.name}
                </div>
                <div className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
                  {officerInfo.signedIn ? 'UBND P. Trấn Biên' : 'Nhấn để đăng nhập'}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header (chỉ hiển thị khi có thanh tìm kiếm hoặc nút Tạo hộ) */}
        {(onSearchChange || onOpenOnBehalf) && (
          <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 md:px-6 py-3">
            <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-end gap-2">
              {onSearchChange && (
                <div className="relative flex-1 min-w-0 sm:max-w-sm">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm mã TB-... hoặc địa chỉ..."
                    aria-label="Tìm kiếm phản ánh"
                    className="w-full h-10 rounded-btn border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  />
                </div>
              )}

              <PortalNotificationBell role="officer" />

              {onOpenOnBehalf && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onOpenOnBehalf}
                  icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                  className="h-10 px-4 rounded-btn bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] whitespace-nowrap"
                >
                  Tạo hộ
                </Button>
              )}
            </div>
          </header>
        )}

        {/* Workspace */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-5">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Nav (floating notched dock matching Citizen & Volunteer portals) */}
      {!isDetailPath && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-2.5 md:hidden">
          <div className="flex w-full max-w-[420px] items-end gap-2">
            <nav
              data-testid="officer-bottom-nav"
              aria-label="Điều hướng cán bộ di động"
              className="pointer-events-auto relative h-[68px] flex-1 overflow-visible"
            >
              <NotchedDockBackground />
              <div className="relative z-10 grid h-full grid-cols-3 items-end px-2 pb-2.5 pt-1">
                {renderNavLink(
                  '/can-bo',
                  `flex flex-col items-center justify-end gap-0.5 rounded-xl px-1 py-0.5 text-[11px] leading-tight transition-colors ${
                    isInboxActive
                      ? 'font-bold text-[#0084E8] dark:text-[#38BDF8]'
                      : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`,
                  <>
                    <Inbox className="h-5 w-5" aria-hidden="true" />
                    <span>Hộp tiếp nhận</span>
                  </>,
                  isInboxActive ? 'page' : undefined
                )}

                {renderNavLink(
                  '/can-bo/thong-ke',
                  'group flex flex-col items-center justify-end gap-1',
                  <>
                    <span className="-mt-6 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#0084E8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.45)] transition-transform group-hover:scale-105 group-active:scale-95">
                      <BarChart3 className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-bold leading-tight text-[#0084E8] dark:text-[#38BDF8]">
                      Thống kê
                    </span>
                  </>,
                  isStatsActive ? 'page' : undefined,
                  'Thống kê'
                )}

                {renderNavLink(
                  '/can-bo/ho-so',
                  `flex flex-col items-center justify-end gap-0.5 rounded-xl px-1 py-0.5 text-[11px] leading-tight transition-colors ${
                    isProfileActive
                      ? 'font-bold text-[#0084E8] dark:text-[#38BDF8]'
                      : 'font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`,
                  <>
                    <User className="h-5 w-5" aria-hidden="true" />
                    <span>Hồ sơ</span>
                  </>,
                  isProfileActive ? 'page' : undefined
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
