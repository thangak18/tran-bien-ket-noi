import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseAiResponse } from '../../server/services/ai/parser';
import { MockSuggester } from '../../server/services/ai/mock';
import { DeepSeekSuggester } from '../../server/services/ai/deepseek';

describe('AI-UNIT: AI Suggester Unit Tests', () => {
  describe('AI-UNIT-01: JSON Parser (parseAiResponse)', () => {
    it('1. Trích xuất JSON thuần chuẩn xác', () => {
      const input = JSON.stringify({
        category: 'den_duong',
        confidence: 0.95,
        reason: 'Phát hiện bóng đèn đường bị hỏng',
      });
      const res = parseAiResponse(input);
      expect(res.category).toBe('den_duong');
      expect(res.confidence).toBe(0.95);
      expect(res.reason).toBe('Phát hiện bóng đèn đường bị hỏng');
    });

    it('2. Trích xuất JSON nằm bên trong khối markdown ```json ... ```', () => {
      const input = `Dưới đây là kết quả phân tích:
\`\`\`json
{
  "category": "ngap_nuoc",
  "confidence": 0.88,
  "reason": "Mặt đường ngập nước sâu"
}
\`\`\`
Hy vọng giúp ích được bạn.`;
      const res = parseAiResponse(input);
      expect(res.category).toBe('ngap_nuoc');
      expect(res.confidence).toBe(0.88);
      expect(res.reason).toBe('Mặt đường ngập nước sâu');
    });

    it('3. Trích xuất JSON nằm giữa văn bản đàm thoại không có markdown', () => {
      const input = `Sau khi xem xét bức ảnh kỹ lưỡng, tôi nhận thấy {"category":"rac_thai","confidence":0.75,"reason":"Đống rác tự phát"} trên vỉa hè.`;
      const res = parseAiResponse(input);
      expect(res.category).toBe('rac_thai');
      expect(res.confidence).toBe(0.75);
      expect(res.reason).toBe('Đống rác tự phát');
    });

    it('4. Trả về category null nếu loại sự cố không thuộc 4 loại quy định', () => {
      const input = JSON.stringify({
        category: 'chay_nha',
        confidence: 0.99,
        reason: 'Phát hiện đám cháy',
      });
      const res = parseAiResponse(input);
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0);
    });

    it('5. Trả về category null nếu AI phản hồi "khong_ro"', () => {
      const input = JSON.stringify({
        category: 'khong_ro',
        confidence: 0.3,
        reason: 'Hình ảnh quá mờ hoặc chụp phong cảnh',
      });
      const res = parseAiResponse(input);
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0.3);
      expect(res.reason).toContain('Hình ảnh quá mờ');
    });

    it('6. Trả về fallback an toàn nếu văn bản không chứa JSON', () => {
      const input = 'Xin lỗi, tôi không thể xác định sự cố này từ hình ảnh được cung cấp.';
      const res = parseAiResponse(input);
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0);
    });

    it('7. Trả về fallback an toàn nếu confidence vượt quá khoảng 0.0 - 1.0', () => {
      const input = JSON.stringify({
        category: 'mat_duong',
        confidence: 1.5,
        reason: 'Ổ gà',
      });
      const res = parseAiResponse(input);
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0);
    });
  });

  describe('AI-UNIT-02: MockSuggester', () => {
    const mock = new MockSuggester();

    it('1. Nhận diện chính xác 4 loại sự cố từ đường dẫn demo-photos', async () => {
      const r1 = await mock.suggest({ dataUrl: '/demo-photos/den_duong/1.jpg' });
      expect(r1.category).toBe('den_duong');
      expect(r1.provider).toBe('mock');
      expect(r1.confidence).toBeGreaterThanOrEqual(0.9);

      const r2 = await mock.suggest({ dataUrl: '/demo-photos/ngap_nuoc/2.jpg' });
      expect(r2.category).toBe('ngap_nuoc');
      expect(r2.provider).toBe('mock');

      const r3 = await mock.suggest({ dataUrl: '/demo-photos/rac_thai/3.jpg' });
      expect(r3.category).toBe('rac_thai');
      expect(r3.provider).toBe('mock');

      const r4 = await mock.suggest({ dataUrl: '/demo-photos/mat_duong/4.jpg' });
      expect(r4.category).toBe('mat_duong');
      expect(r4.provider).toBe('mock');
    });

    it('2. Trả về category null nếu ảnh không nhận diện được (unrecognized/khong_ro)', async () => {
      const res = await mock.suggest({ dataUrl: 'data:image/jpeg;base64,khong_ro_sample' });
      expect(res.category).toBeNull();
      expect(res.confidence).toBeLessThan(0.5);
    });

    it('3. Fallback mặc định an toàn cho ảnh chung', async () => {
      const res = await mock.suggest({ dataUrl: 'data:image/jpeg;base64,regular_random_data' });
      expect(res.category).toBeNull();
      expect(res.provider).toBe('mock');
      expect(res.confidence).toBe(0.3);
    });
  });

  describe('AI-UNIT-03: DeepSeekSuggester', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('1. Gọi API thành công và trả về kết quả chuẩn', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  category: 'mat_duong',
                  confidence: 0.92,
                  reason: 'Ổ gà lớn giữa đường gây nguy hiểm',
                }),
              },
            },
          ],
        }),
      });

      const suggester = new DeepSeekSuggester({
        apiKey: 'test-key',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-flash',
        timeoutMs: 5000,
      });

      const res = await suggester.suggest({ dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' });
      expect(res.category).toBe('mat_duong');
      expect(res.confidence).toBe(0.92);
      expect(res.provider).toBe('deepseek');
      expect(res.reason).toBe('Ổ gà lớn giữa đường gây nguy hiểm');
      // Chế độ suy nghĩ phải tắt, nếu không deepseek-flash dồn hết max_tokens vào suy nghĩ và trả content rỗng.
      const sentBody = JSON.parse(
        (vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as RequestInit).body as string
      );
      expect(sentBody.thinking).toEqual({ type: 'disabled' });
    });

    it('2. Xử lý timeout và trả về fallback an toàn không ném 500', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const suggester = new DeepSeekSuggester({
        apiKey: 'test-key',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-flash',
        timeoutMs: 100,
      });

      const res = await suggester.suggest({ dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' });
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0);
      expect(res.provider).toBe('deepseek');
      expect(res.reason).toContain('Quá thời gian');
    });

    it('3. Xử lý lỗi HTTP 500 từ DeepSeek và trả về fallback an toàn', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const suggester = new DeepSeekSuggester({
        apiKey: 'test-key',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-flash',
      });

      const res = await suggester.suggest({ dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' });
      expect(res.category).toBeNull();
      expect(res.confidence).toBe(0);
      expect(res.provider).toBe('deepseek');
      expect(res.reason).toContain('Dịch vụ AI tạm thời');
    });
  });
});
