import { CATEGORY_CONFIGS, STATUS_CONFIGS } from '@/domain/constants';
import { formatDateTime } from '@/domain/format';
import { isOverdue } from '@/domain/sorting';
import { Report } from '@/domain/types';

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildReportsCsv(reports: readonly Report[], nowIso: string): string {
  const headers = [
    'Mã hồ sơ',
    'Loại sự cố',
    'Tiêu đề',
    'Địa chỉ',
    'Trạng thái',
    'Bộ phận xử lý',
    'Thời gian gửi',
    'Hạn xử lý',
    'Quá hạn',
    'Nguồn gửi',
  ];

  const categoryMap = new Map(CATEGORY_CONFIGS.map((c) => [c.key, c.label]));
  const rows = reports.map((r) => [
    r.id,
    categoryMap.get(r.category) ?? r.category,
    r.title || r.description || '',
    r.address,
    STATUS_CONFIGS[r.status]?.officerLabel ?? r.status,
    r.department ?? 'Chưa phân công',
    formatDateTime(r.createdAt),
    r.dueAt ? formatDateTime(r.dueAt) : '',
    isOverdue(r, nowIso) ? 'Có' : 'Không',
    r.anonymous ? 'Ẩn danh' : r.onBehalf ? 'Gửi hộ' : 'Có SĐT',
  ]);

  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  // Thêm UTF-8 BOM để Excel tiếng Việt mở không bị lỗi font
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadReportsCsv(
  reports: readonly Report[],
  nowIso: string,
  filename?: string
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const csv = buildReportsCsv(reports, nowIso);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = nowIso.slice(0, 10);
  link.href = url;
  link.download = filename || `bao-cao-tran-bien-${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
