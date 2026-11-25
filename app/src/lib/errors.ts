import { ApiError } from './api';

export type ActionErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'notFound'
  | 'validation'
  | 'unknown';

export interface DescribedError {
  kind: ActionErrorKind;
  message: string;
}

/**
 * Chuyển lỗi của một thao tác (API hoặc logic offline) thành thông báo tiếng Việt cho người dùng.
 * - 401: phiên hết hạn (giao diện sẽ chuyển về trang đăng nhập)
 * - 403: không đủ quyền
 * - 409: dữ liệu đã thay đổi, cần tải lại
 */
export function describeActionError(err: unknown): DescribedError {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK_ERROR' || err.status === 0) {
      return { kind: 'network', message: err.message };
    }
    if (err.status === 401 && err.code === 'CITIZEN_LOGIN_REQUIRED') {
      // Chưa đăng nhập SĐT (spec v3.0): giữ lời nhắc của server, không gọi là "phiên hết hạn".
      return { kind: 'unauthorized', message: err.message };
    }
    if (err.status === 401) {
      return {
        kind: 'unauthorized',
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      };
    }
    if (err.status === 403) {
      return {
        kind: 'forbidden',
        message:
          err.code === 'ACCOUNT_DISABLED'
            ? err.message
            : 'Bạn không có quyền thực hiện thao tác này.',
      };
    }
    if (err.status === 409) {
      return {
        kind: 'conflict',
        message: `${err.message} Dữ liệu đã được tải lại, vui lòng kiểm tra rồi thử lại.`,
      };
    }
    if (err.status === 404) {
      return { kind: 'notFound', message: err.message };
    }
    if (err.status === 400 || err.status === 422) {
      return { kind: 'validation', message: err.message };
    }
    return { kind: 'unknown', message: err.message };
  }
  if (err instanceof Error && err.message) {
    return { kind: 'unknown', message: err.message };
  }
  return { kind: 'unknown', message: 'Có lỗi xảy ra. Vui lòng thử lại.' };
}
