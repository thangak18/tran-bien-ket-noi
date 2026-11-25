import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildExcelRows,
  formatPhotosForExcel,
  parsePhotosFromExcel,
  parseReportsFromExcel,
} from '@/lib/inboxExcel';
import { getInitialState } from '@/store/AppStore';
import type { Report } from '@/domain/types';

function makeSampleReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'TB-0001',
    category: 'mat_duong',
    photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    photosApproved: true,
    lat: 10.9462,
    lng: 106.8171,
    address: 'Đ. Nguyễn Văn Trị, P. Trấn Biên',
    description: 'Ổ gà lớn trước cổng trường',
    createdAt: '2026-11-25T10:00:00.000Z',
    status: 'moi',
    priority: 'binh_thuong',
    department: 'Tổ hạ tầng giao thông',
    dueAt: '2026-11-30T10:00:00.000Z',
    reporterPhone: '0909123456',
    anonymous: false,
    subscribedLater: false,
    secretCode: '1234',
    onBehalf: false,
    followers: [],
    anonymousFollows: 0,
    timeline: [],
    ...overrides,
  };
}

describe('inboxExcel với cột Ảnh', () => {
  it('xuất cột Ảnh với nhiều URL phân cách rõ ràng và giới hạn độ dài ô Excel', () => {
    const report = makeSampleReport();
    const rows = buildExcelRows([report]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!['Ảnh']).toBe('https://example.com/a.jpg | https://example.com/b.jpg');

    const hugeBase64 = `data:image/jpeg;base64,${'A'.repeat(40000)}`;
    const formattedHuge = formatPhotosForExcel([hugeBase64, '/img/local.png']);
    expect(formattedHuge.length).toBeLessThanOrEqual(32767);
    expect(formattedHuge).toContain('[Ảnh #1 (dữ liệu quá dài cho ô Excel)]');
    expect(formattedHuge).toContain('/img/local.png');
  });

  it('parsePhotosFromExcel hỗ trợ URL thường, data URI và bỏ qua placeholder', () => {
    expect(parsePhotosFromExcel('https://example.com/1.jpg | https://example.com/2.png')).toEqual([
      'https://example.com/1.jpg',
      'https://example.com/2.png',
    ]);

    const smallDataUri = 'data:image/png;base64,iVBORw0KGgo=';
    expect(parsePhotosFromExcel(`${smallDataUri} | /assets/p.jpg`)).toEqual([
      smallDataUri,
      '/assets/p.jpg',
    ]);

    expect(
      parsePhotosFromExcel('[Ảnh #1 (dữ liệu quá dài cho ô Excel)] | https://example.com/ok.jpg')
    ).toEqual(['https://example.com/ok.jpg']);
  });

  it('nhận lại cột Ảnh khi import file Excel đã xuất', async () => {
    const sample = makeSampleReport();
    const rows = buildExcelRows([sample]);
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'PhanAnh');
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const file = new File([arrayBuffer], 'test-export.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    if (typeof file.arrayBuffer !== 'function') {
      Object.defineProperty(file, 'arrayBuffer', {
        value: async () => arrayBuffer,
      });
    }

    const result = await parseReportsFromExcel(file, getInitialState(), '2026-11-25T12:00:00.000Z');
    expect(result.skipped).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.report.photos).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
    ]);
  });
});
