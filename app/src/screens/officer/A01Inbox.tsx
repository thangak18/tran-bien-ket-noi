import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { sortInbox, isOverdue, isDueSoon } from '@/domain/sorting';
import { computeDelayDays } from '@/domain/latestUpdate';
import { formatDateShort } from '@/domain/format';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { Report } from '@/domain/types';

export function A01Inbox() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');

  const now = state.settings.demoNow;

  // Sắp xếp mặc định: quá hạn -> sắp hạn -> mới -> còn lại
  const sortedReports = useMemo(() => {
    return sortInbox(state.reports, now);
  }, [state.reports, now]);

  const filteredReports = useMemo(() => {
    return sortedReports.filter((r) => {
      // Tìm kiếm
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchId = r.id.toLowerCase().includes(term);
        const matchAddr = r.address.toLowerCase().includes(term);
        if (!matchId && !matchAddr) return false;
      }

      // Tab lọc
      if (activeTab === 'pending') {
        return (
          r.status === 'moi' ||
          r.status === 'da_tiep_nhan' ||
          r.status === 'da_giao' ||
          r.status === 'mo_lai'
        );
      }
      if (activeTab === 'resolved') {
        return r.status === 'hoan_thanh' || r.status === 'dong';
      }
      return true;
    });
  }, [sortedReports, searchTerm, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 shadow-2xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900" data-testid="screen-title">
              Hộp tiếp nhận cán bộ
            </h1>
            <p className="text-xs text-gray-500">UBND Phường Trấn Biên · Cán bộ điều phối</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Cổng công dân
          </button>
        </div>

        {/* Thanh tìm kiếm & Tabs */}
        <div className="mx-auto mt-3 max-w-4xl space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã hồ sơ (TB-00xx) hoặc tên đường..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả ({state.reports.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cần xử lý
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resolved')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'resolved'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Đã xử lý
            </button>
          </div>
        </div>
      </header>

      {/* Danh sách hồ sơ */}
      <main className="mx-auto max-w-4xl px-4 py-4 space-y-2.5">
        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Không tìm thấy hồ sơ phản ánh nào phù hợp.
          </div>
        ) : (
          filteredReports.map((r: Report) => {
            const overdue = isOverdue(r, now);
            const dueSoon = isDueSoon(r, now);
            const delayDays = computeDelayDays(r, now);
            const catLabel =
              CATEGORY_CONFIGS.find((c) => c.key === r.category)?.label || r.category;

            return (
              <div
                key={r.id}
                onClick={() => navigate(`/can-bo/${r.id}`)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all hover:border-primary-300 hover:shadow-xs ${
                  overdue
                    ? 'border-red-200 bg-red-50/40'
                    : dueSoon
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {/* Ảnh nhỏ */}
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  <img
                    src={r.photos[0] || '/demo-photos/mat_duong/1.jpg'}
                    alt="Sự cố"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect fill="%23f3f4f6" width="60" height="60"/><text fill="%239ca3af" font-size="10" dy="3.5" x="50%" y="50%" text-anchor="middle">Ảnh</text></svg>';
                    }}
                  />
                </div>

                {/* Nội dung hồ sơ */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900">{r.id}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <CategoryIcon category={r.category} className="h-3.5 w-3.5" />
                      {catLabel}
                    </span>

                    {/* Cờ Quá hạn có chữ rõ ràng */}
                    {overdue && (
                      <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        <AlertCircle className="h-3 w-3" />
                        Quá hạn {delayDays} ngày
                      </span>
                    )}

                    {dueSoon && !overdue && (
                      <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        <Clock className="h-3 w-3" />
                        Sắp đến hạn
                      </span>
                    )}
                  </div>

                  <p className="truncate text-xs font-medium text-gray-800">{r.address}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                    <StatusChip status={r.status} variant="officer" size="sm" />
                    {r.department && <span>· {r.department}</span>}
                    {r.dueAt && <span>· Hạn: {formatDateShort(r.dueAt)}</span>}
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
