import { Hono } from 'hono';
import crypto from 'node:crypto';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';

export const uploadRoutes = new Hono();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Kiểm tra magic bytes của ảnh (Spec 15.2, PHOTO-001)
 */
export function validateMagicBytes(buffer: Uint8Array): { valid: boolean; format?: string } {
  if (buffer.length < 4) return { valid: false };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, format: 'image/png' };
  }

  // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, format: 'image/webp' };
  }

  return { valid: false };
}

/**
 * POST /uploads/sign - Xin URL tải lên kèm chữ ký (Spec 15, PHOTO-001)
 */
uploadRoutes.post('/sign', async (c) => {
  const body = await c.req.json();
  const contentType = body.contentType?.toLowerCase();
  const sizeBytes = Number(body.sizeBytes || 0);
  const fileName = body.fileName || 'photo.jpg';

  if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new AppError(
      'INVALID_FILE_TYPE',
      'Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP.',
      400
    );
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 'Kích thước ảnh vượt quá giới hạn 10MB', 400);
  }

  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const fileUuid = crypto.randomUUID();
  const storagePath = `reports/${year}/${month}/${fileUuid}.${ext}`;

  // Ghi nhận vào pending_uploads (Spec 11.2, 15.3)
  const deviceId = c.req.header('X-Device-Id') || 'web-upload';
  await sqlClient`
    INSERT INTO pending_uploads (path, device_id, created_at, attached)
    VALUES (${storagePath}, ${deviceId}, now(), false)
    ON CONFLICT (path) DO NOTHING;
  `;

  // Trong chế độ phát triển / mock, cấp URL upload giả lập
  const uploadUrl = `/api/uploads/file/${storagePath}`;
  const signedUrl = `/api/uploads/file/${storagePath}?expires=${Math.floor(Date.now() / 1000) + 3600}`;

  return c.json({
    path: storagePath,
    uploadUrl,
    signedUrl,
    expiresInSeconds: 3600,
  });
});
