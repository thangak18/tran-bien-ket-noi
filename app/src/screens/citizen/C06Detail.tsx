import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Star, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { submitFeedback, followReport } from '@/store/citizenActions';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { ProgressBar } from '@/components/common/ProgressBar';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { RatingSheet } from '@/components/citizen/RatingSheet';
import { MapView } from '@/components/map/MapView';
import { formatLatestUpdate, computeDelayDays } from '@/domain/latestUpdate';
import { formatDateTime } from '@/domain/format';
import { useIsDesktop } from '@/lib/useIsDesktop';

const STAR_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
};

export function C06Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const isDesktop = useIsDesktop();

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [isRatingSheetOpen, setIsRatingSheetOpen] = useState<boolean>(false);
  const [hasMeToo, setHasMeToo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const report = state.reports.find((r) => r.id === id);

  const fetchReport = () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    import('@/data').then(({ dataSource }) => {
      dataSource
        .getReportById(id)
        .then((rep) => {
          if (rep) {
            dispatch({ type: 'ADD_REPORT', payload: { report: rep } });
          } else {
            setLoadError(`Mã phản ánh ${id} không tồn tại.`);
          }
        })
        .catch((err) => {
          setLoadError(err.message || 'Lỗi khi tải thông tin hồ sơ.');
        })
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => {
    if (!report && id) {
      setLoading(true);
      setLoadError(null);
      import('@/data').then(({ dataSource }) => {
        dataSource
          .getReportById(id)
          .then((rep) => {
            if (rep) {
              dispatch({ type: 'ADD_REPORT', payload: { report: rep } });
            } else {
              setLoadError(`Mã phản ánh ${id} không tồn tại.`);
            }
          })
          .catch((err) => {
            setLoadError(err.message || 'Lỗi khi tải thông tin hồ sơ.');
          })
          .finally(() => setLoading(false));
      });
    }
  }, [id, report, dispatch]);

  const handleMeToo = () => {
    if (!report || hasMeToo) return;
    try {
      const newState = followReport(state, report.id, { anonymous: true });
      dispatch({ type: 'HYDRATE', payload: newState });
      setHasMeToo(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-500">Đang tải hồ sơ...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-base font-bold text-gray-900">Không tìm thấy hồ sơ</h2>
        <p className="mt-1 text-xs text-gray-500">
          {loadError || `Mã phản ánh ${id} không tồn tại.`}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={fetchReport}
            className="rounded-btn border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm"
          >
            Thử lại
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-btn bg-primary px-4 py-2 text-xs font-bold text-white shadow-soft"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const catConfig = CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;

  const now = state.settings.demoNow;
  const delayDays = computeDelayDays(report, now);
  const latestUpdateSentence = formatLatestUpdate(report, now);

  // Timeline sắp xếp mới nhất ở trên
  const timelineReversed = [...report.timeline].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  const handleResolve = () => {
    try {
      const newState = submitFeedback(
        state,
        report.id,
        {
          resolved: true,
          rating: selectedRating,
          comment: `Đánh giá ${selectedRating} sao`,
        },
        now
      );
      dispatch({ type: 'HYDRATE', payload: newState });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnresolved = () => {
    if (window.confirm('Bạn xác nhận sự cố vẫn chưa được giải quyết triệt để?')) {
      try {
        const newState = submitFeedback(
          state,
          report.id,
          {
            resolved: false,
            comment: 'Chưa giải quyết triệt để',
          },
          now
        );
        dispatch({ type: 'HYDRATE', payload: newState });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] pb-16 font-sans">
      {/* Hidden test identifier */}
      <h1 data-testid="screen-title" className="sr-only">
        Chi tiết phản ánh
      </h1>

      {/* Header "← Chi tiết #TB-xxxx" + chip trạng thái phải */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 shadow-soft">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold text-gray-900" data-testid="report-id">
            Chi tiết #{report.id}
          </h2>
        </div>

        <StatusChip status={report.status} variant="public" size="sm" />
      </header>

      {/* ======================================================== */}
      {/* 1. BỐ CỤC MOBILE & TABLET (< 1024px)                     */}
      {/* ======================================================== */}
      <main className="mx-auto max-w-md px-4 py-3 space-y-3 lg:hidden">
        {/* 1. Ảnh lớn bo 12px */}
        <div className="relative h-52 w-full overflow-hidden rounded-card border border-[#E5E7EB] bg-gray-100 shadow-soft">
          <img
            src={report.photos[0] || '/demo-photos/mat_duong/1.jpg'}
            alt="Hiện trường"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect fill="%23f3f4f6" width="400" height="240"/><text fill="%239ca3af" font-family="sans-serif" font-size="14" dy="5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh hiện trường sự cố</text></svg>';
            }}
          />
        </div>

        {/* 2. Thẻ: "{Loại} · {mô tả ngắn}" + chip; ProgressBar; LatestUpdate; DelayChip */}
        <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900">
              {catConfig.label} · {report.description || 'Ghi nhận hiện trường'}
            </h3>
            <StatusChip status={report.status} variant="public" size="sm" />
          </div>

          <ProgressBar report={report} />

          <div className="rounded-xl bg-[#EFF4FF] p-3 text-xs text-[#1D4ED8] space-y-1">
            <p className="font-semibold leading-relaxed">{latestUpdateSentence}</p>
            {delayDays > 0 && <DelayChip report={report} now={now} />}
          </div>
        </div>

        {/* 3. Thẻ địa chỉ + "{n} người cùng báo vấn đề này" */}
        <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-gray-800 leading-snug">{report.address}</div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <span>
              {report.followers && report.followers.length > 0 ? report.followers.length : 1} người
              cùng báo vấn đề này
            </span>
          </div>
        </div>

        {/* Nút Tôi cũng gặp (Mobile: toàn chiều ngang ngay dưới thẻ địa chỉ) */}
        <button
          type="button"
          onClick={handleMeToo}
          disabled={hasMeToo}
          className={`w-full flex items-center justify-center gap-2 rounded-btn py-3 text-xs font-bold transition-all shadow-soft ${
            hasMeToo
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 cursor-default'
              : 'bg-primary text-white hover:bg-primary-hover active:scale-95'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>
            {hasMeToo ? '✓ Đã ghi nhận bạn cùng gặp vấn đề này' : 'Tôi cũng gặp vấn đề này'}
          </span>
        </button>

        {/* 4. (hoan_thanh/dong) Thẻ "Ảnh Trước / Sau xử lý" */}
        {(report.status === 'hoan_thanh' || report.status === 'dong') && (
          <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-2.5">
            <h3 className="text-xs font-bold text-gray-900">
              Ảnh Trước / Sau xử lý{' '}
              <span className="text-[11px] font-normal text-gray-400">(Chạm để phóng to)</span>
            </h3>
            <BeforeAfter
              beforePhotos={report.photos}
              afterPhotos={report.resultPhotos}
              beforeTime={report.createdAt}
              afterTime={report.completedAt}
              category={report.category}
            />
          </div>
        )}

        {/* 5. (hoan_thanh) Thẻ Đánh giá */}
        {report.status === 'hoan_thanh' && (
          <div className="rounded-card border border-primary-200 bg-[#EFF4FF]/60 p-4 shadow-soft space-y-3 text-center">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Vấn đề đã được giải quyết chưa?
            </h3>

            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  aria-label={`Chọn ${star} sao`}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= selectedRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-xs font-bold text-gray-700">
              {selectedRating}/5 sao · {STAR_LABELS[selectedRating] || 'Hài lòng'}{' '}
              <span className="font-normal text-gray-400">(Chạm để chọn)</span>
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleResolve}
                className="rounded-btn bg-[#16A34A] py-2.5 text-xs font-bold text-white shadow-soft hover:bg-[#15803D] active:scale-95 transition-all text-center"
              >
                Đã giải quyết
              </button>

              <button
                type="button"
                onClick={handleUnresolved}
                className="rounded-btn border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 shadow-soft hover:bg-gray-50 active:scale-95 transition-all text-center"
              >
                Chưa giải quyết
              </button>
            </div>
          </div>
        )}

        {/* 6. Thẻ "Lịch sử cập nhật" */}
        <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-2.5">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Lịch sử cập nhật
          </h3>

          <ul className="space-y-2 text-xs text-gray-700">
            {timelineReversed.map((entry, index) => {
              const formattedTime = formatDateTime(entry.at);
              const note = entry.note || entry.status;
              return (
                <li key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong className="text-gray-900">{formattedTime}</strong> · {note}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 2. BỐ CỤC DESKTOP (>= 1024px): 1100px 2 CỘT (3/5 vs 2/5)  */}
      {/* ======================================================== */}
      <main className="hidden lg:flex max-w-[1100px] w-full mx-auto px-6 py-6 gap-8 items-start">
        {/* CỘT TRÁI (3/5): Ảnh lớn + Trước/Sau + Lịch sử */}
        <div className="w-3/5 space-y-5">
          {/* Ảnh lớn */}
          <div className="relative h-72 w-full overflow-hidden rounded-card border border-[#E5E7EB] bg-gray-100 shadow-soft">
            <img
              src={report.photos[0] || '/demo-photos/mat_duong/1.jpg'}
              alt="Hiện trường"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect fill="%23f3f4f6" width="600" height="360"/><text fill="%239ca3af" font-family="sans-serif" font-size="16" dy="6" font-weight="bold" x="50%" y="50%" text-anchor="middle">Ảnh hiện trường sự cố</text></svg>';
              }}
            />
          </div>

          {/* Trước / Sau xử lý */}
          {(report.status === 'hoan_thanh' || report.status === 'dong') && (
            <div className="rounded-card border border-[#E5E7EB] bg-white p-5 shadow-soft space-y-3">
              <h3 className="text-sm font-bold text-gray-900">
                Ảnh Trước / Sau xử lý{' '}
                <span className="text-xs font-normal text-gray-400">(Chạm để phóng to)</span>
              </h3>
              <BeforeAfter
                beforePhotos={report.photos}
                afterPhotos={report.resultPhotos}
                beforeTime={report.createdAt}
                afterTime={report.completedAt}
                category={report.category}
              />
            </div>
          )}

          {/* Lịch sử cập nhật */}
          <div className="rounded-card border border-[#E5E7EB] bg-white p-5 shadow-soft space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Lịch sử cập nhật tiến độ
            </h3>

            <ul className="space-y-3 text-xs text-gray-700">
              {timelineReversed.map((entry, index) => {
                const formattedTime = formatDateTime(entry.at);
                const note = entry.note || entry.status;
                return (
                  <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <div>
                      <strong className="text-gray-900">{formattedTime}</strong>
                      <span className="text-gray-400 mx-1.5">|</span>
                      <span>{note}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* CỘT PHẢI (2/5): Sticky trạng thái + địa chỉ & bản đồ nhỏ + đánh giá */}
        <aside className="w-2/5 space-y-4 sticky top-20 self-start">
          {/* Thẻ trạng thái */}
          <div className="rounded-card border border-[#E5E7EB] bg-white p-5 shadow-soft space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Mã phản ánh #{report.id}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">
                  {catConfig.label} · {report.description || 'Ghi nhận hiện trường'}
                </h3>
              </div>
              <StatusChip status={report.status} variant="public" size="sm" />
            </div>

            <ProgressBar report={report} />

            <div className="rounded-xl bg-[#EFF4FF] p-3.5 text-xs text-[#1D4ED8] space-y-1">
              <p className="font-semibold leading-relaxed">{latestUpdateSentence}</p>
              {delayDays > 0 && <DelayChip report={report} now={now} />}
            </div>
          </div>

          {/* Thẻ địa chỉ & bản đồ nhỏ */}
          <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-soft space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-gray-900 leading-snug">{report.address}</div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                  <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {report.followers && report.followers.length > 0 ? report.followers.length : 1}{' '}
                    người cùng báo vấn đề này
                  </span>
                </div>
              </div>
            </div>

            {/* Bản đồ nhỏ */}
            <div className="h-44 w-full rounded-xl overflow-hidden border border-gray-100">
              {isDesktop && (
                <MapView
                  center={[report.lat, report.lng]}
                  zoom={15}
                  markers={[
                    {
                      id: report.id,
                      lat: report.lat,
                      lng: report.lng,
                      category: report.category,
                      status: report.status,
                      title: report.address,
                    },
                  ]}
                />
              )}
            </div>
          </div>

          {/* Nút Tôi cũng gặp (Desktop: nằm trong cột phải sticky, dưới thẻ địa chỉ/trạng thái, trên khối đánh giá) */}
          <button
            type="button"
            onClick={handleMeToo}
            disabled={hasMeToo}
            className={`w-full flex items-center justify-center gap-2 rounded-btn py-3 text-xs font-bold transition-all shadow-soft ${
              hasMeToo
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 cursor-default'
                : 'bg-primary text-white hover:bg-primary-hover active:scale-95'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>
              {hasMeToo ? '✓ Đã ghi nhận bạn cùng gặp vấn đề này' : 'Tôi cũng gặp vấn đề này'}
            </span>
          </button>

          {/* Khối đánh giá nếu hoan_thanh */}
          {report.status === 'hoan_thanh' && (
            <div className="rounded-card border border-primary-200 bg-[#EFF4FF]/60 p-5 shadow-soft space-y-3.5 text-center">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Vấn đề đã được giải quyết chưa?
              </h3>

              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    aria-label={`Chọn ${star} sao`}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= selectedRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className="text-xs font-bold text-gray-700">
                {selectedRating}/5 sao · {STAR_LABELS[selectedRating] || 'Hài lòng'}
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResolve}
                  className="rounded-btn bg-[#16A34A] py-2.5 text-xs font-bold text-white shadow-soft hover:bg-[#15803D] active:scale-95 transition-all text-center"
                >
                  Đã giải quyết
                </button>

                <button
                  type="button"
                  onClick={handleUnresolved}
                  className="rounded-btn border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 shadow-soft hover:bg-gray-50 active:scale-95 transition-all text-center"
                >
                  Chưa giải quyết
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Sheet đánh giá chi tiết tuỳ chọn */}
      <RatingSheet
        isOpen={isRatingSheetOpen}
        onClose={() => setIsRatingSheetOpen(false)}
        onSubmit={(data) => {
          submitFeedback(state, report.id, { resolved: true, ...data }, now);
          setIsRatingSheetOpen(false);
        }}
      />
    </div>
  );
}
