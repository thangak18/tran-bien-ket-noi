import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Clock, ChevronRight, Plus, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { sortInbox, isOverdue, isDueSoon } from '@/domain/sorting';
import { computeDelayDays } from '@/domain/latestUpdate';
import { formatDateShort, formatPercent } from '@/domain/format';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { Report, Category } from '@/domain/types';
import { useDataSource } from '@/data/useDataSource';
import { useAction } from '@/data/useAction';
import { ActionError } from '@/components/common/ActionError';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { STREETS } from '@/data/streets';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';

export function A01Inbox() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const ds = useDataSource();
  const proxyAction = useAction();
  const isDesktop = useIsDesktop();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');

  // B5 Tạo phản ánh hộ
  const [isProxyOpen, setIsProxyOpen] = useState(false);
  const [proxyPhone, setProxyPhone] = useState('');
  const [proxyCategory, setProxyCategory] = useState<Category>('mat_duong');
  const [proxyStreet, setProxyStreet] = useState(STREETS[0]!.name);
  const [proxyDescription, setProxyDescription] = useState('');
  const [proxySuccess, setProxySuccess] = useState('');
  // Mã bí mật chỉ hiển thị một lần cho cán bộ để đọc lại cho người dân.
  const [proxySecret, setProxySecret] = useState<{ id: string; code: string } | null>(null);
  const [proxyPhoneError, setProxyPhoneError] = useState('');

  const now = state.settings.demoNow;

  const handleCreateProxy = async () => {
    const phone = proxyPhone.replace(/\s+/g, '');
    if (!phone) return;
    if (!/^0[0-9]{9}$/.test(phone)) {
      setProxyPhoneError('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0 (ví dụ: 0909000068)');
      return;
    }
    setProxyPhoneError('');
    const selectedStreet = STREETS.find((s) => s.name === proxyStreet) || STREETS[0]!;
    const result = await proxyAction.run(() =>
      ds.officerCreateOnBehalf({
        phone,
        category: proxyCategory,
        lat: selectedStreet.lat,
        lng: selectedStreet.lng,
        address: `Đường ${selectedStreet.name}, Phường Trấn Biên`,
        description: proxyDescription.trim() || undefined,
      })
    );
    if (!result) return;
    setIsProxyOpen(false);
    setProxyPhone('');
    setProxyDescription('');
    setProxySecret({ id: result.report.id, code: result.secretCode });
    setProxySuccess(`Đã tạo phản ánh #${result.report.id} hộ người dân thành công!`);
    setTimeout(() => setProxySuccess(''), 4000);
  };

  // 4 số KPI tính từ dữ liệu
  const totalCount = state.reports.length;
  const resolvedCount = useMemo(
    () => state.reports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong').length,
    [state.reports]
  );
  const overdueCount = useMemo(
    () => state.reports.filter((r) => isOverdue(r, now)).length,
    [state.reports, now]
  );
  const dueSoonCount = useMemo(
    () => state.reports.filter((r) => isDueSoon(r, now)).length,
    [state.reports, now]
  );

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
    <div className="min-h-screen bg-[#F5F7FB] pb-16 font-sans">
      {/* Header đồng bộ desktop */}
      <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white px-4 py-3 shadow-soft">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-base shadow-soft">
              TB
            </div>
            <div>
              <h1
                className="text-base font-bold text-gray-900 leading-tight"
                data-testid="screen-title"
              >
                Cổng cán bộ · Phường Trấn Biên
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Hộp tiếp nhận & điều phối xử lý hiện trường
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-create-proxy"
              aria-label="Tạo phản ánh hộ"
              onClick={() => setIsProxyOpen(true)}
              className="flex items-center gap-1.5 rounded-btn bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo phản ánh hộ</span>
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Thông báo tạo hộ thành công */}
        {proxySuccess && (
          <div className="mx-auto mt-2.5 max-w-[1200px] rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{proxySuccess}</span>
          </div>
        )}

        {proxySecret && (
          <div
            role="status"
            data-testid="proxy-secret"
            className="mx-auto mt-2.5 flex max-w-[1200px] items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900"
          >
            <span>
              Mã bí mật của #{proxySecret.id}:{' '}
              <b className="font-mono text-sm">{proxySecret.code}</b>. Chỉ hiển thị một lần, hãy đọc
              lại cho người dân.
            </span>
            <button
              type="button"
              onClick={() => setProxySecret(null)}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 font-semibold hover:bg-amber-100"
            >
              Đã ghi lại
            </button>
          </div>
        )}

        {/* Thanh tìm kiếm & Tabs */}
        <div className="mx-auto mt-3 max-w-[1200px] space-y-2.5">
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

      {/* Danh sách hồ sơ & Hàng 4 thẻ KPI */}
      <main className="mx-auto max-w-[1200px] px-4 py-4 space-y-4">
        {/* Hàng 4 thẻ KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft">
            <span className="text-xs font-medium text-gray-500">Tổng phản ánh</span>
            <div className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</div>
            <span className="text-[11px] text-gray-400">Tháng 11/2026</span>
          </div>

          <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft">
            <span className="text-xs font-medium text-emerald-600">Đã xử lý</span>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{resolvedCount}</div>
            <span className="text-[11px] text-emerald-700 font-medium">
              {formatPercent((resolvedCount / (totalCount || 1)) * 100)} hoàn tất
            </span>
          </div>

          <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft">
            <span className="text-xs font-medium text-red-600">Quá hạn</span>
            <div className="mt-1 text-2xl font-bold text-red-600">{overdueCount}</div>
            <span className="text-[11px] text-red-500">Cần xử lý gấp</span>
          </div>

          <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft">
            <span className="text-xs font-medium text-amber-600">Sắp đến hạn</span>
            <div className="mt-1 text-2xl font-bold text-amber-600">{dueSoonCount}</div>
            <span className="text-[11px] text-amber-600">Trong 24 giờ tới</span>
          </div>
        </div>
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

      {/* B5 Modal (Desktop: 560px giữa màn) / BottomSheet (Mobile/Tablet: toàn chiều ngang) */}
      {isDesktop ? (
        <Modal
          isOpen={isProxyOpen}
          onClose={() => setIsProxyOpen(false)}
          title="Tạo phản ánh hộ người dân"
          className="max-w-[560px]"
        >
          <div className="space-y-3.5 py-1 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Số điện thoại người dân <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={proxyPhone}
                onChange={(e) => setProxyPhone(e.target.value)}
                placeholder="0909 xxx xxx"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              />
              {proxyPhoneError && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
                  Lỗi: {proxyPhoneError}
                </p>
              )}
              <ActionError
                message={proxyAction.error}
                onDismiss={proxyAction.clearError}
                className="mt-2"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Loại phản ánh <span className="text-red-500">*</span>
              </label>
              <select
                value={proxyCategory}
                onChange={(e) => setProxyCategory(e.target.value as Category)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              >
                {CATEGORY_CONFIGS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Tuyến đường / Địa chỉ <span className="text-red-500">*</span>
              </label>
              <select
                value={proxyStreet}
                onChange={(e) => setProxyStreet(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              >
                {STREETS.map((s) => (
                  <option key={s.name} value={s.name}>
                    Đường {s.name}, Phường Trấn Biên
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Mô tả sự cố (ghi chú tiếp nhận)
              </label>
              <textarea
                value={proxyDescription}
                onChange={(e) => setProxyDescription(e.target.value)}
                placeholder="Nội dung người dân gọi điện / báo trực tiếp..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            <div className="rounded-xl bg-blue-50 p-2.5 text-[11px] text-blue-800 border border-blue-100 flex items-center justify-between">
              <span>Hệ thống sẽ gửi tin nhắn SMS mô phỏng chứa mã theo dõi tới người dân.</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700">
                Mô phỏng
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProxyOpen(false)}
                className="rounded-lg border border-gray-200 px-3.5 py-2 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!proxyPhone.trim() || proxyAction.pending}
                onClick={() => void handleCreateProxy()}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-soft hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Tạo phản ánh hộ
              </button>
            </div>
          </div>
        </Modal>
      ) : (
        <BottomSheet
          isOpen={isProxyOpen}
          onClose={() => setIsProxyOpen(false)}
          title="Tạo phản ánh hộ người dân"
          className="max-w-none w-full p-4"
        >
          <div className="space-y-3.5 py-1 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Số điện thoại người dân <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={proxyPhone}
                onChange={(e) => setProxyPhone(e.target.value)}
                placeholder="0909 xxx xxx"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              />
              {proxyPhoneError && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
                  Lỗi: {proxyPhoneError}
                </p>
              )}
              <ActionError
                message={proxyAction.error}
                onDismiss={proxyAction.clearError}
                className="mt-2"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Loại phản ánh <span className="text-red-500">*</span>
              </label>
              <select
                value={proxyCategory}
                onChange={(e) => setProxyCategory(e.target.value as Category)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              >
                {CATEGORY_CONFIGS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Tuyến đường / Địa chỉ <span className="text-red-500">*</span>
              </label>
              <select
                value={proxyStreet}
                onChange={(e) => setProxyStreet(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-semibold text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              >
                {STREETS.map((s) => (
                  <option key={s.name} value={s.name}>
                    Đường {s.name}, Phường Trấn Biên
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Mô tả sự cố (ghi chú tiếp nhận)
              </label>
              <textarea
                value={proxyDescription}
                onChange={(e) => setProxyDescription(e.target.value)}
                placeholder="Nội dung người dân gọi điện / báo trực tiếp..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs text-gray-900 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>

            <div className="rounded-xl bg-blue-50 p-2.5 text-[11px] text-blue-800 border border-blue-100 flex items-center justify-between">
              <span>Hệ thống sẽ gửi tin nhắn SMS mô phỏng chứa mã theo dõi tới người dân.</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700">
                Mô phỏng
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProxyOpen(false)}
                className="rounded-lg border border-gray-200 px-3.5 py-2 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!proxyPhone.trim() || proxyAction.pending}
                onClick={() => void handleCreateProxy()}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-soft hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Tạo phản ánh hộ
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
