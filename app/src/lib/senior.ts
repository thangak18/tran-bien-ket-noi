// BONUS B3 – HOÃN: chưa dùng trong UI lõi
/**
 * Áp dụng chế độ chữ lớn (senior mode) vào phần tử html
 */
export function applySeniorMode(enabled: boolean): void {
  if (typeof document !== 'undefined') {
    if (enabled) {
      document.documentElement.classList.add('senior');
    } else {
      document.documentElement.classList.remove('senior');
    }
  }
}
