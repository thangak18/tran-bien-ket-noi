import { VOLUNTEERS } from '../domain/constants';

/** Khoá localStorage ghi tên TNV đang đóng vai ở chế độ mô phỏng (local). */
export const TNV_KEY = 'tbkn:tnv';

/**
 * Tên TNV hiện tại.
 * - Chế độ API: tài khoản đã đăng nhập (tbkn_user_name do /auth/login trả về).
 * - Chế độ local: TNV mẫu được chọn ở màn V01.
 */
export function getCurrentVolunteer(): string {
  try {
    if (import.meta.env.VITE_DATA_SOURCE === 'api') {
      return localStorage.getItem('tbkn_user_name') || '';
    }
    return localStorage.getItem(TNV_KEY) || VOLUNTEERS[0];
  } catch {
    return import.meta.env.VITE_DATA_SOURCE === 'api' ? '' : VOLUNTEERS[0];
  }
}

export function setCurrentVolunteer(name: string): void {
  try {
    localStorage.setItem(TNV_KEY, name);
  } catch {
    /* bỏ qua: localStorage không khả dụng */
  }
}
