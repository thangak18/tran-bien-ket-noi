/**
 * Định dạng số ngày xử lý: 1 chữ số thập phân, dấu phẩy (spec 7.6, UT-017.1)
 * Ví dụ: 3.2 -> "3,2 ngày"
 */
export function formatDays(days: number): string {
  const formatted = days.toFixed(1).replace('.', ',');
  return `${formatted} ngày`;
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
