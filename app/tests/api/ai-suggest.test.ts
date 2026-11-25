/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { app } from '../../server/app';

// 1x1 pixel JPEG base64 (valid JPEG magic bytes FF D8 FF)
const VALID_JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('AI-API: /ai/suggest-category endpoint tests', () => {
  it('AI-API-01: Báo lỗi 422 khi không cung cấp trường image', async () => {
    const res = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code || body.code).toBe('INVALID_IMAGE');
  });

  it('AI-API-02: Báo lỗi 422 khi cung cấp base64 hỏng', async () => {
    const res = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'data:image/jpeg;base64,!!!invalid-base64!!!' }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code || body.code).toBe('INVALID_IMAGE');
  });

  it('AI-API-03: Báo lỗi 422 khi magic bytes không phải JPEG/PNG/WebP', async () => {
    // Chuỗi text base64 giả danh ảnh
    const fakeImage =
      'data:image/jpeg;base64,' + Buffer.from('hello-world-not-an-image').toString('base64');
    const res = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: fakeImage }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code || body.code).toBe('INVALID_IMAGE');
    expect(body.error?.message || body.message).toContain('JPEG, PNG hoặc WebP');
  });

  it('AI-API-04: Báo lỗi 422 khi dung lượng ảnh > 1.5MB', async () => {
    // Tạo buffer lớn hơn 1.5MB với header JPEG hợp lệ
    const largeBuffer = Buffer.alloc(1.6 * 1024 * 1024);
    // Header JPEG magic bytes: FF D8 FF E0
    largeBuffer[0] = 0xff;
    largeBuffer[1] = 0xd8;
    largeBuffer[2] = 0xff;
    largeBuffer[3] = 0xe0;

    const largeDataUrl = 'data:image/jpeg;base64,' + largeBuffer.toString('base64');
    const res = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: largeDataUrl }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code || body.code).toBe('INVALID_IMAGE');
    expect(body.error?.message || body.message).toContain('vượt quá giới hạn 1.5 MB');
  });

  it('AI-API-05: Gợi ý thành công với ảnh demo path', async () => {
    const res = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `192.168.10.${Date.now() % 250}`,
      },
      body: JSON.stringify({ image: '/demo-photos/den_duong/1.jpg' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category).toBe('den_duong');
    expect(body.confidence).toBeGreaterThan(0.5);
    expect(body.provider).toBeDefined();
  });

  it('AI-API-06: Gợi ý thành công với dữ liệu base64 hợp lệ', async () => {
    const res = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `192.168.11.${Date.now() % 250}`,
      },
      body: JSON.stringify({ image: VALID_JPEG_DATA_URL }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBeDefined();
    expect(body.confidence).toBeDefined();
  });

  it('AI-API-07: Giới hạn tần suất 10 lượt / 10 phút trả về 429 khi vượt ngưỡng', async () => {
    const ip = `192.168.99.${Math.floor(Math.random() * 200 + 10)}`;
    // Gửi 10 request hợp lệ
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/ai/suggest-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip,
        },
        body: JSON.stringify({ image: '/demo-photos/mat_duong/1.jpg' }),
      });
      expect(res.status).toBe(200);
    }

    // Request thứ 11 từ cùng IP
    const blockedRes = await app.request('/ai/suggest-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({ image: '/demo-photos/mat_duong/1.jpg' }),
    });
    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error?.code || body.code).toBe('TOO_MANY_ATTEMPTS');
  });
});
