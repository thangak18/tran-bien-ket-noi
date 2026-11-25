import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Inbox, Wrench } from 'lucide-react';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { useAppStore } from '@/store/AppStore';
import { DEPARTMENTS } from '@/domain/constants';
import { isDueSoon, isOverdue } from '@/domain/sorting';
import { formatDate } from '@/domain/format';
import { StatusChip } from '@/components/common/StatusChip';

export function OfficerStats() {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const now = state.settings.demoNow;

  const stats = useMemo(() => {
    const reports = state.reports;
    const total = reports.length;
    const fresh = reports.filter((r) => r.status === 'moi').length;
    const inProgress = reports.filter((r) =>
      ['da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'mo_lai', 'can_bo_sung'].includes(r.status)
    ).length;
    const completed = reports.filter((r) => ['hoan_thanh', 'dong'].includes(r.status)).length;
    const overdueList = reports.filter((r) => isOverdue(r, now));
    const dueSoonCount = reports.filter((r) => !isOverdue(r, now) && isDueSoon(r, now)).length;

    const byDepartment = DEPARTMENTS.map((dept) => {
      const items = reports.filter((r) => r.department === dept);
      const done = items.filter((r) => ['hoan_thanh', 'dong'].includes(r.status)).length;
      const overdue = items.filter((r) => isOverdue(r, now)).length;
      return { dept, total: items.length, done, overdue };
    });

    const onTimeRate = total > 0 ? Math.round(((total - overdueList.length) / total) * 100) : 100;

    return {
      total,
      fresh,
      inProgress,
      completed,
      overdueList,
      dueSoonCount,
      byDepartment,
      onTimeRate,
    };
  }, [state.reports, now]);

  return (
    <OfficerLayout>
      <div className="space-y-5 animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              data-testid="screen-title"
              className="text-xl font-extrabold text-[var(--color-text)] flex items-center gap-2"
            >
              <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
              Thống kê điều hành cán bộ
            </h1>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Theo dõi khối lượng tiếp nhận, tiến độ theo bộ phận và hồ sơ quá hạn
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold text-[var(--color-text)]">
            Đúng hạn: {stats.onTimeRate}%
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Chờ tiếp nhận</span>
              <Inbox className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[var(--color-text)]">
              {stats.fresh}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Trên tổng {stats.total} hồ sơ
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Đang điều phối</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.inProgress}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {stats.dueSoonCount} sắp đến hạn
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Quá hạn xử lý</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {stats.overdueList.length}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Cần đôn đốc ngay
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Đã hoàn thành</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.completed}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% tổng số
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Department Workload */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
              <span>Tiến độ theo bộ phận</span>
            </div>
            <div className="space-y-3">
              {stats.byDepartment.map((item) => {
                const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0;
                return (
                  <div key={item.dept} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--color-text)]">{item.dept}</span>
                      <span className="text-[var(--color-text-muted)]">
                        {item.done}/{item.total} xong
                        {item.overdue > 0 ? ` · ${item.overdue} quá hạn` : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue Action List */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span>Hồ sơ quá hạn cần xử lý</span>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {stats.overdueList.length} vụ
              </span>
            </div>

            {stats.overdueList.length === 0 ? (
              <div className="rounded-xl bg-[var(--color-bg)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                Không có hồ sơ nào quá hạn.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {stats.overdueList.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`/can-bo/${r.id}`)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-elevated)] rounded-lg px-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--color-primary)]">{r.id}</div>
                      <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                        {r.title || r.address}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Hạn: {r.dueAt ? formatDate(r.dueAt) : '–'} · {r.department || 'Chưa phân'}
                      </div>
                    </div>
                    <StatusChip status={r.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </OfficerLayout>
  );
}
