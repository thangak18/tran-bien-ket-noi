import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, ClipboardCheck, Clock, Compass, ShieldCheck } from 'lucide-react';
import { VolunteerLayout } from '@/layouts/VolunteerLayout';
import { useAppStore } from '@/store/AppStore';
import { getVolunteerSession } from '@/lib/portalSession';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { formatDateTime } from '@/domain/format';

export function VolunteerStats() {
  const { state } = useAppStore();
  const navigate = useNavigate();
  const session = getVolunteerSession();
  const currentVolunteer = session?.name ?? null;

  const stats = useMemo(() => {
    const tasks = state.volunteerTasks;
    const openCount = tasks.filter((t) => t.status === 'cho_nhan').length;
    const myDoing = currentVolunteer
      ? tasks.filter((t) => t.assignee === currentVolunteer && t.status === 'dang_lam').length
      : 0;
    const myDoneList = currentVolunteer
      ? tasks.filter((t) => t.assignee === currentVolunteer && t.status === 'xong')
      : [];
    const allDone = tasks.filter((t) => t.status === 'xong');
    const verifyCount = tasks.filter((t) => t.type === 'xac_minh').length;
    const inspectCount = tasks.filter((t) => t.type === 'nghiem_thu').length;

    const existsCo = allDone.filter((t) => t.result?.exists === 'co').length;
    const existsKhong = allDone.filter((t) => t.result?.exists === 'khong').length;
    const existsNotFound = allDone.filter((t) => t.result?.exists === 'khong_tim_thay').length;

    return {
      openCount,
      myDoing,
      myDoneList,
      allDoneCount: allDone.length,
      verifyCount,
      inspectCount,
      existsCo,
      existsKhong,
      existsNotFound,
    };
  }, [state.volunteerTasks, currentVolunteer]);

  return (
    <VolunteerLayout>
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6 space-y-4 animate-fade-up">
        <div>
          <h1
            data-testid="screen-title"
            className="text-xl font-extrabold text-[var(--color-text)] flex items-center gap-2"
          >
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Thống kê hiện trường TNV
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {currentVolunteer
              ? `Tổng hợp nhiệm vụ xác minh & nghiệm thu của ${currentVolunteer}`
              : 'Tổng hợp nhiệm vụ xác minh & nghiệm thu toàn đội'}
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Chờ nhận</span>
              <Compass className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[var(--color-text)]">
              {stats.openCount}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Đang làm</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.myDoing}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Bạn đã xong</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.myDoneList.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <span>Toàn đội xong</span>
              <ShieldCheck className="h-4 w-4 text-teal-500" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-[var(--color-text)]">
              {stats.allDoneCount}
            </div>
          </div>
        </div>

        {/* Task Type & Verification Result Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2.5">
            <div className="text-sm font-bold text-[var(--color-text)]">Loại nhiệm vụ</div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Xác minh ban đầu</span>
              <span className="font-bold text-[var(--color-text)]">{stats.verifyCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Nghiệm thu sau xử lý</span>
              <span className="font-bold text-[var(--color-text)]">{stats.inspectCount}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2.5">
            <div className="text-sm font-bold text-[var(--color-text)]">Kết quả xác minh</div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Có sự cố thực tế</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {stats.existsCo}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Không tồn tại</span>
              <span className="font-bold text-[var(--color-text)]">{stats.existsKhong}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Không tìm thấy vị trí</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {stats.existsNotFound}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Completed Tasks */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
            <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Nhiệm vụ bạn đã hoàn thành</span>
          </div>
          {stats.myDoneList.length === 0 ? (
            <div className="rounded-xl bg-[var(--color-bg)] p-5 text-center text-xs text-[var(--color-text-muted)]">
              Chưa có nhiệm vụ hoàn thành nào.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {stats.myDoneList.map((t) => {
                const report = state.reports.find((r) => r.id === t.reportId);
                const catLabel =
                  CATEGORY_CONFIGS.find((c) => c.key === report?.category)?.label ?? 'Sự cố';
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tnv/${t.id}`)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-elevated)] rounded-lg px-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {t.reportId} · {t.type === 'nghiem_thu' ? 'Nghiệm thu' : 'Xác minh'}
                      </div>
                      <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                        {report?.title || catLabel}
                      </div>
                      {t.result?.at && (
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          Gửi lúc {formatDateTime(t.result.at)}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[var(--color-primary)]">
                      Xem ›
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </VolunteerLayout>
  );
}
