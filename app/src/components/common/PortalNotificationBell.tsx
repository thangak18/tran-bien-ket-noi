import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCircle2, Clock, Inbox, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { isOverdue } from '@/domain/sorting';
import { enableWebPushNotifications, getNotificationPermission } from '@/lib/webPush';

export interface PortalNotificationBellProps {
  role: 'officer' | 'volunteer';
  volunteerName?: string;
}

interface PortalAlertItem {
  id: string;
  kind: 'new' | 'verified' | 'overdue' | 'task';
  title: string;
  subtitle: string;
  to: string;
}

export function PortalNotificationBell({ role, volunteerName }: PortalNotificationBellProps) {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const rootRef = useRef<HTMLDivElement>(null);

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

  const items = useMemo<PortalAlertItem[]>(() => {
    const now = state.settings.demoNow;

    if (role === 'volunteer') {
      const reportMap = new Map(state.reports.map((r) => [r.id, r]));
      const pendingTasks = state.volunteerTasks.filter(
        (t) =>
          t.status !== 'xong' &&
          (!volunteerName || t.assignee === null || t.assignee === volunteerName)
      );
      return pendingTasks.map((t) => {
        const rep = reportMap.get(t.reportId);
        return {
          id: `tnv-${t.id}`,
          kind: 'task',
          title: `Cần xác minh ${t.reportId}`,
          subtitle: rep?.address || 'Địa điểm tại P. Trấn Biên',
          to: `/tnv/${t.id}`,
        };
      });
    }

    const alerts: PortalAlertItem[] = [];

    // 1. TNV đã xác minh xong
    for (const r of state.reports) {
      if (['moi', 'da_tiep_nhan', 'cho_xac_minh', 'mo_lai'].includes(r.status)) {
        const doneTask = state.volunteerTasks.find(
          (t) => t.reportId === r.id && t.status === 'xong'
        );
        if (doneTask) {
          alerts.push({
            id: `verified-${r.id}`,
            kind: 'verified',
            title: `TNV đã xác minh xong ${r.id}`,
            subtitle: `${doneTask.assignee || 'TNV'} · ${r.address}`,
            to: `/can-bo/${r.id}`,
          });
        }
      }
    }

    // 2. Phản ánh mới chờ tiếp nhận
    for (const r of state.reports) {
      if (r.status === 'moi') {
        alerts.push({
          id: `new-${r.id}`,
          kind: 'new',
          title: `Phản ánh mới ${r.id}`,
          subtitle: r.address,
          to: `/can-bo/${r.id}`,
        });
      }
    }

    // 3. Quá hạn SLA
    for (const r of state.reports) {
      if (isOverdue(r, now)) {
        alerts.push({
          id: `overdue-${r.id}`,
          kind: 'overdue',
          title: `Quá hạn xử lý ${r.id}`,
          subtitle: `${r.department || 'Chưa phân công'} · ${r.address}`,
          to: `/can-bo/${r.id}`,
        });
      }
    }

    return alerts.slice(0, 15);
  }, [role, state.reports, state.volunteerTasks, state.settings.demoNow, volunteerName]);

  const handleEnablePush = async () => {
    const res = await enableWebPushNotifications({ role });
    if (res.ok) {
      setPermission('granted');
    } else {
      setPermission(getNotificationPermission());
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid={`portal-notif-bell-${role}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Thông báo ${role === 'officer' ? 'cán bộ' : 'tình nguyện viên'}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {items.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-sm">
            {items.length > 99 ? '99+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Danh sách thông báo"
          className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-fade-up"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text)]">
              Thông báo {role === 'officer' ? 'Cán bộ' : 'Tình nguyện viên'} ({items.length})
            </div>
            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                type="button"
                onClick={() => void handleEnablePush()}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300"
              >
                <BellRing className="h-3 w-3" />
                Bật đẩy
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                {role === 'officer'
                  ? 'Hiện chưa có phản ánh mới hay thông báo xác minh từ TNV.'
                  : 'Hiện chưa có địa điểm nào cần xác minh.'}
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(item.to);
                  }}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-[var(--color-surface-elevated)]"
                >
                  <span className="mt-0.5 shrink-0">
                    {item.kind === 'verified' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {item.kind === 'new' && (
                      <Inbox className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    )}
                    {item.kind === 'overdue' && (
                      <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    )}
                    {item.kind === 'task' && (
                      <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-[var(--color-text)]">
                      {item.title}
                    </div>
                    <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
