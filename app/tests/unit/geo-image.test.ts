import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentLocation } from '@/lib/geolocation';
import { compressImage } from '@/lib/image';

describe('UT-035 – Lib Geolocation & Image compression', () => {
  describe('geolocation.ts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('1. mock getCurrentPosition không gọi callback -> reject timeout sau 10s', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn(), // Không gọi callback nào
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        geolocation: mockGeolocation,
      });

      const promise = getCurrentLocation({ timeoutMs: 10000 });

      // Nhảy thời gian 10 giây
      vi.advanceTimersByTime(10001);

      await expect(promise).rejects.toMatchObject({
        code: 'timeout',
      });
    });

    it('2. PERMISSION_DENIED -> reject denied', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({
            code: 1, // PERMISSION_DENIED
            message: 'User denied geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        }),
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        geolocation: mockGeolocation,
      });

      await expect(getCurrentLocation()).rejects.toMatchObject({
        code: 'denied',
      });
    });

    it('3. Lấy vị trí thành công -> trả về lat, lng', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 10.9505,
              longitude: 106.8225,
            },
          });
        }),
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        geolocation: mockGeolocation,
      });

      const loc = await getCurrentLocation();
      expect(loc).toEqual({ lat: 10.9505, lng: 106.8225 });
    });
  });

  describe('image.ts', () => {
    it('ảnh 4000x3000 -> kết quả cạnh dài 1280; định dạng image/jpeg', async () => {
      // Mock HTMLCanvasElement & Image trong jsdom
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'canvas') {
          const canvas = originalCreateElement('canvas');
          canvas.getContext = vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          });
          canvas.toDataURL = vi.fn((type) => `data:${type || 'image/jpeg'};base64,mockdata`);
          canvas.toBlob = vi.fn((callback, type) => {
            callback?.(new Blob(['mockdata'], { type: type || 'image/jpeg' }));
          });
          return canvas;
        }
        return originalCreateElement(tagName);
      });

      // Mock Image constructor
      const originalImage = global.Image;
      global.Image = class {
        width = 4000;
        height = 3000;
        onload: (() => void) | null = null;
        src = '';
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      } as unknown as typeof Image;

      try {
        const result = await compressImage('data:image/png;base64,mockinput', 1280, 0.8);

        // Cạnh dài 1280
        expect(result.width).toBe(1280);
        expect(result.height).toBe(960);
        expect(result.dataUrl).toContain('image/jpeg');
      } finally {
        global.Image = originalImage;
      }
    });
  });
});
