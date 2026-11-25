import { ReactNode, useState, useEffect } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { Shield, Inbox, BarChart3, Search, Plus, User, Sun, Moon, LogIn } from 'lucide-react';
import { Button } from '@/components/ui';
import { getOfficerSession, OfficerSession, SESSION_CHANGE_EVENT } from '@/lib/portalSession';
import { applyTheme, getInitialTheme, ThemeMode } from '@/lib/theme';

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
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const session = useOfficerSession();
  const officerInfo = {
    name: session?.name ?? 'Chưa đăng nhập',
    unit: session?.unit ?? 'Nhấn để đăng nhập',
    signedIn: Boolean(session),
  };

  const isInboxActive =
    pathname === '/can-bo' ||
    (pathname.startsWith('/can-bo/') &&
      !pathname.startsWith('/can-bo/thong-ke') &&
      !pathname.startsWith('/can-bo/ho-so'));
  const isStatsActive = pathname.startsWith('/can-bo/thong-ke');
  const isProfileActive = pathname.startsWith('/can-bo/ho-so');

  const navItems = [
    { to: '/can-bo', label: 'Hộp tiếp nhận', icon: Inbox, active: isInboxActive },
    { to: '/can-bo/thong-ke', label: 'Thống kê', icon: BarChart3, active: isStatsActive },
    { to: '/can-bo/ho-so', label: 'Hồ sơ & Cài đặt', icon: User, active: isProfileActive },
  ];

  const renderNavLink = (
    to: string,
    className: string,
    content: ReactNode,
    ariaCurrent?: 'page'
  ) =>
    inRouter ? (
      <Link key={to} to={to} aria-current={ariaCurrent} className={className}>
        {content}
      </Link>
    ) : (
      <a key={to} href={to} aria-current={ariaCurrent} className={className}>
        {content}
      </a>
    );

  return (
    <div className="min-h-screen flex flex-row bg-[var(--color-bg)] text-[var(--color-text)] pb-20 md:pb-0">
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0084E8] to-[#0066B8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.24)] transition-transform duration-150 group-hover:scale-105">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
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
        <div className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Điều hành nội bộ
        </div>
        <nav className="space-y-1.5" aria-label="Điều hướng cán bộ">
          {navItems.map((item) => {
            const Icon = item.icon;
            return renderNavLink(
              item.to,
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-[13.5px] transition-all duration-150 ${
                item.active
                  ? 'bg-sky-50 text-sky-700 shadow-2xs dark:bg-sky-950/60 dark:text-sky-300'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              }`,
              <>
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </>,
              item.active ? 'page' : undefined
            );
          })}
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
        {/* Top Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 md:px-6 py-3">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
            {renderNavLink(
              '/can-bo/ho-so',
              'flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-slate-100/70 dark:hover:bg-slate-800/60',
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">
                    {officerInfo.name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">Phường Trấn Biên</div>
                </div>
              </>
            )}

            <div className="flex w-full sm:w-auto sm:flex-1 sm:max-w-xl items-center justify-end gap-2">
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

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
                }
                title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-5">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        data-testid="officer-bottom-nav"
        aria-label="Điều hướng cán bộ di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[var(--color-nav-border)] bg-[var(--color-nav-bg)] px-2 py-2 backdrop-blur-md"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return renderNavLink(
            item.to,
            `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-[11px] font-bold transition-colors duration-150 ${
              item.active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`,
            <>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label === 'Hồ sơ & Cài đặt' ? 'Tài khoản' : item.label}</span>
            </>,
            item.active ? 'page' : undefined
          );
        })}
      </nav>
    </div>
  );
}
