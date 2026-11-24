import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, Map, CheckCircle2, Copy } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { StatusChip } from '@/components/common/StatusChip';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { WARD_CENTER } from '@/data/streets';
import { haversineMeters } from '@/domain/geo';
import { formatDistance } from '@/domain/format';
import { Report, Category } from '@/domain/types';

function formatDaysAgo(dateStr: string, nowStr: string): string {
  const diffMs = new Date(nowStr).getTime() - new Date(dateStr).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    if (diffHours <= 1) return 'Vừa xong';
    return `${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export function C01Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useAppStore();
  const { reports, settings } = state;
  const now = settings.demoNow;

  // Tab: cong-dong hoặc ca-nhan
  const initialTab = searchParams.get('tab') === 'ca-nhan' ? 'ca-nhan' : 'cong-dong';
  const [activeTab, setActiveTab] = useState<'cong-dong' | 'ca-nhan'>(initialTab);

  // Bộ lọc tab Cá nhân
  const [myFilter, setMyFilter] = useState<'all' | 'processing' | 'resolved'>('all');

  // Thông báo vừa gửi thành công (từ location.state)
  const justSubmitted = location.state?.justSubmitted as
    | { reportId: string; secretCode?: string; anonymous?: boolean }
    | undefined;

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = (reportId: string, secretCode?: string) => {
    const url = `${window.location.origin}/phan-anh/${reportId}${secretCode ? `?k=${secretCode}` : ''}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTabChange = (tab: 'cong-dong' | 'ca-nhan') => {
    setActiveTab(tab);
    setSearchParams(tab === 'ca-nhan' ? { tab: 'ca-nhan' } : {});
  };

  // Danh sách hồ sơ cá nhân
  const myReports = useMemo(() => {
    const deviceIds = new Set(settings.deviceReports.map((d) => d.id));
    const userPhone = settings.phone;
    return reports
      .filter((r) => deviceIds.has(r.id) || (userPhone && r.followers.includes(userPhone)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, settings.deviceReports, settings.phone]);

  // Lọc theo pill cá nhân
  const filteredMyReports = useMemo(() => {
    if (myFilter === 'processing') {
      return myReports.filter((r) => r.status !== 'hoan_thanh' && r.status !== 'dong');
    }
    if (myFilter === 'resolved') {
      return myReports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong');
    }
    return myReports;
  }, [myReports, myFilter]);

  const countMyProcessing = useMemo(
    () => myReports.filter((r) => r.status !== 'hoan_thanh' && r.status !== 'dong').length,
    [myReports]
  );
  const countMyResolved = useMemo(
    () => myReports.filter((r) => r.status === 'hoan_thanh' || r.status === 'dong').length,
    [myReports]
  );

  // Danh sách cộng đồng (loại trừ da_gop)
  const communityReports = useMemo(() => {
    return reports
      .filter((r) => r.status !== 'da_gop')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports]);

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-6 min-h-screen">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Trang chủ
      </h1>

      {/* Header: "Phản ánh" + icon tìm kiếm + icon bản đồ */}
      <header className="flex items-center justify-between py-1">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Phản ánh</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Tìm kiếm phản ánh"
            onClick={() => navigate('/tim-kiem')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E5E7EB] text-gray-600 shadow-soft hover:bg-gray-50"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Xem bản đồ"
            onClick={() => navigate('/quanh-day')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E5E7EB] text-gray-600 shadow-soft hover:bg-gray-50"
          >
            <Map className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Segmented Control: "Cộng đồng" | "Cá nhân" */}
      <div className="flex rounded-xl bg-gray-200/70 p-1">
        <button
          type="button"
          onClick={() => handleTabChange('cong-dong')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === 'cong-dong'
              ? 'bg-white text-primary shadow-soft'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cộng đồng
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('ca-nhan')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
            activeTab === 'ca-nhan'
              ? 'bg-white text-primary shadow-soft'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cá nhân {myReports.length > 0 && `(${myReports.length})`}
        </button>
      </div>

      {/* Băng xanh lá thông báo gửi thành công (nếu có) */}
      {justSubmitted && (
        <div className="rounded-card border border-emerald-300 bg-emerald-50 p-3.5 shadow-soft">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  ✓ Gửi phản ánh #{justSubmitted.reportId} thành công!
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Phường Trấn Biên đã tiếp nhận yêu cầu.
                </p>
                {justSubmitted.anonymous && justSubmitted.secretCode && (
                  <p className="text-[11px] font-semibold text-emerald-800 mt-1">
                    Mã bí mật: <span className="font-mono">{justSubmitted.secretCode}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/phan-anh/${justSubmitted.reportId}`)}
                className="rounded-btn bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-soft"
              >
                Xem
              </button>
              {justSubmitted.anonymous && (
                <button
                  type="button"
                  onClick={() => handleCopyLink(justSubmitted.reportId, justSubmitted.secretCode)}
                  className="inline-flex items-center gap-1 rounded-btn border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedLink ? 'Đã lưu' : 'Lưu link'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NỘI DUNG TAB CỘNG ĐỒNG */}
      {activeTab === 'cong-dong' && (
        <div className="space-y-2.5">
          {communityReports.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              now={now}
              onClick={() => navigate(`/phan-anh/${report.id}`)}
            />
          ))}
        </div>
      )}

      {/* NỘI DUNG TAB CÁ NHÂN */}
      {activeTab === 'ca-nhan' && (
        <div className="space-y-3">
          {/* 3 Pill lọc */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setMyFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                myFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-[#E5E7EB] text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tất cả ({myReports.length})
            </button>
            <button
              type="button"
              onClick={() => setMyFilter('processing')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                myFilter === 'processing'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-[#E5E7EB] text-gray-600 hover:bg-gray-50'
              }`}
            >
              Đang xử lý ({countMyProcessing})
            </button>
            <button
              type="button"
              onClick={() => setMyFilter('resolved')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                myFilter === 'resolved'
                  ? 'bg-primary text-white'
                  : 'bg-white border border-[#E5E7EB] text-gray-600 hover:bg-gray-50'
              }`}
            >
              Đã xử lý ({countMyResolved})
            </button>
          </div>

          {/* Trạng thái trống của tab Cá nhân */}
          {filteredMyReports.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-[#E5E7EB] bg-white p-8 text-center shadow-soft">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF4FF] text-primary font-bold text-2xl shadow-soft">
                0
              </div>
              <h3 className="text-base font-bold text-gray-900">Bạn chưa gửi phản ánh nào</h3>
              <p className="mt-1.5 text-xs text-gray-500 max-w-[260px] leading-relaxed">
                Phản ánh bạn gửi từ máy này sẽ xuất hiện tại đây để theo dõi tiến độ.
              </p>

              <button
                type="button"
                onClick={() => navigate('/bao-su-co/anh')}
                className="mt-5 rounded-btn bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-primary-hover active:scale-95"
              >
                Gửi phản ánh ngay
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMyReports.map((report) => (
                <ReportItem
                  key={report.id}
                  report={report}
                  now={now}
                  onClick={() => navigate(`/phan-anh/${report.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Thẻ hồ sơ theo thiết kế Figma mới:
 * - Ảnh 56px bo 8px bên trái (fallback icon loại)
 * - Dòng nhỏ "{n} ngày trước"
 * - Tiêu đề in đậm "{LOẠI IN HOA}" hoặc mô tả ngắn
 * - Dòng địa chỉ · "{x} km"
 * - Chip trạng thái góc phải trên
 */
function ReportItem({
  report,
  now,
  onClick,
}: {
  report: Report;
  now: string;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === report.category);
  const photo = report.photos && report.photos.length > 0 ? report.photos[0] : null;

  const distMeters = haversineMeters(WARD_CENTER.lat, WARD_CENTER.lng, report.lat, report.lng);
  const timeAgo = formatDaysAgo(report.createdAt, now);
  const typeUpper = catConfig ? catConfig.label.toUpperCase() : report.category.toUpperCase();

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-start gap-3 rounded-card border border-[#E5E7EB] bg-white p-3 shadow-soft hover:border-primary-300 transition-all"
    >
      {/* Ảnh 56px bo 8px bên trái */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border border-gray-100 bg-gray-100">
        {photo && !imgError ? (
          <img
            src={photo}
            alt={typeUpper}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-500">
            <CategoryIcon category={report.category as Category} className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Nội dung trung tâm */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
              {timeAgo}
            </span>
            <h4 className="truncate text-xs font-bold text-gray-900 leading-snug">{typeUpper}</h4>
          </div>

          {/* Chip trạng thái góc phải trên */}
          <div className="shrink-0">
            <StatusChip status={report.status} variant="public" size="sm" />
          </div>
        </div>

        {/* Địa chỉ · {x} km */}
        <p className="mt-1 truncate text-xs text-gray-500">
          <span>{report.address}</span>
          <span className="ml-1 text-gray-400">· {formatDistance(distMeters)}</span>
        </p>

        {/* Dòng phụ nhỏ cho hồ sơ đang xác minh tại chỗ */}
        {report.status === 'cho_xac_minh' && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-700 whitespace-nowrap">
            <Search className="h-3 w-3 shrink-0" />
            <span>Đang kiểm tra tại chỗ</span>
          </p>
        )}
      </div>
    </div>
  );
}
