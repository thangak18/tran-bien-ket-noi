import { Check, Info, Sparkles } from 'lucide-react';
import { getCategoryConfig } from '@/domain/constants';
import { AiSuggestionData, Category } from '@/domain/types';

/** Dưới ngưỡng này coi như AI không nhận ra loại sự cố (spec AC-C04-1, B1). */
export const AI_MIN_CONFIDENCE = 0.5;

interface AiSuggestionBannerProps {
  loading: boolean;
  error: boolean;
  suggestion: AiSuggestionData | null;
  selectedCategory: Category;
  onUse: (category: Category) => void;
}

/**
 * Băng gợi ý loại sự cố từ ảnh (B1). Chỉ để tham khảo: người dân bấm "Dùng gợi ý" mới đổi loại,
 * không tự chọn thay, không chặn luồng gửi. Nhãn nguồn: deepseek → AI thật, mock → mô phỏng.
 */
export function AiSuggestionBanner({
  loading,
  error,
  suggestion,
  selectedCategory,
  onUse,
}: AiSuggestionBannerProps) {
  const privacyNote = (
    <p className="text-[11px] text-[var(--color-text-muted)]">
      Ảnh được gửi tới dịch vụ AI (DeepSeek) để gợi ý loại sự cố
    </p>
  );

  if (loading) {
    return (
      <div className="mb-3 space-y-1.5">
        <div
          data-testid="ai-suggestion-loading"
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm font-semibold text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
        >
          <Sparkles className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
          <span>Đang phân tích ảnh...</span>
        </div>
        {privacyNote}
      </div>
    );
  }

  const recognized =
    !error && suggestion?.category && suggestion.confidence >= AI_MIN_CONFIDENCE
      ? suggestion.category
      : null;

  if (!recognized) {
    if (!error && !suggestion) return <div className="mb-3">{privacyNote}</div>;
    return (
      <div className="mb-3 space-y-1.5">
        <div
          data-testid="ai-suggestion-unrecognized"
          className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">Không nhận ra loại sự cố, bạn chọn giúp nhé</span>
        </div>
        {privacyNote}
      </div>
    );
  }

  const label = getCategoryConfig(recognized).label;
  const isSelected = selectedCategory === recognized;
  const isDeepSeek = suggestion?.provider === 'deepseek';

  return (
    <div className="mb-3 space-y-1.5">
      <div
        data-testid="ai-suggestion-banner"
        className="flex flex-col gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/40"
      >
        <div className="flex items-start gap-2 text-[var(--color-text)]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#0084E8]" aria-hidden="true" />
          <p>
            <span className="font-semibold">AI gợi ý: </span>
            <span className="font-extrabold text-[#0084E8]">{label}</span>
            {suggestion?.reason && (
              <span className="text-[var(--color-text-muted)]"> – {suggestion.reason}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              isDeepSeek ? 'bg-[#0084E8] text-white' : 'bg-white text-[#0084E8] dark:bg-slate-900'
            }`}
          >
            {isDeepSeek ? 'Gợi ý bởi AI – vui lòng kiểm tra lại' : 'Gợi ý mô phỏng'}
          </span>
          {isSelected ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Đang chọn
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onUse(recognized)}
              className="rounded-xl bg-[#0084E8] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#006EC4]"
            >
              Dùng gợi ý
            </button>
          )}
        </div>
      </div>
      {privacyNote}
    </div>
  );
}
