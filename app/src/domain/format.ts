/**
 * Định dạng số ngày xử lý: 1 chữ số thập phân, dấu phẩy (spec 7.6, UT-017.1)
 * Ví dụ: 3.2 -> "3,2 ngày"
 */
export function formatDays(days: number): string {
  const formatted = days.toFixed(1).replace('.', ',');
  return `${formatted} ngày`;
}

/**
 * Định dạng phần trăm: 1 chữ số thập phân, dấu phẩy (spec 7.6)
 * Ví dụ: 73.4 -> "73,4%"
 */
export function formatPercent(percent: number): string {
  const formatted = percent.toFixed(1).replace('.', ',');
  return `${formatted}%`;
}

/**
 * Định dạng số thập phân tiếng Việt: 1 chữ số thập phân, dấu phẩy (spec 7.6)
 * Ví dụ: 3.2 -> "3,2"
 */
export function formatDecimal(num: number, decimals: number = 1): string {
  return num.toFixed(decimals).replace('.', ',');
}

/**
 * Định dạng khoảng cách theo mét hoặc km (spec 7.6, UT-017.1)
 * < 1000m: "{n} m"; >= 1000m: "{n,n} km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = (meters / 1000).toFixed(1).replace('.', ',');
  return `${km} km`;
}

/**
 * Định dạng ngày theo múi giờ UTC+7 (spec 7.6, UT-017.2)
 * Trả về dd/MM/yyyy
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return formatter.format(date);
}

/**
 * Định dạng ngày ngắn theo múi giờ UTC+7
 * Trả về dd/MM (ví dụ 25/11)
 */
export function formatDateShort(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  });

  return formatter.format(date);
}

/**
 * Định dạng ngày và giờ theo múi giờ UTC+7 (spec 7.6)
 * Trả về dd/MM/yyyy HH:mm
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(date).replace(',', '');
}
