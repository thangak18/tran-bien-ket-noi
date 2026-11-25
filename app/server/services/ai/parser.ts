import { z } from 'zod';
import { Category } from '../../../src/domain/types';

export const rawAiResponseSchema = z.object({
  category: z.enum(['den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong', 'khong_ro']),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(120).default(''),
});

export function parseAiResponse(rawText: string): {
  category: Category | null;
  confidence: number;
  reason: string;
} {
  if (!rawText || typeof rawText !== 'string') {
    return {
      category: null,
      confidence: 0,
      reason: 'Phản hồi trống từ mô hình AI',
    };
  }

  // 1. Tìm khối JSON đầu tiên {...}
  const match = rawText.match(/\{[\s\S]*?\}/);
  if (!match) {
    return {
      category: null,
      confidence: 0,
      reason: 'Không tìm thấy cấu trúc JSON hợp lệ trong câu trả lời',
    };
  }

  try {
    const json = JSON.parse(match[0]);
    const parsed = rawAiResponseSchema.safeParse(json);
    if (!parsed.success) {
      return {
        category: null,
        confidence: 0,
        reason: 'Định dạng dữ liệu phân tích không hợp lệ',
      };
    }

    if (parsed.data.category === 'khong_ro') {
      return {
        category: null,
        confidence: parsed.data.confidence,
        reason: parsed.data.reason || 'Không nhận diện được loại sự cố đô thị rõ ràng',
      };
    }

    return {
      category: parsed.data.category as Category,
      confidence: parsed.data.confidence,
      reason: parsed.data.reason || 'Nhận diện sự cố từ ảnh',
    };
  } catch {
    return {
      category: null,
      confidence: 0,
      reason: 'Lỗi giải mã cấu trúc dữ liệu AI',
    };
  }
}
