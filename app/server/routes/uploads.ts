import { Hono } from 'hono';
import crypto from 'node:crypto';
import { sqlClient } from '../db/client';
import { env } from '../env';
import { AppError } from '../middleware/errorHandler';

export const uploadRoutes = new Hono();

const STORAGE_BUCKET = 'report-photos';
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
 * POST /uploads/sign - Xin URL tải lên kèm chữ ký vào bucket riêng tư report-photos (Spec 15, PHOTO-001)
 */
uploadRoutes.post('/sign', async (c) => {
  const body = await c.req.json();
  const contentType = String(body.contentType || body.mimeType || '').toLowerCase();
  const sizeBytes = Number(body.sizeBytes || 0);

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

  // Xin signed upload URL thật từ Supabase Storage (bucket riêng tư report-photos)
  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const signEndpoint = `${baseUrl}/storage/v1/object/upload/sign/${STORAGE_BUCKET}/${storagePath}`;
  let uploadUrl = `/api/v1/uploads/file/${storagePath}`;
  let token = '';

  try {
    const res = await fetch(signEndpoint, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = (await res.json()) as { url?: string; token?: string };
      if (data.url) {
        uploadUrl = data.url.startsWith('http')
          ? data.url
          : `${baseUrl}/storage/v1${data.url.startsWith('/') ? '' : '/'}${data.url}`;
      }
      token = data.token ?? '';
    } else if (!env.DEMO_MODE) {
      throw new AppError(
        'STORAGE_SIGN_FAILED',
        'Không thể tạo liên kết tải ảnh lên kho lưu trữ',
        502
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (!env.DEMO_MODE) {
      throw new AppError(
        'STORAGE_UNAVAILABLE',
        'Kho lưu trữ ảnh tạm thời không khả dụng. Vui lòng thử lại sau.',
        503
      );
    }
  }

  return c.json({
    path: storagePath,
    storagePath,
    uploadUrl,
    token,
    expiresInSeconds: 3600,
  });
});

/**
 * GET /uploads/signed-url?path=... - Cấp URL đọc ảnh có chữ ký tạm thời (Spec 15)
 */
uploadRoutes.get('/signed-url', async (c) => {
  const storagePath = c.req.query('path')?.trim();
  if (!storagePath || storagePath.includes('..') || !storagePath.startsWith('reports/')) {
    throw new AppError('INVALID_PATH', 'Đường dẫn ảnh không hợp lệ', 400);
  }

  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const res = await fetch(`${baseUrl}/storage/v1/object/sign/${STORAGE_BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 3600 }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new AppError('STORAGE_SIGN_FAILED', 'Không thể tạo liên kết xem ảnh', 502);
  }

  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const rawSigned = data.signedURL || data.signedUrl || '';
  const signedUrl = rawSigned.startsWith('http')
    ? rawSigned
    : `${baseUrl}/storage/v1${rawSigned.startsWith('/') ? '' : '/'}${rawSigned}`;

  return c.json({ path: storagePath, signedUrl, expiresInSeconds: 3600 });
});
