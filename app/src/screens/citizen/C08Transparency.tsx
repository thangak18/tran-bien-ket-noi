import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Inbox, FileText, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { computeKpi } from '@/domain/kpi';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { formatDateShort } from '@/domain/format';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { Category, Report } from '@/domain/types';

export function C08Transparency() {
  const navigate = useNavigate();
  const { state } = useAppStore();

  const kpi = computeKpi(state.reports, '2026-11', state.settings.demoNow);

  // Lấy 6 phản ánh đã xử lý mới nhất
  const recentCompleted: Report[] = state.reports
    .filter((r) => r.status === 'hoan_thanh' || r.status === 'dong')
    .sort((a, b) => {
      const timeA = a.completedAt || a.createdAt;
      const timeB = b.completedAt || b.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    })
    .slice(0, 6);

  const formatNumberVi = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals).replace('.', ',');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-base font-bold text-gray-900" data-testid="screen-title">
          Bảng minh bạch phường
        </h1>

        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-md lg:max-w-[1100px] px-4 py-4 space-y-6">
        {/* Banner giới thiệu */}
        <div className="rounded-3xl bg-linear-to-br from-primary-900 to-primary-700 p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-200">
            Minh bạch & Trách nhiệm
          </p>
          <h2 className="mt-1 text-lg font-bold">Kết quả xử lý phản ánh</h2>
          <p className="mt-1 text-xs text-primary-100/90 leading-relaxed">
            Mọi phản ánh của người dân phường Trấn Biên đều được ghi nhận, theo dõi công khai và đo
            lường định kỳ.
          </p>
        </div>

        {/* 4 Thẻ KPI - 1 hàng trên desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: Tổng số */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-gray-500">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Tổng phản ánh</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900">{kpi.total}</span>
              <span className="text-xs text-gray-400">hồ sơ</span>
            </div>
          </div>

          {/* KPI 2: Đã xử lý */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">Đã xử lý</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600">{kpi.resolved}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                {formatNumberVi(kpi.resolvedPercent)}%
              </span>
            </div>
          </div>

          {/* KPI 3: Chưa hoàn tất */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Inbox className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Chưa hoàn tất</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600">{kpi.open}</span>
              <span className="text-xs text-gray-400">đang giải quyết</span>
            </div>
          </div>

          {/* KPI 4: Thời gian trung bình */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium">Thời gian TB</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-700">
                {kpi.avgDays !== null ? formatNumberVi(kpi.avgDays) : '3,2'}
              </span>
              <span className="text-xs text-gray-400">ngày / việc</span>
            </div>
          </div>
        </div>

        {/* Biểu đồ phân bổ 4 loại */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h3 className="text-sm font-bold text-gray-900">Tiến độ theo loại sự cố</h3>
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Đã xong
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Chưa xong
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {CATEGORY_CONFIGS.map((config) => {
              const catKey = config.key as Category;
              const catData = kpi.byCategory[catKey];
              const total = catData.total;
              const resolved = catData.resolved;
              const open = catData.open;
              const percentResolved = total > 0 ? (resolved / total) * 100 : 0;
              const percentOpen = total > 0 ? (open / total) * 100 : 0;

              return (
                <div key={config.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <CategoryIcon category={catKey} className="h-4 w-4" />
                      <span>{config.label}</span>
                    </div>
                    <div className="font-mono text-gray-500">
                      <span className="font-bold text-emerald-600">{resolved}</span>
                      <span className="text-gray-400"> / {total}</span>
                    </div>
                  </div>

                  {/* Thanh tỷ lệ 2 màu */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      style={{ width: `${percentResolved}%` }}
                      className="bg-emerald-500 transition-all duration-300"
                    />
                    <div
                      style={{ width: `${percentOpen}%` }}
                      className="bg-amber-400 transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6 Thẻ "Vừa xử lý xong" */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              Vừa xử lý xong ({recentCompleted.length})
            </h3>
            <span className="text-xs text-gray-400">Hình ảnh đối chứng</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentCompleted.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/phan-anh/${r.id}`)}
                className="cursor-pointer rounded-3xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:border-primary-300 transition-all"
              >
                {/* Hàng thông tin đầu thẻ */}
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={r.category} className="h-4 w-4" />
                    <span className="font-mono text-xs font-bold text-gray-900">{r.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusChip status={r.status} variant="public" size="sm" />
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Khối Trước/Sau */}
                <BeforeAfter
                  beforePhotos={r.photos}
                  afterPhotos={r.resultPhotos}
                  beforeTime={r.createdAt}
                  afterTime={r.completedAt}
                  category={r.category}
                />

                {/* Địa chỉ và đơn vị xử lý */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <span className="truncate max-w-[200px]">{r.address}</span>
                  <span className="font-medium text-primary">
                    {r.completedAt ? formatDateShort(r.completedAt) : ''}
                  </span>
                </div>
                {r.department && (
                  <div className="mt-1 text-[11px] text-gray-400">
                    Đơn vị: <span className="text-gray-600 font-medium">{r.department}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chú thích nguồn */}
        <div className="rounded-2xl bg-gray-100/70 p-3 text-center text-xs text-gray-500">
          <p>Số liệu tháng 11/2026 · Dữ liệu mẫu cuộc thi</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Hệ thống Trấn Biên Kết Nối cập nhật tự động
          </p>
        </div>
      </main>
    </div>
  );
}
