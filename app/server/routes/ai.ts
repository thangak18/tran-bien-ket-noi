import { Hono } from 'hono';
import { env } from '../env';
import { AppError } from '../middleware/errorHandler';
import { validateMagicBytes } from './uploads';
import { checkAiRateLimit, isAiDailyLimitExceeded, recordAiAttempt } from '../middleware/rateLimit';
import { getCategorySuggester, ImageInput } from '../services/ai';
import type { AppEnv } from '../types';

export const aiRoutes = new Hono<AppEnv>();

const MAX_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

/**
 * Trích xuất Buffer và MimeType từ Base64 hoặc Data URL
 */
function extractImageBuffer(dataUrlOrBase64: string): {
  buffer: Buffer;
  mimeType: string;
  dataUrl: string;
} {
  let mimeType = 'image/jpeg';
  let base64Data = dataUrlOrBase64;

  const match = dataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (match && match[1] && match[2]) {
    mimeType = match[1];
    base64Data = match[2];
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const normalizedDataUrl = match ? dataUrlOrBase64 : `data:${mimeType};base64,${base64Data}`;
  return { buffer, mimeType, dataUrl: normalizedDataUrl };
}

/**
 * POST /ai/suggest-category
 * Gợi ý loại sự cố từ ảnh bằng DeepSeek Vision (hoặc Mock). Không yêu cầu đăng nhập.
 */
aiRoutes.post('/suggest-category', async (c) => {
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const deviceId = c.req.header('x-device-id') || undefined;

  // 1. Kiểm tra Rate Limit: 10 lượt / 10 phút / IP-thiết bị
  await checkAiRateLimit(ip, deviceId);

  // 2. Parse payload
  const body = await c.req.json().catch(() => ({}));
  const rawImage = typeof body.image === 'string' ? body.image.trim() : '';

  if (!rawImage) {
    throw new AppError(
      'INVALID_IMAGE',
      'Vui lòng cung cấp dữ liệu hình ảnh (chuỗi base64 hoặc data URL)',
      422
    );
  }

  // 3. Xử lý ảnh mẫu hoặc data URL
  let imageInput: ImageInput;
  if (rawImage.startsWith('/demo-photos/')) {
    // Ảnh demo cục bộ
    imageInput = { dataUrl: rawImage };
  } else {
    // Giải mã và kiểm tra kích thước / magic bytes
    let extracted: { buffer: Buffer; mimeType: string; dataUrl: string };
    try {
      extracted = extractImageBuffer(rawImage);
    } catch {
      throw new AppError('INVALID_IMAGE', 'Không thể giải mã dữ liệu hình ảnh base64', 422);
    }

    if (extracted.buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new AppError(
        'INVALID_IMAGE',
        `Dung lượng ảnh (${(extracted.buffer.length / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn 1.5 MB`,
        422
      );
    }

    const magic = validateMagicBytes(new Uint8Array(extracted.buffer));
    if (!magic.valid) {
      throw new AppError(
        'INVALID_IMAGE',
        'Định dạng ảnh không hợp lệ. Chỉ chấp nhận các định dạng JPEG, PNG hoặc WebP',
        422
      );
    }

    imageInput = {
      dataUrl: extracted.dataUrl,
      buffer: extracted.buffer,
      mimeType: magic.format || extracted.mimeType,
    };
  }

  // Ghi nhận lượt gọi vào access_attempts sau khi validate ảnh hợp lệ
  await recordAiAttempt(ip, deviceId);

  // 4. Kiểm tra hạn ngạch toàn hệ thống (AI_DAILY_LIMIT)
  const isExceeded = await isAiDailyLimitExceeded(env.AI_DAILY_LIMIT);
  if (isExceeded) {
    return c.json({
      category: null,
      confidence: 0,
      reason: 'Tạm hết lượt gợi ý hôm nay',
      provider: env.AI_PROVIDER,
    });
  }

  // 5. Gọi Suggester (DeepSeek hoặc Mock)
  const suggester = getCategorySuggester();
  const startTime = Date.now();
  const result = await suggester.suggest(imageInput);
  const latency = Date.now() - startTime;

  // Log ngắn gọn an toàn (không ghi ảnh, prompt đầy đủ hay key)
  const requestId = c.get('requestId') || 'req-ai';
  console.log(
    `[AI Route] id=${requestId} provider=${result.provider} cat=${result.category} conf=${result.confidence.toFixed(2)} dur=${latency}ms`
  );

  return c.json({
    category: result.category,
    confidence: result.confidence,
    reason: result.reason,
    provider: result.provider,
  });
});
