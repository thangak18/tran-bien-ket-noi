import { describe, it, expect } from 'vitest';
import { parseReportQrPayload } from '@/components/citizen/QrScannerModal';

describe('QR-001 – Đọc mã QR phản ánh (AC-C01-8)', () => {
  it('đọc được link đầy đủ, link có ?k= và mã nhập tay', () => {
    expect(parseReportQrPayload('https://tranbien.vn/phan-anh/TB-0012')).toEqual({ id: 'TB-0012' });
    expect(parseReportQrPayload('https://tranbien.vn/phan-anh/TB-0042?k=4821')).toMatchObject({
      id: 'TB-0042',
      key: '4821',
    });
    expect(parseReportQrPayload('  tb-0005 ')?.id).toBe('TB-0005');
  });

  it('nội dung không phải mã phản ánh → null (giao diện báo lỗi bằng lời)', () => {
    expect(parseReportQrPayload('https://example.com/abc')).toBeNull();
    expect(parseReportQrPayload('')).toBeNull();
  });
});
