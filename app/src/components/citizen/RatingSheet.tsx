import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { FEEDBACK_POSITIVE_TAGS, FEEDBACK_NEGATIVE_TAGS } from '@/domain/constants';

export interface RatingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { rating: number; tags: string[]; comment?: string }) => void;
  isSubmitting?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
};

export const RatingSheet: React.FC<RatingSheetProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');

  const handleSelectStar = (stars: number) => {
    setRating(stars);
    // Khi đổi giữa nhóm tích cực (4-5) và nhóm tiêu cực (1-3), reset tags không phù hợp
    if (stars >= 4) {
      setSelectedTags((prev) => prev.filter((t) => FEEDBACK_POSITIVE_TAGS.includes(t)));
    } else {
      setSelectedTags((prev) => prev.filter((t) => FEEDBACK_NEGATIVE_TAGS.includes(t)));
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || isSubmitting) return;

    onSubmit({
      rating,
      tags: selectedTags,
      comment: comment.trim() || undefined,
    });
  };

  const availableTags =
    rating >= 4 ? FEEDBACK_POSITIVE_TAGS : rating > 0 ? FEEDBACK_NEGATIVE_TAGS : [];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <div className="text-base font-bold text-gray-900">Bạn thấy kết quả thế nào?</div>
          <div className="text-xs font-normal text-gray-500 mt-0.5">Chưa đến 30 giây</div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Hàng 5 sao */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} sao`}
                  onClick={() => handleSelectStar(star)}
                  className="flex h-11 w-11 min-h-[var(--tap)] min-w-[var(--tap)] items-center justify-center rounded-full transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-gray-300 hover:text-amber-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-sm font-semibold text-gray-800 min-h-[20px]">
            {rating > 0 ? RATING_LABELS[rating] : ' '}
          </div>
        </div>

        {/* Danh sách chip theo số sao */}
        {rating > 0 && availableTags.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">
              {rating >= 4 ? 'Điều gì làm bạn hài lòng?' : 'Điểm nào chưa hài lòng?'}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ô góp ý tuỳ chọn */}
        {rating > 0 && (
          <div>
            <label
              htmlFor="feedback-comment"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Phường có thể làm tốt hơn điều gì? (không bắt buộc)
            </label>
            <textarea
              id="feedback-comment"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ý kiến góp ý để phường phục vụ tốt hơn..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Nút gửi đánh giá */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={rating === 0 || isSubmitting}
            className="w-full min-h-[var(--btn-h)]"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
