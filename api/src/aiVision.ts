import { AiClassifyResult, Env, IncidentCategory } from './types';

const VALID_CATEGORIES: readonly IncidentCategory[] = [
  'den_duong',
  'ngap_nuoc',
  'rac_thai',
  'mat_duong',
];

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) return null;
  return { mimeType: match[1], base64Data: match[2] };
}

function inferFallbackCategory(hint?: string): AiClassifyResult {
  const normalized = (hint ?? '').toLowerCase();
  if (normalized.includes('den') || normalized.includes('đèn') || normalized.includes('light')) {
    return {
      category: 'den_duong',
      confidence: 0.72,
      reason: 'Gợi ý dự phòng từ ngữ cảnh ảnh (chưa cấu hình GEMINI_API_KEY).',
      isValidIncident: true,
      source: 'fallback',
    };
  }
  if (normalized.includes('ngap') || normalized.includes('ngập') || normalized.includes('flood') || normalized.includes('nuoc')) {
    return {
      category: 'ngap_nuoc',
      confidence: 0.72,
      reason: 'Gợi ý dự phòng từ ngữ cảnh ảnh (chưa cấu hình GEMINI_API_KEY).',
      isValidIncident: true,
      source: 'fallback',
    };
  }
  if (normalized.includes('rac') || normalized.includes('rác') || normalized.includes('trash') || normalized.includes('waste')) {
    return {
      category: 'rac_thai',
      confidence: 0.72,
      reason: 'Gợi ý dự phòng từ ngữ cảnh ảnh (chưa cấu hình GEMINI_API_KEY).',
      isValidIncident: true,
      source: 'fallback',
    };
  }
  return {
    category: 'mat_duong',
    confidence: 0.65,
    reason: 'Gợi ý dự phòng mặc định (cần cấu hình GEMINI_API_KEY để phân tích ảnh bằng AI thật).',
    isValidIncident: true,
    source: 'fallback',
  };
}

export async function classifyIncidentPhoto(
  imageDataUrl: string,
  hint: string | undefined,
  env: Env
): Promise<AiClassifyResult> {
  if (!env.GEMINI_API_KEY) {
    return inferFallbackCategory(hint);
  }

  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) {
    return {
      category: 'mat_duong',
      confidence: 0.5,
      reason: 'Định dạng ảnh chưa hỗ trợ gửi trực tiếp lên Gemini Vision.',
      isValidIncident: true,
      source: 'fallback',
    };
  }

  const prompt = [
    'Bạn là hệ thống phân loại phản ánh hiện trường đô thị cho UBND phường Trấn Biên.',
    'Hãy phân tích ảnh và trả về DUY NHẤT một JSON hợp lệ (không markdown) với các trường:',
    '- category: một trong 4 giá trị "den_duong" (đèn đường hỏng/tối), "ngap_nuoc" (ngập úng/nghẹt cống), "rac_thai" (rác thải ứ đọng/bốc mùi), "mat_duong" (ổ gà/sụt lún/nắp cống hư).',
    '- confidence: số thực từ 0 đến 1.',
    '- isValidIncident: boolean (true nếu là ảnh sự cố hiện trường hợp lệ, false nếu là ảnh selfie/mờ hoàn toàn/không liên quan).',
    '- reason: 1 câu tiếng Việt ngắn gọn (dưới 120 ký tự) giải thích nhận diện.',
  ].join('\n');

  const models = ['gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'] as const;

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: parsed.mimeType,
                    data: parsed.base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const result = JSON.parse(jsonText) as Partial<AiClassifyResult>;

      const category: IncidentCategory = VALID_CATEGORIES.includes(
        result.category as IncidentCategory
      )
        ? (result.category as IncidentCategory)
        : 'mat_duong';
      const confidence =
        typeof result.confidence === 'number' && Number.isFinite(result.confidence)
          ? Math.min(1, Math.max(0, result.confidence))
          : 0.78;

      return {
        category,
        confidence,
        reason:
          typeof result.reason === 'string' && result.reason.trim().length > 0
            ? result.reason.trim()
            : 'AI Gemini đã phân tích ảnh hiện trường.',
        isValidIncident: result.isValidIncident !== false,
        source: 'gemini',
      };
    } catch {
      continue;
    }
  }

  return inferFallbackCategory(hint);
}
