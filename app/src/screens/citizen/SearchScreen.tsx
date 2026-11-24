import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Category } from '@/domain/types';

export function SearchScreen() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động focus vào ô tìm kiếm khi mở màn hình
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const recentSearches = ['Đèn đường', 'Cách Mạng Tháng Tám', 'Rác thải', 'Ngập nước'];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return state.reports.filter((r) => {
      const matchId = r.id.toLowerCase().includes(q);
      const matchAddr = r.address.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      const catLabel =
        CATEGORY_CONFIGS.find((c) => c.key === r.category)?.label.toLowerCase() || '';
      const matchLabel = catLabel.includes(q);
      return matchId || matchAddr || matchCat || matchLabel;
    });
  }, [query, state.reports]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header với ô tìm kiếm tự focus */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#E5E7EB] bg-white px-4 py-3 shadow-soft">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mã TB-xxxx, tên đường hoặc loại..."
            className="w-full rounded-card border border-[#E5E7EB] bg-gray-50/50 py-2 pl-9 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá tìm kiếm"
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md w-full px-4 py-4 space-y-4">
        {/* Chip "GẦN ĐÂY" */}
        {!query && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Gần đây
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow-soft hover:bg-gray-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Danh sách "GỢI Ý KẾT QUẢ (n)" */}
        {query && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Gợi ý kết quả ({results.length})
            </h3>

            {results.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                Không tìm thấy phản ánh nào khớp với từ khoá.
              </p>
            ) : (
              <div className="rounded-card border border-[#E5E7EB] bg-white shadow-soft divide-y divide-gray-100 overflow-hidden">
                {results.map((r) => {
                  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === r.category);
                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/phan-anh/${r.id}`)}
                      className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 shrink-0">
                          <CategoryIcon category={r.category as Category} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-900">
                            {catConfig?.label || r.category} · {r.address}
                          </p>
                          {r.description && (
                            <p className="truncate text-[11px] text-gray-400">{r.description}</p>
                          )}
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-primary shrink-0 ml-2">
                        {r.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
