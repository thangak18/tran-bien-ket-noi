import * as XLSX from 'xlsx';
import { CATEGORY_CONFIGS, STATUS_CONFIGS } from '@/domain/constants';
import { formatDate } from '@/domain/format';
import { Category, Notification, Report } from '@/domain/types';
import { createOnBehalf } from '@/store/officerActions';
import { WARD_CENTER, STREETS } from '@/data/streets';
import { AppState } from '@/store/AppStore';
import { CreateOnBehalfInput } from '@/data/DataSource';

function getCategoryLabel(cat: Category): string {
  return CATEGORY_CONFIGS.find((c) => c.key === cat)?.label ?? cat;
}

function parseCategory(raw: unknown): Category {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'den_duong' || s.includes('đèn')) return 'den_duong';
  if (s === 'ngap_nuoc' || s.includes('ngập')) return 'ngap_nuoc';
  if (s === 'rac_thai' || s.includes('rác')) return 'rac_thai';
  if (s === 'mat_duong' || s.includes('đường') || s.includes('ổ gà')) return 'mat_duong';
  return 'mat_duong';
}

const EXCEL_CELL_MAX_LENGTH = 32767;
const PHOTO_DELIMITER = ' | ';

export function formatPhotosForExcel(photos?: string[]): string {
  if (!photos || photos.length === 0) return '';
  const safeEntries = photos
    .map((p, idx) => {
      const trimmed = String(p ?? '').trim();
      if (!trimmed) return '';
      if (trimmed.length > 32000) {
        return `[Ảnh #${idx + 1} (dữ liệu quá dài cho ô Excel)]`;
      }
      return trimmed;
    })
    .filter(Boolean);

  if (safeEntries.length === 0) return '';

  let result = '';
  for (let i = 0; i < safeEntries.length; i += 1) {
    const entry = safeEntries[i]!;
    const candidate = result ? `${result}${PHOTO_DELIMITER}${entry}` : entry;
    if (candidate.length > EXCEL_CELL_MAX_LENGTH - 32) {
      const remaining = safeEntries.length - i;
      const suffix = ` (+${remaining} ảnh)`;
      result = result ? `${result}${suffix}` : `[${safeEntries.length} ảnh đính kèm]`;
      break;
    }
    result = candidate;
  }
  return result;
}

export function parsePhotosFromExcel(raw: unknown): string[] {
  const str = String(raw ?? '').trim();
  if (!str) return [];

  const hasDataUri = /data:(?:image|video)\//i.test(str);
  const parts = hasDataUri ? str.split(/[\n|]+/) : str.split(/[\n|;,]+/);

  return parts
    .map((item) => item.trim())
    .filter(
      (item) =>
        Boolean(item) &&
        !item.startsWith('[') &&
        (/^(https?:\/\/|\/|data:image\/|blob:)/i.test(item) ||
          /\.(png|jpe?g|webp|gif)$/i.test(item))
    );
}

export function buildExcelRows(reports: Report[]) {
  return reports.map((r) => ({
    'Mã hồ sơ': r.id,
    'Loại sự cố': getCategoryLabel(r.category),
    'Trạng thái': STATUS_CONFIGS[r.status]?.officerLabel ?? r.status,
    'Địa chỉ': r.address,
    'Mô tả': r.description ?? '',
    Ảnh: formatPhotosForExcel(r.photos),
    'Bộ phận xử lý': r.department ?? '',
    'Số điện thoại': r.reporterPhone ?? (r.anonymous ? 'Ẩn danh' : ''),
    'Ngày gửi': formatDate(r.createdAt),
    'Hạn xử lý': r.dueAt ? formatDate(r.dueAt) : '',
  }));
}

export function exportReportsToExcel(reports: Report[], dateTag: string): void {
  const rows = buildExcelRows(reports);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 12 }, // Mã hồ sơ
    { wch: 16 }, // Loại sự cố
    { wch: 18 }, // Trạng thái
    { wch: 30 }, // Địa chỉ
    { wch: 36 }, // Mô tả
    { wch: 42 }, // Ảnh
    { wch: 24 }, // Bộ phận xử lý
    { wch: 16 }, // Số điện thoại
    { wch: 14 }, // Ngày gửi
    { wch: 14 }, // Hạn xử lý
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PhanAnh');
  XLSX.writeFile(workbook, `phan-anh-tran-bien-${dateTag}.xlsx`);
}

export interface ImportedExcelResult {
  items: Array<{ report: Report; notification: Notification }>;
  skipped: number;
}

export interface ExcelOnBehalfRows {
  rows: CreateOnBehalfInput[];
  skipped: number;
}

/**
 * Đọc file Excel thành các dòng "tạo hộ" (chưa ghi gì). A01 gửi từng dòng qua
 * ds.officerCreateOnBehalf nên chế độ API ghi vào DB thật, chế độ local ghi vào store.
 */
export async function readOnBehalfRowsFromExcel(file: File): Promise<ExcelOnBehalfRows> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) return { rows: [], skipped: 0 };

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rows: CreateOnBehalfInput[] = [];
  let skipped = 0;
  for (const row of rawRows) {
    const addressRaw = String(
      row['Địa chỉ'] ?? row['dia_chi'] ?? row['address'] ?? row['Address'] ?? ''
    ).trim();
    const phoneRaw = String(
      row['Số điện thoại'] ?? row['sdt'] ?? row['phone'] ?? row['Phone'] ?? ''
    )
      .replace(/\s+/g, '')
      .trim();
    const descRaw = String(
      row['Mô tả'] ?? row['mo_ta'] ?? row['description'] ?? row['Description'] ?? ''
    ).trim();
    const catRaw =
      row['Loại sự cố'] ?? row['loai'] ?? row['category'] ?? row['Category'] ?? 'mat_duong';
    const photos = parsePhotosFromExcel(
      row['Ảnh'] ??
        row['Hình ảnh'] ??
        row['anh'] ??
        row['hinh_anh'] ??
        row['photos'] ??
        row['photo'] ??
        row['image'] ??
        row['Images']
    );

    if (!addressRaw && !descRaw) {
      skipped += 1;
      continue;
    }

    const matchedStreet = STREETS.find((st) =>
      addressRaw.toLowerCase().includes(st.name.toLowerCase())
    );
    rows.push({
      phone: /^0\d{8,10}$/.test(phoneRaw) ? phoneRaw : '0909000000',
      category: parseCategory(catRaw),
      photos: photos.length > 0 ? photos : undefined,
      lat: matchedStreet?.lat ?? WARD_CENTER.lat,
      lng: matchedStreet?.lng ?? WARD_CENTER.lng,
      address: addressRaw || STREETS[0]?.name || 'P. Trấn Biên',
      description: descRaw || undefined,
    });
  }
  return { rows, skipped };
}

/** Bản chạy trên store cục bộ (dùng cho test và chế độ mô phỏng không qua DataSource). */
export async function parseReportsFromExcel(
  file: File,
  baseState: AppState,
  now: string
): Promise<ImportedExcelResult> {
  const { rows, skipped } = await readOnBehalfRowsFromExcel(file);
  const items: Array<{ report: Report; notification: Notification }> = [];
  let workingState = baseState;
  for (const row of rows) {
    const created = createOnBehalf(workingState, row, now);
    items.push(created);
    workingState = { ...workingState, reports: [created.report, ...workingState.reports] };
  }
  return { items, skipped };
}
