import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { submitFeedback } from '@/store/citizenActions';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { Timeline } from '@/components/common/Timeline';
import { LatestUpdate } from '@/components/citizen/LatestUpdate';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { LocationRow } from '@/components/citizen/LocationRow';
import { RatingSheet } from '@/components/citizen/RatingSheet';
import { Button } from '@/components/ui/Button';

export function C06Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const report = state.reports.find((r) => r.id === id);

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Không tìm thấy hồ sơ</h1>
        <p className="mt-1 text-sm text-gray-500">Mã phản ánh {id} không tồn tại hoặc đã bị xoá.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  const categoryConfig =
    CATEGORY_CONFIGS.find((c) => c.key === report.category) || CATEGORY_CONFIGS[0]!;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Phản ánh ${report.id} - Trấn Biên Kết Nối`,
          text: `Theo dõi phản ánh ${report.id}: ${report.address}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleRatingSubmit = (data: { rating: number; tags: string[]; comment?: string }) => {
    try {
      const newState = submitFeedback(
        state,
        report.id,
        {
          resolved: true,
          rating: data.rating,
          tags: data.tags,
          comment: data.comment,
        },
        state.settings.demoNow
      );
      dispatch({ type: 'HYDRATE', payload: newState });
      setIsRatingOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportUnresolved = () => {
    if (window.confirm('Bạn xác nhận sự cố vẫn chưa được giải quyết triệt để?')) {
      try {
        const newState = submitFeedback(
          state,
          report.id,
          {
            resolved: false,
            comment: 'Công dân báo sự cố chưa được giải quyết triệt để',
          },
          state.settings.demoNow
        );
        dispatch({ type: 'HYDRATE', payload: newState });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <h1 data-testid="screen-title" className="sr-only">
        Chi tiết phản ánh
      </h1>
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

        <div className="text-center">
          <span className="font-mono text-base font-bold text-gray-900" data-testid="report-id">
            {report.id}
          </span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Chia sẻ"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 relative"
        >
          <Share2 className="h-4 w-4" />
          {copiedShare && (
            <span className="absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-black px-2 py-0.5 text-[10px] text-white">
              Đã sao chép!
            </span>
          )}
        </button>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {/* Ảnh gốc lớn */}
        <div className="relative h-56 w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-2xs">
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

        {/* Hàng loại sự cố + StatusChip + DelayChip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3.5 border border-gray-100 shadow-2xs">
          <div className="flex items-center gap-2">
            <CategoryIcon category={report.category} className="h-5 w-5" />
            <span className="text-sm font-bold text-gray-900">{categoryConfig.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <StatusChip status={report.status} variant="public" size="sm" />
            <DelayChip report={report} now={state.settings.demoNow} />
          </div>
        </div>

        {/* Vị trí */}
        <LocationRow address={report.address} />

        {/* Mô tả người dân nếu có */}
        {report.description && (
          <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-2xs text-xs text-gray-700">
            <span className="font-semibold text-gray-900">Mô tả của người dân: </span>
            <span>{report.description}</span>
          </div>
        )}

        {/* Cập nhật mới nhất */}
        <LatestUpdate report={report} now={state.settings.demoNow} />

        {/* Nếu trạng thái là HOÀN THÀNH: Hiện khối Trước/Sau và Hỏi ý kiến người dân */}
        {report.status === 'hoan_thanh' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Kết quả xử lý từ phường</h3>
              <BeforeAfter
                beforePhotos={report.photos}
                afterPhotos={report.resultPhotos}
                beforeTime={report.createdAt}
                afterTime={report.completedAt}
                category={report.category}
              />
            </div>

            {/* Khối xác nhận giải quyết */}
            <div className="rounded-3xl border border-primary-200 bg-primary-50/50 p-4 shadow-2xs space-y-3 text-center">
              <h3 className="text-sm font-bold text-gray-900">
                Vấn đề này đã được giải quyết chưa?
              </h3>
              <p className="text-xs text-gray-600">
                Ý kiến của bạn giúp nâng cao chất lượng phục vụ của phường Trấn Biên.
              </p>

              <div className="flex gap-2.5 pt-1">
                <Button
                  fullWidth
                  variant="primary"
                  onClick={() => setIsRatingOpen(true)}
                  className="flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Đã giải quyết</span>
                </Button>

                <Button
                  fullWidth
                  variant="outline"
                  onClick={handleReportUnresolved}
                  className="text-gray-700"
                >
                  <span>Chưa giải quyết</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Nếu trạng thái đã ĐÓNG và có feedback */}
        {report.status === 'dong' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Kết quả xử lý từ phường</h3>
              <BeforeAfter
                beforePhotos={report.photos}
                afterPhotos={report.resultPhotos}
                beforeTime={report.createdAt}
                afterTime={report.completedAt}
                category={report.category}
              />
            </div>

            {report.feedback && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Người dân đã xác nhận hài lòng ({report.feedback.rating || 5}★)</span>
                </div>
                {report.feedback.tags && report.feedback.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {report.feedback.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {report.feedback.comment && (
                  <p className="text-xs text-gray-600 italic">"{report.feedback.comment}"</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nếu trạng thái khác (chờ tiếp nhận, đã tiếp nhận, đang xử lý...) */}
        {report.status !== 'hoan_thanh' && report.status !== 'dong' && (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Hình ảnh đối chiếu</h3>
            <BeforeAfter
              beforePhotos={report.photos}
              afterPhotos={report.resultPhotos}
              beforeTime={report.createdAt}
              category={report.category}
            />
          </div>
        )}

        {/* Khối Hành trình xử lý */}
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-gray-900">Hành trình phản ánh</h3>
          </div>
          <Timeline report={report} now={state.settings.demoNow} />
        </div>
      </main>

      {/* Sheet đánh giá kết quả */}
      <RatingSheet
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
}
