import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareOrCopy, buildTrackingUrl } from '@/lib/share';

describe('UT-039 – Share and Tracking Link', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('buildTrackingUrl tạo link chuẩn có secretCode khi có mã', () => {
    const url = buildTrackingUrl('TB-0010', '1234', 'https://tranbien.vn');
    expect(url).toBe('https://tranbien.vn/phan-anh/TB-0010?k=1234');
  });

  it('buildTrackingUrl tạo link không có ?k= khi không có mã', () => {
    const url = buildTrackingUrl('TB-0010', undefined, 'https://tranbien.vn');
    expect(url).toBe('https://tranbien.vn/phan-anh/TB-0010');
  });

  it('có navigator.share -> gọi với { title, text, url } chứa ?k=', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: {
        share: shareMock,
      },
      writable: true,
    });

    const url = 'https://tranbien.vn/phan-anh/TB-0065?k=9876';
    const result = await shareOrCopy({
      title: 'Phản ánh Trấn Biên',
      text: 'Mã theo dõi phản ánh',
      url,
    });

    expect(shareMock).toHaveBeenCalledWith({
      title: 'Phản ánh Trấn Biên',
      text: 'Mã theo dõi phản ánh',
      url,
    });
    expect(result).toBe('shared');
  });

  it('không có navigator.share -> navigator.clipboard.writeText(url) và trả "copied"', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: {
        clipboard: {
          writeText: writeTextMock,
        },
      },
      writable: true,
    });

    const url = 'https://tranbien.vn/phan-anh/TB-0065?k=9876';
    const result = await shareOrCopy({ url });

    expect(writeTextMock).toHaveBeenCalledWith(url);
    expect(result).toBe('copied');
  });

  it('người dùng huỷ share (AbortError) -> trả "cancelled", không báo lỗi', async () => {
    const abortError = new Error('Share canceled');
    abortError.name = 'AbortError';
    const shareMock = vi.fn().mockRejectedValue(abortError);

    Object.defineProperty(global, 'navigator', {
      value: {
        share: shareMock,
      },
      writable: true,
    });

    const result = await shareOrCopy({
      url: 'https://tranbien.vn/phan-anh/TB-0065?k=9876',
    });

    expect(result).toBe('cancelled');
  });
});
