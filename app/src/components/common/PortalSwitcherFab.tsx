import { useEffect, useRef, useState } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Check, Settings, Shield, ShieldCheck, Users } from 'lucide-react';

interface PortalItem {
  id: 'citizen' | 'officer' | 'volunteer' | 'admin';
  label: string;
  to: string;
  icon: typeof Users;
}

const PORTALS: PortalItem[] = [
  { id: 'citizen', label: 'Cổng Người dân', to: '/', icon: Users },
  { id: 'officer', label: 'Cổng Cán bộ phường', to: '/can-bo', icon: ShieldCheck },
  { id: 'volunteer', label: 'Cổng Tình nguyện viên', to: '/tnv', icon: Shield },
  { id: 'admin', label: 'Cổng Quản trị', to: '/quan-tri', icon: Settings },
];

function PortalSwitcherFabInner({ pathname, inRouter }: { pathname: string; inRouter: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeId: PortalItem['id'] = pathname.startsWith('/can-bo')
    ? 'officer'
    : pathname.startsWith('/tnv')
      ? 'volunteer'
      : pathname.startsWith('/quan-tri')
        ? 'admin'
        : 'citizen';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-testid="portal-switcher-fab"
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2"
    >
      {open && (
        <div
          role="menu"
          aria-label="Chuyển cổng nghiệp vụ"
          className="w-60 animate-fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">
            Chuyển cổng nghiệp vụ
          </div>
          <div className="space-y-0.5">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              const isActive = portal.id === activeId;
              const itemClass = `flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
              }`;
              const content = (
                <>
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{portal.label}</span>
                  </span>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </>
              );

              return inRouter ? (
                <Link
                  key={portal.id}
                  to={portal.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  {content}
                </Link>
              ) : (
                <a
                  key={portal.id}
                  href={portal.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Chuyển cổng nghiệp vụ"
        className="flex h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-xs font-extrabold text-[var(--color-text)] shadow-[0_8px_24px_rgba(15,23,42,0.16)] transition-all duration-150 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] active:scale-95"
      >
        <ArrowLeftRight className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
        <span className="hidden sm:inline">Chuyển cổng</span>
      </button>
    </div>
  );
}

function PortalSwitcherFabWithRouter() {
  const { pathname } = useLocation();
  return <PortalSwitcherFabInner pathname={pathname} inRouter />;
}

export function PortalSwitcherFab() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <PortalSwitcherFabWithRouter />;
  }
  const fallback = typeof window !== 'undefined' ? window.location.pathname : '/';
  return <PortalSwitcherFabInner pathname={fallback} inRouter={false} />;
}
