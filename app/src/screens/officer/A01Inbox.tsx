import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  Hourglass,
  TrendingUp,
  Upload,
  Users,
  EyeOff,
  Phone,
  Filter,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { OnBehalfWizard } from '@/components/officer/OnBehalfWizard';
import { OfficerLayout } from '@/layouts/OfficerLayout';
import { SelectField, Toast } from '@/components/ui';
import { DateInputDdMmYyyy } from '@/components/ui/DateInputDdMmYyyy';
import { exportReportsToExcel, parseReportsFromExcel } from '@/lib/inboxExcel';
import { PortalAuthFlow } from '@/components/common/PortalAuthFlow';
import { getOfficerSession, OfficerSession, setOfficerSession } from '@/lib/portalSession';
import { useAppStore } from '@/store/AppStore';
import { computeKpi } from '@/domain/kpi';
import { sortInbox, isOverdue, isDueSoon } from '@/domain/sorting';
import { formatDate, formatDays } from '@/domain/format';
import { CATEGORY_CONFIGS, DEPARTMENTS, DEMO_NOW, officerLabel } from '@/domain/constants';
import { Category, Status, STATUSES } from '@/domain/types';
import { Button, EmptyState, Tabs } from '@/components/ui';
import { StatusChip } from '@/components/common/StatusChip';
import { PortalNotificationBell } from '@/components/common/PortalNotificationBell';

type QuickTab = 'can_xu_ly' | 'tat_ca' | 'da_xu_ly';
type SourceFilter = 'tat_ca' | 'co_sdt' | 'an_danh' | 'gui_ho';

const NEEDS_ACTION_STATUSES = new Set<Status>([
  'moi',
  'da_tiep_nhan',
  'cho_xac_minh',
  'da_giao',
  'mo_lai',
  'can_bo_sung',
]);

const RESOLVED_STATUSES = new Set<Status>(['hoan_thanh', 'dong']);

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  den_duong: <CategoryIcon category="den_duong" className="h-4 w-4 text-amber-600 shrink-0" />,
  ngap_nuoc: <CategoryIcon category="ngap_nuoc" className="h-4 w-4 text-blue-600 shrink-0" />,
  rac_thai: <CategoryIcon category="rac_thai" className="h-4 w-4 text-emerald-600 shrink-0" />,
  mat_duong: <CategoryIcon category="mat_duong" className="h-4 w-4 text-orange-600 shrink-0" />,
};

function getOverdueDays(dueAt: string | undefined, now: string): number {
  if (!dueAt) return 1;
  const diffMs = new Date(now).getTime() - new Date(dueAt).getTime();
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function A01Inbox() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [officerSession, setLocalOfficerSession] = useState<OfficerSession | null>(() =>
    getOfficerSession()
  );

  const now = state.settings.demoNow || DEMO_NOW;
  const currentMonth = now.slice(0, 7);

  const [searchQuery, setSearchQuery] = useState('');
  const [quickTab, setQuickTab] = useState<QuickTab>('can_xu_ly');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'tat_ca'>('tat_ca');
  const [statusFilter, setStatusFilter] = useState<Status | 'tat_ca'>('tat_ca');
  const [departmentFilter, setDepartmentFilter] = useState<string>('tat_ca');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('tat_ca');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isOnBehalfOpen, setIsOnBehalfOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [excelToast, setExcelToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const kpi = useMemo(
    () => computeKpi(state.reports, currentMonth, now),
    [state.reports, currentMonth, now]
  );

  // Đếm theo tab nhanh
  const tabCounts = useMemo(() => {
    let needsAction = 0;
    let resolved = 0;
    for (const r of state.reports) {
      if (NEEDS_ACTION_STATUSES.has(r.status)) needsAction += 1;
      else if (RESOLVED_STATUSES.has(r.status)) resolved += 1;
    }
    return {
      can_xu_ly: needsAction,
      tat_ca: state.reports.length,
      da_xu_ly: resolved,
    };
  }, [state.reports]);

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = state.reports.filter((r) => {
      if (quickTab === 'can_xu_ly' && !NEEDS_ACTION_STATUSES.has(r.status)) return false;
      if (quickTab === 'da_xu_ly' && !RESOLVED_STATUSES.has(r.status)) return false;

      if (categoryFilter !== 'tat_ca' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'tat_ca' && r.status !== statusFilter) return false;
      if (departmentFilter !== 'tat_ca' && r.department !== departmentFilter) return false;

      if (sourceFilter === 'co_sdt' && (r.anonymous || r.onBehalf)) return false;
      if (sourceFilter === 'an_danh' && !r.anonymous) return false;
      if (sourceFilter === 'gui_ho' && !r.onBehalf) return false;

      const createdDate = r.createdAt.slice(0, 10);
      if (dateFrom && createdDate < dateFrom) return false;
      if (dateTo && createdDate > dateTo) return false;

      if (query) {
        const matchId = r.id.toLowerCase().includes(query);
        const matchAddr = r.address.toLowerCase().includes(query);
        const matchTitle = r.title?.toLowerCase().includes(query) ?? false;
        const matchDesc = r.description?.toLowerCase().includes(query) ?? false;
        if (!matchId && !matchAddr && !matchTitle && !matchDesc) return false;
      }

      return true;
    });

    return sortInbox(filtered, now);
  }, [
    state.reports,
    quickTab,
    categoryFilter,
    statusFilter,
    departmentFilter,
    sourceFilter,
    dateFrom,
    dateTo,
    searchQuery,
    now,
  ]);

  const hasActiveFilters =
    categoryFilter !== 'tat_ca' ||
    statusFilter !== 'tat_ca' ||
    departmentFilter !== 'tat_ca' ||
    sourceFilter !== 'tat_ca' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchQuery !== '';

  const resetFilters = () => {
    setCategoryFilter('tat_ca');
    setStatusFilter('tat_ca');
    setDepartmentFilter('tat_ca');
    setSourceFilter('tat_ca');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
    reportId: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/can-bo/${reportId}`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = rowRefs.current[index + 1];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = rowRefs.current[index - 1];
      prev?.focus();
    }
  };

  const resolvedPercentText = `${kpi.resolvedPercent.toFixed(1).replace('.', ',')}%`;

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReports = useMemo(
    () => filteredAndSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredAndSorted, safePage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    quickTab,
    categoryFilter,
    statusFilter,
    departmentFilter,
    sourceFilter,
    dateFrom,
    dateTo,
  ]);

  const handleExportExcel = () => {
    if (filteredAndSorted.length === 0) {
      setExcelToast({ type: 'error', message: 'Không có hồ sơ nào để xuất Excel.' });
      return;
    }
    exportReportsToExcel(filteredAndSorted, now.slice(0, 10));
    setExcelToast({
      type: 'success',
      message: `Đã xuất ${filteredAndSorted.length} hồ sơ ra file Excel.`,
    });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { items, skipped } = await parseReportsFromExcel(file, state, now);
      if (items.length === 0) {
        setExcelToast({
          type: 'error',
          message: 'Không tìm thấy dòng dữ liệu hợp lệ trong file Excel.',
        });
        return;
      }
      for (const item of items) {
        dispatch({
          type: 'ADD_REPORT',
          payload: { report: item.report, notification: item.notification },
        });
      }
      setExcelToast({
        type: 'success',
        message:
          skipped > 0
            ? `Đã nhập ${items.length} hồ sơ từ Excel (bỏ qua ${skipped} dòng trống).`
            : `Đã nhập ${items.length} hồ sơ từ Excel.`,
      });
    } catch {
      setExcelToast({
        type: 'error',
        message: 'Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng (.xlsx, .xls, .csv).',
      });
    }
  };

  if (!officerSession) {
    return (
      <OfficerLayout>
        <PortalAuthFlow
          portalLabel="Cán bộ phường"
          roleSummary="Tiếp nhận phản ánh, điều phối bộ phận/TNV và cập nhật kết quả xử lý."
          accent="sky"
          defaultAddress="UBND P. Trấn Biên"
          addressLabel="Đơn vị công tác"
          addressPlaceholder="VD: UBND P. Trấn Biên"
          reports={state.reports}
          onAuthenticated={(record) => {
            const next: OfficerSession = {
              name: record.name,
              roleTitle: 'Cán bộ tiếp nhận & điều phối',
              unit: record.address || 'UBND P. Trấn Biên',
              phone: record.phone,
            };
            setOfficerSession(next);
            setLocalOfficerSession(next);
          }}
        />
      </OfficerLayout>
    );
  }

  return (
    <OfficerLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenOnBehalf={() => setIsOnBehalfOpen(true)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            data-testid="screen-title"
            className="text-2xl font-bold text-[var(--color-text)] tracking-tight"
          >
            Hộp tiếp nhận cán bộ
          </h1>
        </div>
        <PortalNotificationBell role="officer" />
      </div>

      {/* Thanh thông báo trạng thái xác minh TNV cho Cán bộ */}
      {(() => {
        const verifiedReady = state.reports.filter(
          (r) =>
            ['moi', 'da_tiep_nhan', 'cho_xac_minh', 'mo_lai'].includes(r.status) &&
            state.volunteerTasks.some((t) => t.reportId === r.id && t.status === 'xong')
        );
        const waitingTnv = state.reports.filter(
          (r) =>
            ['moi', 'da_tiep_nhan', 'cho_xac_minh', 'mo_lai'].includes(r.status) &&
            state.volunteerTasks.some((t) => t.reportId === r.id && t.status !== 'xong')
        );
        if (verifiedReady.length === 0 && waitingTnv.length === 0) return null;
        return (
          <div
            data-testid="officer-tnv-alert-bar"
            className="flex flex-wrap items-center justify-between gap-2.5 rounded-card border border-sky-200 bg-sky-50/80 px-4 py-3 text-xs dark:border-sky-900/70 dark:bg-sky-950/30"
          >
            <div className="flex flex-wrap items-center gap-3">
              {verifiedReady.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {verifiedReady.length} hồ sơ TNV đã xác minh xong – sẵn sàng giao xử lý
                </span>
              )}
              {waitingTnv.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                  <Hourglass className="h-4 w-4" />
                  {waitingTnv.length} hồ sơ đang chờ TNV xác minh
                </span>
              )}
            </div>
            {verifiedReady.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {verifiedReady.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(`/can-bo/${r.id}`)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                  >
                    Xử lý {r.id} ›
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 6 KPI Cards */}
      <section
        aria-label="Chỉ số tiếp nhận và xử lý"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
      >
        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
            <span>Tổng phản ánh</span>
            <FileText className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-text)]">{kpi.total}</div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            Tháng {now.slice(5, 7)}/{now.slice(0, 4)}
          </div>
        </div>

        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
            <span>Đã xử lý</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {kpi.resolved}
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              ({resolvedPercentText})
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Hoàn thành & đã đóng</div>
        </div>

        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
            <span>Đang xử lý</span>
            <Hourglass className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-text)]">{kpi.open}</div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Hồ sơ đang mở</div>
        </div>

        <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
            <span>TB giải quyết</span>
            <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-text)]">
            {kpi.avgDays !== null ? formatDays(kpi.avgDays) : '–'}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Thời gian trung bình</div>
        </div>

        <div className="rounded-card border border-rose-200 bg-rose-50/70 p-4 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/35">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
            <span>Quá hạn</span>
            <AlertTriangle
              className="h-4 w-4 text-rose-600 dark:text-rose-400"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">
            {kpi.overdue}
          </div>
          <div className="mt-1 text-xs text-rose-700 dark:text-rose-300">Cần xử lý ưu tiên</div>
        </div>

        <div className="rounded-card border border-amber-200 bg-amber-50/70 p-4 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
            <span>Sắp đến hạn</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-800 dark:text-amber-400">
            {kpi.dueSoon}
          </div>
          <div className="mt-1 text-xs text-amber-800 dark:text-amber-300">Trong vòng 24 giờ</div>
        </div>
      </section>

      {excelToast && (
        <Toast
          type={excelToast.type}
          message={excelToast.message}
          onClose={() => setExcelToast(null)}
        />
      )}

      {/* Quick Tabs & Filters */}
      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 md:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <Tabs
            tabs={[
              { id: 'can_xu_ly', label: 'Cần xử lý', count: tabCounts.can_xu_ly },
              { id: 'tat_ca', label: 'Tất cả', count: tabCounts.tat_ca },
              { id: 'da_xu_ly', label: 'Đã xử lý', count: tabCounts.da_xu_ly },
            ]}
            activeTab={quickTab}
            onChange={(id) => setQuickTab(id as QuickTab)}
            className="border-b-0 pb-0"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs font-bold text-[var(--color-text)] transition hover:border-[#0084E8]/40 hover:text-[#0084E8]"
            >
              <Download className="h-3.5 w-3.5 text-[#0084E8]" aria-hidden="true" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs font-bold text-[var(--color-text)] transition hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-400"
            >
              <Upload className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Nhập Excel</span>
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => void handleImportExcel(e)}
              className="hidden"
              aria-label="Chọn file Excel để nhập hồ sơ"
            />

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="md:hidden inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-xs font-bold text-[var(--color-text)]"
            >
              <Filter className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <span>Bộ lọc</span>
            </button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                className="text-xs text-[var(--color-primary)]"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        <div
          className={`${
            filtersOpen ? 'grid' : 'hidden md:grid'
          } grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-[var(--color-border)]`}
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-category"
              className="text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              Loại sự cố
            </label>
            <SelectField
              id="filter-category"
              size="sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as Category | 'tat_ca')}
              className="bg-[var(--color-bg)]"
            >
              <option value="tat_ca">Tất cả loại</option>
              {CATEGORY_CONFIGS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-status"
              className="text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              Trạng thái
            </label>
            <SelectField
              id="filter-status"
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | 'tat_ca')}
              className="bg-[var(--color-bg)]"
            >
              <option value="tat_ca">Tất cả trạng thái</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {officerLabel(s)}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-department"
              className="text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              Bộ phận
            </label>
            <SelectField
              id="filter-department"
              size="sm"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              wrapperClassName="max-w-[210px]"
              className="bg-[var(--color-bg)]"
            >
              <option value="tat_ca">Tất cả bộ phận</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-source"
              className="text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              Nguồn
            </label>
            <SelectField
              id="filter-source"
              size="sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="bg-[var(--color-bg)]"
            >
              <option value="tat_ca">Tất cả nguồn</option>
              <option value="co_sdt">Có SĐT</option>
              <option value="an_danh">Ẩn danh</option>
              <option value="gui_ho">Gửi hộ</option>
            </SelectField>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-date-from"
              className="text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              Từ ngày
            </label>
            <DateInputDdMmYyyy
              id="filter-date-from"
              value={dateFrom}
              onChange={setDateFrom}
              ariaLabel="Từ ngày (dd/mm/yyyy)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-date-to"
              className="text-[11px] font-medium text-[var(--color-text-muted)]"
            >
              Đến ngày
            </label>
            <DateInputDdMmYyyy
              id="filter-date-to"
              value={dateTo}
              onChange={setDateTo}
              ariaLabel="Đến ngày (dd/mm/yyyy)"
            />
          </div>
        </div>
      </section>

      {/* Inbox Table */}
      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FileText className="h-12 w-12" aria-hidden="true" />}
              title="Không có phản ánh phù hợp"
              description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm hồ sơ."
              actionText={hasActiveFilters ? 'Xóa bộ lọc' : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          </div>
        ) : (
          <>
            {/* Mobile Compact Card List */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {paginatedReports.map((report) => {
                const catCfg = CATEGORY_CONFIGS.find((c) => c.key === report.category);
                const overdue = isOverdue(report, now);
                const overdueDays = overdue ? getOverdueDays(report.dueAt, now) : 0;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => navigate(`/can-bo/${report.id}`)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors duration-150 hover:bg-[var(--color-primary-soft)]/40 ${
                      overdue ? 'bg-rose-50/50 dark:bg-rose-950/30' : ''
                    }`}
                  >
                    {report.photos[0] ? (
                      <img
                        src={report.photos[0]}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                        {CATEGORY_ICONS[report.category]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[var(--color-primary)]">
                          {report.id} · {catCfg?.label}
                        </span>
                        <StatusChip status={report.status} />
                      </div>
                      <div className="mt-1 text-sm font-bold text-[var(--color-text)] line-clamp-1">
                        {report.title || report.description || catCfg?.label || 'Phản ánh'}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                        <span className="truncate">{report.address}</span>
                        {overdue ? (
                          <span className="shrink-0 font-bold text-rose-600 dark:text-rose-400">
                            Quá hạn {overdueDays} ngày
                          </span>
                        ) : report.dueAt ? (
                          <span className="shrink-0">Hạn {formatDate(report.dueAt)}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tablet & PC Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">
                      Mã
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Ảnh
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Loại
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Địa chỉ
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Trạng thái
                    </th>
                    <th scope="col" className="hidden lg:table-cell py-3 px-3">
                      Bộ phận
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Hạn
                    </th>
                    <th scope="col" className="hidden lg:table-cell py-3 px-4">
                      Số điện thoại
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {paginatedReports.map((report, index) => {
                    const catCfg = CATEGORY_CONFIGS.find((c) => c.key === report.category);
                    const overdue = isOverdue(report, now);
                    const dueSoon = !overdue && isDueSoon(report, now);
                    const overdueDays = overdue ? getOverdueDays(report.dueAt, now) : 0;
                    const followerCount =
                      (report.followers?.length ?? 0) + (report.anonymousFollows ?? 0);

                    return (
                      <tr
                        key={report.id}
                        ref={(el) => {
                          rowRefs.current[index] = el;
                        }}
                        tabIndex={0}
                        role="row"
                        onClick={() => navigate(`/can-bo/${report.id}`)}
                        onKeyDown={(e) => handleRowKeyDown(e, index, report.id)}
                        className={`cursor-pointer transition-colors hover:bg-[var(--color-primary-soft)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${
                          overdue ? 'bg-rose-50/50 dark:bg-rose-950/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <div className="font-semibold text-[var(--color-primary)]">
                            {report.id}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                            <span
                              className="inline-flex items-center gap-1"
                              title="Số người cùng báo"
                            >
                              <Users className="h-3 w-3" aria-hidden="true" />
                              {followerCount}
                            </span>
                            {report.priority === 'cao' && (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                                Ưu tiên cao
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          {report.photos[0] ? (
                            <img
                              src={report.photos[0]}
                              alt={`Ảnh sự cố ${report.id}`}
                              className="h-12 w-12 rounded-lg object-cover border border-[var(--color-border)] bg-gray-100"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center justify-center text-[var(--color-text-muted)]">
                              <ImageIcon className="h-4 w-4" aria-hidden="true" />
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text)]">
                            {CATEGORY_ICONS[report.category]}
                            <span>{catCfg?.label ?? report.category}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top max-w-[260px]">
                          {(report.title || report.description) && (
                            <div className="mb-0.5 font-extrabold text-[var(--color-text)] line-clamp-1">
                              {report.title || report.description}
                            </div>
                          )}
                          <div
                            className={`text-[var(--color-text)] line-clamp-2 ${
                              report.title || report.description
                                ? 'text-xs font-medium text-slate-600 dark:text-slate-300'
                                : 'font-medium'
                            }`}
                          >
                            {report.address}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                            Gửi: {formatDate(report.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <StatusChip status={report.status} variant="officer" size="sm" />
                        </td>

                        <td className="hidden lg:table-cell py-3 px-3 align-top max-w-[180px] text-xs text-[var(--color-text-muted)]">
                          {report.department || '–'}
                        </td>

                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          {overdue ? (
                            <div className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>Quá hạn {overdueDays} ngày</span>
                            </div>
                          ) : dueSoon ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
                                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>Sắp đến hạn</span>
                              </div>
                              <div className="text-[11px] text-[var(--color-text-muted)]">
                                {formatDate(report.dueAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {report.dueAt ? formatDate(report.dueAt) : '–'}
                            </span>
                          )}
                        </td>

                        <td className="hidden lg:table-cell py-3 px-4 align-top whitespace-nowrap">
                          {report.reporterPhone ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)] tabular-nums">
                              <Phone
                                className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0"
                                aria-hidden="true"
                              />
                              <span>{report.reporterPhone}</span>
                            </span>
                          ) : report.anonymous ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              <EyeOff className="h-3 w-3" aria-hidden="true" />
                              <span>Ẩn danh</span>
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer (max 20 items/page) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs">
              <span className="font-medium text-[var(--color-text-muted)]">
                Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredAndSorted.length)} /{' '}
                {filteredAndSorted.length} hồ sơ
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Trang trước"
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 font-bold text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Trước</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === safePage ? 'page' : undefined}
                    className={`flex h-8 min-w-[32px] items-center justify-center rounded-xl px-2 font-extrabold transition ${
                      page === safePage
                        ? 'bg-[#0084E8] text-white shadow-2xs'
                        : 'border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Trang sau"
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 font-bold text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>Sau</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <OnBehalfWizard isOpen={isOnBehalfOpen} onClose={() => setIsOnBehalfOpen(false)} now={now} />
    </OfficerLayout>
  );
}
