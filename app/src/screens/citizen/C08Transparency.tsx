import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileBarChart2,
  Hourglass,
  Star,
} from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '@/store/AppStore';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { computeKpi } from '@/domain/kpi';
import { toPublicReport } from '@/domain/privacy';
import { formatDate, formatDays } from '@/domain/format';
import { Category, PublicReport } from '@/domain/types';
import { StatusChip } from '@/components/common/StatusChip';

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  den_duong: <CategoryIcon category="den_duong" className="h-4 w-4 text-amber-500" />,
  ngap_nuoc: <CategoryIcon category="ngap_nuoc" className="h-4 w-4 text-[#0084E8]" />,
  rac_thai: <CategoryIcon category="rac_thai" className="h-4 w-4 text-emerald-600" />,
  mat_duong: <CategoryIcon category="mat_duong" className="h-4 w-4 text-orange-500" />,
};

export interface C08TransparencyProps {
  backPath?: string;
  reportBasePath?: string;
}

export function C08Transparency({
  backPath = '/cua-toi',
  reportBasePath = '/phan-anh',
}: C08TransparencyProps = {}) {
  const { state } = useAppStore();
  const navigate = useNavigate();

  const currentMonth = state.settings.demoNow.slice(0, 7);
  const [yearPart, monthPart] = currentMonth.split('-');
  const monthLabel = `${Number(monthPart)}/${yearPart}`;

  const kpi = useMemo(
    () => computeKpi(state.reports, currentMonth, state.settings.demoNow),
    [state.reports, currentMonth, state.settings.demoNow]
  );

  const chartData = useMemo(
    () =>
      CATEGORY_CONFIGS.map((cat) => ({
        name: cat.label,
        resolved: kpi.byCategory[cat.key].resolved,
        open: kpi.byCategory[cat.key].open,
      })),
    [kpi]
  );

  const recentResolved: PublicReport[] = useMemo(() => {
    return state.reports
      .filter((r) => r.status === 'hoan_thanh' || r.status === 'dong')
      .map(toPublicReport)
      .sort((a, b) => {
        const aTime = new Date(a.completedAt || a.createdAt).getTime();
        const bTime = new Date(b.completedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [state.reports]);

  const avgRating = useMemo(() => {
    const rated = state.reports
      .map(toPublicReport)
      .filter((r) => typeof r.rating === 'number' && r.rating > 0);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    return (sum / rated.length).toFixed(1).replace('.', ',');
  }, [state.reports]);

  const resolvedPercentText = `${kpi.resolvedPercent.toFixed(1).replace('.', ',')}%`;
  const avgDaysText = kpi.avgDays !== null ? formatDays(kpi.avgDays) : '–';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backPath);
    }
  };

  return (
    <div className="w-full pb-8 md:pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 py-3.5 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Quay lại"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg sm:text-xl font-extrabold tracking-tight text-[var(--color-text)]">
                Bảng thống kê phường
              </h1>
              <p
                data-testid="screen-title"
                className="truncate text-xs font-medium text-[var(--color-text-muted)]"
              >
                Bảng thống kê phường · Phường Trấn Biên
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-1 text-xs font-extrabold text-[#0084E8] dark:border-sky-800 dark:bg-sky-950/60 dark:text-[#38BDF8]">
            Tháng 11/2026
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* 4 thẻ KPI */}
        <section
          aria-label="Chỉ số xử lý tháng 11/2026"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
        >
          <div className="rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--color-text-muted)]">
                Tổng phản ánh
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <FileBarChart2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)]">
              {kpi.total}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Đã xử lý
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-300">
              {kpi.resolved}{' '}
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                ({resolvedPercentText})
              </span>
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/25">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Chưa hoàn tất
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                <Hourglass className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-300">
              {kpi.open}
            </p>
          </div>

          <div className="rounded-3xl border border-[#BAE6FD] bg-[#F0F9FF]/70 p-4 shadow-2xs dark:border-sky-800/70 dark:bg-sky-950/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#0369A1] dark:text-[#38BDF8]">
                Thời gian xử lý TB
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0084E8] dark:bg-sky-900/60 dark:text-[#38BDF8]">
                <Clock className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0084E8] dark:text-[#38BDF8]">
              {avgDaysText}
            </p>
          </div>
        </section>

        {/* Responsive 12-Col Analytics Split on Tablet/PC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left (5 cols): Phân bổ theo 4 loại */}
          <section
            aria-label="Phân bổ theo 4 loại"
            className="lg:col-span-5 flex flex-col rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs space-y-4 dark:border-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[var(--color-text)]">
                Phân bổ theo 4 loại
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Đã xử lý / Tổng
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3.5">
              {(
                [
                  { key: 'rac_thai', barClass: 'bg-emerald-500' },
                  { key: 'den_duong', barClass: 'bg-amber-500' },
                  { key: 'ngap_nuoc', barClass: 'bg-[#0084E8]' },
                  { key: 'mat_duong', barClass: 'bg-orange-500' },
                ] as const
              ).map(({ key, barClass }) => {
                const catConfig = CATEGORY_CONFIGS.find((c) => c.key === key)!;
                const catKpi = kpi.byCategory[key];
                const pct =
                  catKpi.total > 0 ? Math.round((catKpi.resolved / catKpi.total) * 100) : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="inline-flex items-center gap-2 text-[var(--color-text)]">
                        {CATEGORY_ICONS[key]}
                        <span>{catConfig.label}</span>
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        <strong className="font-extrabold text-[var(--color-text)]">
                          {catKpi.resolved}
                        </strong>{' '}
                        / {catKpi.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right (7 cols): Biểu đồ cột ngang 4 loại */}
          <section
            aria-label="Thống kê theo loại sự cố"
            className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-2xs dark:border-slate-800"
          >
            <h2 className="text-base font-extrabold text-[var(--color-text)] mb-3">
              Phân loại theo nhóm sự cố
            </h2>
            <div className="h-60 w-full">
              {typeof ResizeObserver !== 'undefined' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="var(--color-border)"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      stroke="var(--color-border)"
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={86}
                      stroke="var(--color-border)"
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }}
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        borderRadius: '14px',
                        color: 'var(--color-text)',
                        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
                      }}
                      labelStyle={{
                        color: 'var(--color-text)',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }} />
                    <Bar dataKey="resolved" name="Đã xử lý" stackId="total" fill="#10b981">
                      <LabelList
                        dataKey="resolved"
                        position="center"
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight={600}
                        formatter={(val: number) => (val > 0 ? val : '')}
                      />
                    </Bar>
                    <Bar
                      dataKey="open"
                      name="Chưa hoàn tất"
                      stackId="total"
                      fill="#f97316"
                      radius={[0, 6, 6, 0]}
                    >
                      <LabelList
                        dataKey="open"
                        position="right"
                        fill="var(--color-text-muted)"
                        fontSize={11}
                        fontWeight={600}
                        formatter={(val: number) => (val > 0 ? val : '')}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <BarChart
                  width={340}
                  height={240}
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="var(--color-border)"
                    tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={86}
                    stroke="var(--color-border)"
                    tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '14px',
                      color: 'var(--color-text)',
                      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)',
                    }}
                    labelStyle={{
                      color: 'var(--color-text)',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }} />
                  <Bar dataKey="resolved" name="Đã xử lý" stackId="total" fill="#10b981" />
                  <Bar
                    dataKey="open"
                    name="Chưa hoàn tất"
                    stackId="total"
                    fill="#f97316"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              )}
            </div>
          </section>
        </div>

        {/* Dòng "Vừa xử lý xong": 6 thẻ mới nhất */}
        <section aria-label="Vừa xử lý xong" className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--color-text)]">
              Vừa xử lý xong
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[var(--color-text-muted)] dark:bg-slate-800">
              6 kết quả mới nhất
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {recentResolved.map((report) => {
              const catConfig =
                CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;
              const beforePhoto = report.photos[0] || `/demo-photos/${report.category}/1.jpg`;
              const afterPhoto = report.resultPhotos?.[0];

              return (
                <div
                  key={report.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`${reportBasePath}/${report.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`${reportBasePath}/${report.id}`);
                    }
                  }}
                  className="cursor-pointer rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#0084E8]/40 hover:shadow-md active:scale-[0.99] dark:border-slate-800"
                >
                  {/* Ảnh Trước -> Sau */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 overflow-hidden rounded-2xl bg-slate-100 aspect-[4/3] dark:bg-slate-800">
                      <img
                        src={beforePhoto}
                        alt={`Ảnh trước xử lý ${report.id}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 rounded-lg bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                        Trước
                      </span>
                    </div>

                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-[#0084E8] dark:text-[#38BDF8]"
                      aria-hidden="true"
                    />

                    <div className="relative flex-1 overflow-hidden rounded-2xl bg-slate-100 aspect-[4/3] flex items-center justify-center dark:bg-slate-800">
                      {afterPhoto ? (
                        <>
                          <img
                            src={afterPhoto}
                            alt={`Ảnh sau xử lý ${report.id}`}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-1.5 left-1.5 rounded-lg bg-emerald-700/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                            Sau
                          </span>
                        </>
                      ) : (
                        <span className="px-2 text-center text-[11px] font-medium text-[var(--color-text-muted)]">
                          Chưa có ảnh sau xử lý
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thông tin loại + trạng thái */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--color-text)]">
                      {CATEGORY_ICONS[report.category]}
                      <span>{catConfig.label}</span>
                    </div>
                    <StatusChip status={report.status} size="sm" />
                  </div>

                  {/* Ngày xong + Bộ phận */}
                  <div className="mt-2 space-y-1 text-xs font-medium text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-1.5">
                      <CalendarCheck2
                        className="h-3.5 w-3.5 text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Hoàn thành: {formatDate(report.completedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2
                        className="h-3.5 w-3.5 text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{report.department || 'Phường Trấn Biên'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chú thích nguồn */}
        <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3 text-xs text-slate-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-slate-200">
          <p className="font-bold text-[var(--color-text)]">
            Số liệu tháng {monthLabel} · Dữ liệu mẫu cuộc thi
          </p>
          {avgRating !== null && (
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span>Điểm hài lòng: {avgRating}/5</span>
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
