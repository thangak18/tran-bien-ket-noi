import { useEffect, useMemo, useState } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  buildOfficerNotifications,
  buildVolunteerNotifications,
  PortalNotification,
  PortalNotificationKind,
} from '@/domain/notifications';
import { formatDateTime } from '@/domain/format';
import { DEMO_NOW } from '@/domain/constants';
import { useOptionalAppStore } from '@/store/AppStore';

export interface PortalNotificationBellProps {
  role: 'officer' | 'volunteer';
  volunteerName?: string | null;
  variant?: 'icon' | 'sidebar';
  className?: string;
}

function readKey(role: 'officer' | 'volunteer'): string {
  return `tbkn:notif-read:${role}`;
}

function loadReadIds(role: 'officer' | 'volunteer'): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(readKey(role));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveReadIds(role: 'officer' | 'volunteer', ids: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(readKey(role), JSON.stringify(Array.from(new Set(ids))));
}

function kindStyle(kind: PortalNotificationKind): {
  badgeClass: string;
  icon: typeof Bell;
} {
  switch (kind) {
    case 'overdue':
    case 'reopened':
    case 'tnv_recheck':
      return {
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
        icon: kind === 'reopened' ? RotateCcw : AlertTriangle,
      };
    case 'due_soon':
      return {
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
        icon: Clock,
      };
    case 'tnv_done':
    case 'tnv_assigned':
      return {
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
        icon: ClipboardCheck,
      };
    default:
      return {
        badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
        icon: Inbox,
      };
  }
}

function PortalNotificationBellInner({
  role,
  volunteerName = null,
  variant = 'icon',
  className = '',
  onNavigate,
}: PortalNotificationBellProps & { onNavigate: (to: string) => void }) {
  const store = useOptionalAppStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds(role));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === readKey(role)) {
        setReadIds(loadReadIds(role));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [role]);

  const notifications = useMemo<PortalNotification[]>(() => {
    if (!store) return [];
    const { state } = store;
    const now = state.settings.demoNow || DEMO_NOW;
    if (role === 'officer') {
      return buildOfficerNotifications(state.reports, state.volunteerTasks, now);
    }
    return buildVolunteerNotifications(state.reports, state.volunteerTasks, volunteerName, now);
  }, [role, store, volunteerName]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !readSet.has(n.id)).length,
    [notifications, readSet]
  );

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !readSet.has(n.id)) : notifications),
    [filter, notifications, readSet]
  );

  const markRead = (id: string) => {
    if (readSet.has(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    saveReadIds(role, next);
  };

  const markAllRead = () => {
    const next = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    setReadIds(next);
    saveReadIds(role, next);
  };

  const ariaLabel =
    role === 'officer'
      ? `Thông báo cán bộ (${unreadCount} chưa đọc)`
      : `Thông báo tình nguyện viên (${unreadCount} chưa đọc)`;

  const sheetTitle = role === 'officer' ? 'Thông báo điều hành' : 'Chỉ thị & Nhiệm vụ TNV';

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
          className={`group relative flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white ${className}`}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-[#0084E8] dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-[#38BDF8]">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Thông báo</span>
          </span>
          {unreadCount > 0 && (
            <span
              data-testid="portal-notif-badge"
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-extrabold text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs transition hover:border-[#0084E8]/50 hover:text-[#0084E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] ${className}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              data-testid="portal-notif-badge"
              className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex w-full items-center justify-between gap-2 pr-2">
            <span>{sheetTitle}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E6F3FD] px-2.5 py-1 text-xs font-bold text-[#0084E8] hover:bg-[#BAE6FD]/70 dark:bg-sky-950/60 dark:text-[#38BDF8]"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Đánh dấu đã đọc</span>
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 transition ${
                filter === 'all'
                  ? 'bg-[#0084E8] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3 py-1.5 transition ${
                filter === 'unread'
                  ? 'bg-[#0084E8] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-10 text-center text-sm text-[var(--color-text-muted)]">
              {filter === 'unread' ? 'Bạn đã đọc hết thông báo.' : 'Hiện chưa có thông báo nào.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((item) => {
                const isUnread = !readSet.has(item.id);
                const { badgeClass, icon: Icon } = kindStyle(item.kind);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      markRead(item.id);
                      setOpen(false);
                      onNavigate(item.to);
                    }}
                    className={`w-full rounded-2xl border p-3.5 text-left transition hover:border-[#0084E8]/50 ${
                      isUnread
                        ? 'border-[#BAE6FD] bg-[#F0F9FF]/80 dark:border-sky-800/80 dark:bg-sky-950/35'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        <span>{item.badge}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-[#0084E8]" aria-hidden="true" />
                        )}
                        <span>{formatDateTime(item.at)}</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-[var(--color-text)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                      {item.message}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0084E8] dark:text-[#38BDF8]">
                      <span>{role === 'officer' ? 'Mở hồ sơ' : 'Mở nhiệm vụ'}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

function PortalNotificationBellWithRouter(props: PortalNotificationBellProps) {
  const navigate = useNavigate();
  return <PortalNotificationBellInner {...props} onNavigate={(to) => navigate(to)} />;
}

export function PortalNotificationBell(props: PortalNotificationBellProps) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <PortalNotificationBellWithRouter {...props} />;
  }
  return (
    <PortalNotificationBellInner
      {...props}
      onNavigate={(to) => {
        if (typeof window !== 'undefined') window.location.assign(to);
      }}
    />
  );
}
