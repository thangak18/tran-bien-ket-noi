import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  X,
  Users,
  User,
  CheckCircle2,
  CornerDownLeft,
  Lightbulb,
  Droplets,
  Trash2,
  Construction,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { getCommunityFeed, toPublicCardReport } from '@/domain/privacy';
import { filterMyReports, getMyReports, MyReportFilterTab } from '@/domain/access';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Category } from '@/domain/types';
import { ReportCard } from '@/components/citizen/ReportCard';
import { QrScannerModal } from '@/components/citizen/QrScannerModal';
import { Seek } from '@/components/citizen/Seek';

type HomeSegment = 'community' | 'personal';

const RECENT_SEARCH_CHIPS = ['Đèn đường', 'Ngập nước', 'Đ. CMT8'] as const;
const TAB_STORAGE_KEY = 'tbkn:c01:tab';
const ROWS_PER_PAGE = 10;

const CATEGORY_ICON_MAP: Record<Category, typeof Lightbulb> = {
  den_duong: Lightbulb,
  ngap_nuoc: Droplets,
  rac_thai: Trash2,
  mat_duong: Construction,
};

function detectGridColumns(): 1 | 2 | 3 {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 1;
  }
  if (window.matchMedia('(min-width: 1280px)').matches) return 3;
  if (window.matchMedia('(min-width: 768px)').matches) return 2;
  return 1;
}

function buildPageNumbers(current: number, total: number, maxVisible = 7): (number | 'ellipsis')[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (maxVisible <= 5) {
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 2) pages.push('ellipsis');
    if (current !== 1 && current !== total) {
      pages.push(current);
    } else if (current === 1 && total >= 2) {
      pages.push(2);
    } else if (current === total && total >= 2) {
      pages.push(total - 1);
    }
    if (current < total - 1) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) {
    pages.push('ellipsis');
  }
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (current < total - 2) {
    pages.push('ellipsis');
  }
  pages.push(total);
  return pages;
}

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  gridCols: 1 | 2 | 3;
  onPageChange: (page: number) => void;
}

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  gridCols,
  onPageChange,
}: PaginationBarProps) {
  if (totalItems === 0 || totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, currentPage * pageSize);
  const pageTokens = buildPageNumbers(currentPage, totalPages, gridCols === 1 ? 5 : 7);

  return (
    <nav
      aria-label="Phân trang danh sách phản ánh"
      data-testid="report-pagination"
      className="mt-5 overflow-hidden rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-3.5 sm:px-5 sm:py-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-slate-800"
    >
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        {/* Summary & Current Page Pill */}
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <div className="text-xs sm:text-[13px] font-medium text-[var(--color-text-muted)]">
            Hiển thị{' '}
            <strong className="font-extrabold text-[var(--color-text)]">
              {startIdx}–{endIdx}
            </strong>{' '}
            trong tổng số{' '}
            <strong className="font-extrabold text-[#0084E8] dark:text-[#38BDF8]">
              {totalItems}
            </strong>{' '}
            phản ánh
          </div>

          <span className="inline-flex shrink-0 items-center rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#0084E8] dark:border-sky-800 dark:bg-sky-950/60 dark:text-[#38BDF8]">
            Trang {currentPage} / {totalPages}
          </span>
        </div>

        {/* Page Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-1.5 sm:justify-center md:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="Trang trước"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3 sm:px-3.5 text-xs font-extrabold text-[var(--color-text)] transition-all hover:border-[#0084E8] hover:bg-[#F0F9FF] hover:text-[#0084E8] active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Trước</span>
            </button>

            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              {pageTokens.map((token, idx) =>
                token === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="inline-flex h-10 w-6 items-center justify-center text-xs font-bold text-slate-400 select-none"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={token}
                    type="button"
                    onClick={() => onPageChange(token)}
                    aria-label={`Trang ${token}`}
                    aria-current={token === currentPage ? 'page' : undefined}
                    className={`inline-flex h-10 min-w-[38px] sm:min-w-[40px] items-center justify-center rounded-2xl px-2.5 text-xs sm:text-[13px] font-extrabold transition-all active:scale-95 ${
                      token === currentPage
                        ? 'bg-gradient-to-br from-[#0084E8] to-[#0066B8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.34)] dark:from-[#38BDF8] dark:to-[#0284C7] dark:text-slate-950'
                        : 'border border-slate-200/80 bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[#0084E8]/60 hover:bg-[#F0F9FF] hover:text-[#0084E8] dark:border-slate-800 dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8]'
                    }`}
                  >
                    {token}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="Trang sau"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3 sm:px-3.5 text-xs font-extrabold text-[var(--color-text)] transition-all hover:border-[#0084E8] hover:bg-[#F0F9FF] hover:text-[#0084E8] active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8]"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export function C01Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useAppStore();
  const now = state.settings.demoNow;

  const initialSegment: HomeSegment = useMemo(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab === 'personal') return 'personal';
    if (paramTab === 'community') return 'community';
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem(TAB_STORAGE_KEY);
      if (saved === 'personal') return 'personal';
    }
    return 'community';
  }, [searchParams]);

  const [segment, setSegment] = useState<HomeSegment>(initialSegment);
  const [personalFilter, setPersonalFilter] = useState<MyReportFilterTab>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gridCols, setGridCols] = useState<1 | 2 | 3>(() => detectGridColumns());
  const [communityPage, setCommunityPage] = useState(1);
  const [personalPage, setPersonalPage] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const xlQuery = window.matchMedia('(min-width: 1280px)');
    const mdQuery = window.matchMedia('(min-width: 768px)');
    const syncColumns = () => {
      setGridCols(detectGridColumns());
    };
    xlQuery.addEventListener?.('change', syncColumns);
    mdQuery.addEventListener?.('change', syncColumns);
    window.addEventListener('resize', syncColumns);
    return () => {
      xlQuery.removeEventListener?.('change', syncColumns);
      mdQuery.removeEventListener?.('change', syncColumns);
      window.removeEventListener('resize', syncColumns);
    };
  }, []);

  const routeState = location.state as { submittedId?: string } | null;
  const [submittedBannerId, setSubmittedBannerId] = useState<string | null>(
    routeState?.submittedId ?? null
  );

  useEffect(() => {
    if (routeState?.submittedId) {
      setSubmittedBannerId(routeState.submittedId);
    }
  }, [routeState?.submittedId]);

  const handleSelectSegment = (next: HomeSegment) => {
    setSegment(next);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(TAB_STORAGE_KEY, next);
    }
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'personal') {
      nextParams.set('tab', 'personal');
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const communityFeed = useMemo(
    () => getCommunityFeed(state.reports, searchQuery),
    [state.reports, searchQuery]
  );

  const myReports = useMemo(
    () =>
      getMyReports(state.reports, {
        phone: state.settings.phone,
        deviceReports: state.settings.deviceReports,
      }),
    [state.reports, state.settings.phone, state.settings.deviceReports]
  );

  const personalCounts = useMemo(
    () => ({
      all: myReports.length,
      processing: filterMyReports(myReports, 'processing').length,
      resolved: filterMyReports(myReports, 'resolved').length,
    }),
    [myReports]
  );

  const filteredMyReports = useMemo(() => {
    const byTab = filterMyReports(myReports, personalFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((r) => {
      const catLabel =
        CATEGORY_CONFIGS.find((c) => c.key === r.category)?.label.toLowerCase() ?? '';
      return (
        r.id.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        (r.title?.toLowerCase().includes(q) ?? false) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        catLabel.includes(q)
      );
    });
  }, [myReports, personalFilter, searchQuery]);

  // Reset pagination to page 1 when search or filter changes
  useEffect(() => {
    setCommunityPage(1);
    setPersonalPage(1);
  }, [searchQuery, personalFilter, segment]);

  // 10 rows per page, automatically adapting to Mobile (1 col -> 10), Tablet (2 cols -> 20), PC (3 cols -> 30)
  const pageSize = ROWS_PER_PAGE * gridCols;

  const totalCommunityPages = Math.max(1, Math.ceil(communityFeed.length / pageSize));
  const safeCommunityPage = Math.min(communityPage, totalCommunityPages);
  const paginatedCommunityFeed = useMemo(() => {
    const start = (safeCommunityPage - 1) * pageSize;
    return communityFeed.slice(start, start + pageSize);
  }, [communityFeed, safeCommunityPage, pageSize]);

  const totalPersonalPages = Math.max(1, Math.ceil(filteredMyReports.length / pageSize));
  const safePersonalPage = Math.min(personalPage, totalPersonalPages);
  const paginatedPersonalReports = useMemo(() => {
    const start = (safePersonalPage - 1) * pageSize;
    return filteredMyReports.slice(start, start + pageSize);
  }, [filteredMyReports, safePersonalPage, pageSize]);

  const handlePageChange = (targetPage: number, mode: HomeSegment) => {
    if (mode === 'community') {
      setCommunityPage(targetPage);
    } else {
      setPersonalPage(targetPage);
    }
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const quickDropdownMatches = useMemo(() => {
    if (!searchOpen) return [];
    return communityFeed.slice(0, 5);
  }, [searchOpen, communityFeed]);

  const personalFilterButtons: { id: MyReportFilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'Tất cả', count: personalCounts.all },
    { id: 'processing', label: 'Đang xử lý', count: personalCounts.processing },
    { id: 'resolved', label: 'Đã xử lý', count: personalCounts.resolved },
  ];

  return (
    <div className="flex flex-1 flex-col pb-24">
      <span data-testid="screen-title" className="sr-only">
        Trang chủ
      </span>

      {/* Solid Header (No blur / translucency) */}
      <header className="sticky top-0 z-20 bg-[var(--color-surface)] px-4 md:px-6 lg:px-8 pt-4 pb-3">
        <div className="w-full">
          <div className="flex items-center justify-between gap-2">
            <h1 className="shrink-0 text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              Phản ánh
            </h1>

            <div className="flex items-center justify-end gap-2">
              {/* Seek: One-object spring-expanding search icon -> search field */}
              <Seek
                open={searchOpen}
                onOpenChange={setSearchOpen}
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Tìm mã TB-xxxx, tên đường, sự cố..."
                buttonAriaLabel="Tìm kiếm phản ánh"
                inputAriaLabel="Nhập từ khóa tìm kiếm phản ánh"
              />

              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                aria-label="Quét mã QR phản ánh"
                title="Quét mã QR"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] transition-colors hover:border-[#0084E8] hover:text-[#0084E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8]"
              >
                <QrCode className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/quanh-day')}
                aria-label="Xem bản đồ quanh đây"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E0F2FE] bg-[#F0F9FF] text-[#0084E8] transition-colors hover:bg-[#E0F2FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] dark:border-sky-800 dark:bg-sky-950/40 dark:text-[#38BDF8]"
              >
                <MapPin className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Gợi ý tìm kiếm nhanh khi thanh Seek bung ra */}
          {searchOpen && (
            <div className="mt-2.5 overflow-hidden rounded-[20px] border border-slate-200 bg-[var(--color-surface)] p-3 shadow-xl dark:border-slate-700">
              {!searchQuery.trim() && (
                <div className="mb-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Gần đây
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {RECENT_SEARCH_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSearchQuery(chip)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-[#0084E8] hover:bg-[#F0F9FF] hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Gợi ý kết quả
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearchOpen(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Thu gọn
                  </button>
                </div>
                {quickDropdownMatches.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-500">
                    Không có gợi ý khớp từ khóa
                  </div>
                ) : (
                  <div role="listbox" aria-label="Gợi ý kết quả" className="space-y-1">
                    {quickDropdownMatches.map((item, idx) => {
                      const cat = CATEGORY_CONFIGS.find((c) => c.key === item.category);
                      const CatIcon = CATEGORY_ICON_MAP[item.category];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={idx === 0}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => navigate(`/phan-anh/${item.id}`)}
                          className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                            idx === 0
                              ? 'bg-[#F0F9FF] dark:bg-sky-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#E0F2FE] text-[#0084E8] dark:bg-sky-900/60 dark:text-[#38BDF8]">
                              <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-[var(--color-text)]">
                                {item.title || item.description || cat?.label}
                              </div>
                              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {item.address}
                              </div>
                            </div>
                          </div>
                          <span className="flex flex-shrink-0 items-center gap-1 font-mono text-[11px] font-semibold text-[#0084E8] dark:text-[#38BDF8]">
                            <span>#{item.id}</span>
                            <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segmented Pill Bar: Cộng đồng | Cá nhân */}
          <div
            role="tablist"
            aria-label="Chế độ xem phản ánh"
            className="mt-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={segment === 'community'}
              onClick={() => handleSelectSegment('community')}
              className={`flex min-h-[var(--tap)] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                segment === 'community'
                  ? 'bg-[var(--color-surface)] text-[#0084E8] shadow-sm dark:text-[#38BDF8]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Cộng đồng</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={segment === 'personal'}
              onClick={() => handleSelectSegment('personal')}
              className={`flex min-h-[var(--tap)] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                segment === 'personal'
                  ? 'bg-[var(--color-surface)] text-[#0084E8] shadow-sm dark:text-[#38BDF8]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Cá nhân {myReports.length > 0 ? `(${myReports.length})` : ''}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full flex-1 space-y-3 px-4 md:px-6 lg:px-8 pt-3">
        {/* PDF Page 13 · Green success toast banner after submitting */}
        {submittedBannerId && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-950 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <div>
                  Gửi phản ánh <strong>#{submittedBannerId}</strong> thành công!
                </div>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-200">
                  Phường Trấn Biên đã tiếp nhận.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/phan-anh/${submittedBannerId}`)}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0084E8] shadow-xs hover:bg-slate-50"
              >
                Xem
              </button>
              <button
                type="button"
                onClick={() => setSubmittedBannerId(null)}
                aria-label="Đóng thông báo gửi thành công"
                className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {segment === 'community' ? (
          communityFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#F0F9FF] text-3xl font-extrabold text-[#0084E8] dark:bg-sky-950/40 dark:text-[#38BDF8]">
                0
              </div>
              <h2 className="text-base font-bold text-[var(--color-text)]">
                {searchQuery ? 'Không tìm thấy phản ánh nào' : 'Chưa có phản ánh nào'}
              </h2>
              <p className="mt-1 max-w-xs text-sm text-[var(--color-text-muted)]">
                {searchQuery
                  ? 'Thử đổi từ khóa tìm kiếm hoặc xoá bộ lọc.'
                  : 'Hãy là người đầu tiên gửi phản ánh cho phường Trấn Biên.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (searchQuery) {
                    setSearchQuery('');
                    setSearchOpen(false);
                  } else {
                    navigate('/bao-su-co/anh');
                  }
                }}
                className="mt-5 min-h-[var(--tap)] rounded-full bg-[#0084E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#006EC4] dark:bg-[#38BDF8] dark:text-slate-950"
              >
                {searchQuery ? 'Xoá tìm kiếm' : 'Gửi phản ánh ngay'}
              </button>
            </div>
          ) : (
            <>
              <div
                data-testid="community-report-grid"
                className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3"
              >
                {paginatedCommunityFeed.map((pub) => (
                  <ReportCard
                    key={pub.id}
                    report={toPublicCardReport(pub)}
                    now={now}
                    onClick={() => navigate(`/phan-anh/${pub.id}`)}
                  />
                ))}
              </div>
              <PaginationBar
                currentPage={safeCommunityPage}
                totalPages={totalCommunityPages}
                totalItems={communityFeed.length}
                pageSize={pageSize}
                gridCols={gridCols}
                onPageChange={(p) => handlePageChange(p, 'community')}
              />
            </>
          )
        ) : (
          <div className="space-y-3">
            {/* 3 equal-width filter buttons */}
            <div
              role="tablist"
              aria-label="Lọc phản ánh cá nhân"
              className="grid grid-cols-3 gap-1.5"
            >
              {personalFilterButtons.map((btn) => {
                const isActive = personalFilter === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setPersonalFilter(btn.id)}
                    className={`flex h-[38px] items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084E8] ${
                      isActive
                        ? 'bg-[#0084E8] text-white shadow-sm dark:bg-[#38BDF8] dark:text-slate-950'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{btn.label}</span>
                    <span>({btn.count})</span>
                  </button>
                );
              })}
            </div>

            {filteredMyReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#F0F9FF] text-3xl font-extrabold text-[#0084E8] dark:bg-sky-950/40 dark:text-[#38BDF8]">
                  0
                </div>
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  {searchQuery ? 'Không tìm thấy phản ánh cá nhân' : 'Bạn chưa gửi phản ánh nào'}
                </h2>
                <p className="mt-1 max-w-xs text-sm text-[var(--color-text-muted)]">
                  {searchQuery
                    ? 'Không có phản ánh cá nhân nào khớp từ khóa.'
                    : 'Thấy chỗ hư hỏng? Chụp một tấm, phường sẽ lo.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery) {
                      setSearchQuery('');
                      setSearchOpen(false);
                    } else {
                      navigate('/bao-su-co/anh');
                    }
                  }}
                  className="mt-5 min-h-[var(--tap)] rounded-full bg-[#0084E8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#006EC4] dark:bg-[#38BDF8] dark:text-slate-950"
                >
                  {searchQuery ? 'Xoá tìm kiếm' : 'Gửi phản ánh ngay'}
                </button>
              </div>
            ) : (
              <>
                <div
                  data-testid="personal-report-grid"
                  className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3"
                >
                  {paginatedPersonalReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      now={now}
                      showCode={true}
                      onClick={() => navigate(`/phan-anh/${report.id}`)}
                    />
                  ))}
                </div>
                <PaginationBar
                  currentPage={safePersonalPage}
                  totalPages={totalPersonalPages}
                  totalItems={filteredMyReports.length}
                  pageSize={pageSize}
                  gridCols={gridCols}
                  onPageChange={(p) => handlePageChange(p, 'personal')}
                />
              </>
            )}
          </div>
        )}
      </div>

      <QrScannerModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} />
    </div>
  );
}
