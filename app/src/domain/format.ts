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

/**
 * Định dạng thời gian tương đối so với now (nhận now làm tham số, không gọi Date.now())
 * > 30 ngày hiển thị "{n} tháng trước" (ví dụ: 31-59 ngày -> "1 tháng trước")
 */
export function formatRelativeTime(isoString: string, now: string): string {
  const targetMs = new Date(isoString).getTime();
  const nowMs = new Date(now).getTime();
  if (isNaN(targetMs) || isNaN(nowMs)) return '';

  const diffMs = Math.max(0, nowMs - targetMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const monthMs = 30 * dayMs;

  if (diffMs < minuteMs) return 'Vừa xong';
  if (diffMs < hourMs) return `${Math.floor(diffMs / minuteMs)} phút trước`;
  if (diffMs < dayMs) return `${Math.floor(diffMs / hourMs)} giờ trước`;
  if (diffMs <= monthMs) return `${Math.floor(diffMs / dayMs)} ngày trước`;
  const months = Math.max(1, Math.floor(diffMs / monthMs));
  return `${months} tháng trước`;
}

/** SĐT 10 số → nhóm "0909 000 068" (spec v3.0 AC-A01-10). Chuỗi khác giữ nguyên. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}
