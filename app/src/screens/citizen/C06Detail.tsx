import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Star, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { submitFeedback } from '@/store/citizenActions';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { StatusChip } from '@/components/common/StatusChip';
import { DelayChip } from '@/components/common/DelayChip';
import { ProgressBar } from '@/components/common/ProgressBar';
import { BeforeAfter } from '@/components/citizen/BeforeAfter';
import { RatingSheet } from '@/components/citizen/RatingSheet';
import { formatLatestUpdate, computeDelayDays } from '@/domain/latestUpdate';
import { formatDateTime } from '@/domain/format';

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

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [isRatingSheetOpen, setIsRatingSheetOpen] = useState<boolean>(false);

  const report = state.reports.find((r) => r.id === id);

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-base font-bold text-gray-900">Không tìm thấy hồ sơ</h2>
        <p className="mt-1 text-xs text-gray-500">Mã phản ánh {id} không tồn tại.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 rounded-btn bg-primary px-4 py-2 text-xs font-bold text-white shadow-soft"
        >
          Về trang chủ
        </button>
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
    <div className="min-h-screen bg-background pb-16">
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

      <main className="mx-auto max-w-md px-4 py-3 space-y-3">
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

          {/* Thanh tiến trình 4 bước có nhãn dưới */}
          <ProgressBar report={report} />

          {/* Câu LatestUpdate + DelayChip nếu chậm */}
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

        {/* 4. (hoan_thanh/dong) Thẻ "Ảnh Trước / Sau xử lý (Chạm để phóng to)" */}
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

        {/* 5. (hoan_thanh) Thẻ "Vấn đề đã được giải quyết chưa?": 5 sao + 2 nút ngang */}
        {report.status === 'hoan_thanh' && (
          <div className="rounded-card border border-primary-200 bg-[#EFF4FF]/60 p-4 shadow-soft space-y-3 text-center">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Vấn đề đã được giải quyết chưa?
            </h3>

            {/* 5 sao */}
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

            {/* Dòng {n}/5 sao · {nhãn} (Chạm để chọn) */}
            <p className="text-xs font-bold text-gray-700">
              {selectedRating}/5 sao · {STAR_LABELS[selectedRating] || 'Hài lòng'}{' '}
              <span className="font-normal text-gray-400">(Chạm để chọn)</span>
            </p>

            {/* 2 nút ngang: "Đã giải quyết" (xanh lá) / "Chưa giải quyết" (viền) */}
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

        {/* 6. Thẻ "Lịch sử cập nhật": danh sách gạch đầu dòng "• dd/MM HH:mm · {câu}" mới nhất trên cùng */}
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
