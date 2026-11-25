import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { CATEGORY_CONFIGS } from '@/domain/constants';
import { Category } from '@/domain/types';
import { AiClassifyApiResponse, classifyPhotoApi, getApiBaseUrl } from '@/lib/apiClient';

export interface AiCategoryBannerProps {
  photoUrl: string;
  selectedCategory: Category;
  onApplyCategory: (category: Category) => void;
}

function localFallbackClassify(photoUrl: string): AiClassifyApiResponse {
  const lower = photoUrl.toLowerCase();
  if (lower.includes('den_duong')) {
    return {
      category: 'den_duong',
      confidence: 0.82,
      reason: 'Nhận diện nhanh từ ngữ cảnh ảnh mẫu (chưa kết nối máy chủ Gemini API).',
      isValidIncident: true,
      source: 'fallback',
    };
  }
  if (lower.includes('ngap_nuoc')) {
    return {
      category: 'ngap_nuoc',
      confidence: 0.82,
      reason: 'Nhận diện nhanh từ ngữ cảnh ảnh mẫu (chưa kết nối máy chủ Gemini API).',
      isValidIncident: true,
      source: 'fallback',
    };
  }
  if (lower.includes('rac_thai')) {
    return {
      category: 'rac_thai',
      confidence: 0.82,
      reason: 'Nhận diện nhanh từ ngữ cảnh ảnh mẫu (chưa kết nối máy chủ Gemini API).',
      isValidIncident: true,
      source: 'fallback',
    };
  }
  return {
    category: 'mat_duong',
    confidence: 0.74,
    reason: 'Gợi ý dự phòng (gắn VITE_API_BASE_URL + GEMINI_API_KEY để phân tích AI thật).',
    isValidIncident: true,
    source: 'fallback',
  };
}

async function toImageDataUrl(photoUrl: string): Promise<string> {
  if (photoUrl.startsWith('data:image/')) return photoUrl;
  try {
    const res = await fetch(photoUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : photoUrl);
      reader.onerror = () => reject(new Error('read-failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return photoUrl;
  }
}

export function AiCategoryBanner({
  photoUrl,
  selectedCategory,
  onApplyCategory,
}: AiCategoryBannerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiClassifyApiResponse | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const imageDataUrl = await toImageDataUrl(photoUrl);
      const apiRes = await classifyPhotoApi(imageDataUrl, photoUrl);
      setResult(apiRes ?? localFallbackClassify(photoUrl));
    } finally {
      setLoading(false);
    }
  }, [photoUrl]);

  useEffect(() => {
    if (!getApiBaseUrl() || !photoUrl) return;
    void handleAnalyze();
  }, [photoUrl, handleAnalyze]);

  const suggestedConfig = result
    ? CATEGORY_CONFIGS.find((c) => c.key === result.category)
    : undefined;

  return (
    <div
      data-testid="ai-category-banner"
      className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3 dark:border-sky-900/80 dark:bg-sky-950/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-sky-900 dark:text-sky-200">
          <Sparkles className="h-4 w-4 text-[#0084E8]" aria-hidden="true" />
          <span>Trợ lý AI gợi ý loại sự cố từ ảnh</span>
        </div>
        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#0084E8] border border-sky-200 hover:bg-sky-50 disabled:opacity-60 dark:bg-slate-900 dark:border-sky-800 dark:text-sky-300"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang phân tích…
            </>
          ) : (
            <span>{result ? 'Phân tích lại' : 'Gợi ý bằng AI'}</span>
          )}
        </button>
      </div>

      {result && suggestedConfig && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs border border-sky-100 dark:bg-slate-900/80 dark:border-sky-900/70">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold text-[var(--color-text)]">
                Đề xuất: {suggestedConfig.label}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-900/70 dark:text-sky-200">
                {Math.round(result.confidence * 100)}% ·{' '}
                {result.source === 'gemini' ? 'AI Gemini' : 'Gợi ý dự phòng'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">{result.reason}</p>
          </div>
          {selectedCategory !== result.category && (
            <button
              type="button"
              onClick={() => onApplyCategory(result.category)}
              className="shrink-0 rounded-lg bg-[#0084E8] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#006EC4]"
            >
              Áp dụng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
