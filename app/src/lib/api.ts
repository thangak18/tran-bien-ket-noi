import { clearOfficerSession, clearVolunteerSession } from './portalSession';
/**
 * API Client cho Trấn Biên Kết Nối Giai đoạn 2
 * Quản lý xác thực, device ID, header và ánh xạ lỗi sang tiếng Việt
 */

/** true khi frontend chạy với backend thật (VITE_DATA_SOURCE=api). */
export function isApiMode(): boolean {
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATA_SOURCE === 'api';
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: unknown,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const ERROR_TRANSLATIONS: Record<string, string> = {
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_TOKEN: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  ACCOUNT_DISABLED: 'Tài khoản này đã bị tạm khoá. Vui lòng liên hệ quản trị.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  VALIDATION_ERROR: 'Dữ liệu đầu vào không hợp lệ.',
  RATE_LIMITED: 'Đã vượt quá tần suất thao tác cho phép. Vui lòng thử lại sau.',
  ANON_QUOTA_EXCEEDED: 'Đã gửi tối đa 5 phản ánh ẩn danh hôm nay. Vui lòng nhập số điện thoại.',
  CONFLICT: 'Dữ liệu bị trùng lặp hoặc đã tồn tại.',
  VERSION_CONFLICT: 'Hồ sơ đã được cập nhật bởi thao tác khác. Dữ liệu đã được tải lại.',
  TRANSITION_NOT_ALLOWED: 'Không thể chuyển trạng thái hồ sơ theo yêu cầu này.',
  TASK_ALREADY_CLAIMED: 'Nhiệm vụ này đã được tình nguyện viên khác nhận.',
  TASK_ALREADY_DONE: 'Nhiệm vụ này đã được nộp kết quả trước đó.',
  ALREADY_RATED: 'Phản ánh này đã được đánh giá.',
  INVALID_FILE_TYPE: 'Định dạng ảnh không hợp lệ (chỉ chấp nhận JPEG, PNG, WebP).',
  FILE_TOO_LARGE: 'Kích thước ảnh vượt quá dung lượng tối đa cho phép.',
  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.',
  INTERNAL_ERROR: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau ít phút.',
};

/** Sự kiện phát ra sau khi đăng nhập hoặc đăng xuất để store tải lại dữ liệu đúng vai trò. */
export const SESSION_CHANGED_EVENT = 'tb:session-changed';

/** Sự kiện phát ra khi API trả 401 trên một thao tác cần đăng nhập (giao diện chuyển về /dang-nhap). */
export const UNAUTHORIZED_EVENT = 'tb:unauthorized';

/**
 * Sự kiện phát ra khi API người dân trả 401 trên phiên người dân đã hết hạn
 * (giao diện chuyển về /ho-so?login=1&redirect=, spec 13.3a AC-SESSION-3).
 */
export const CITIZEN_LOGIN_REQUIRED_EVENT = 'tb:citizen-login-required';

/** Khoá của phiên nhân viên (cán bộ, TNV, quản trị). */
const STAFF_SESSION_KEYS = [
  'tb_staff_token',
  'tb_token',
  'tbkn_auth_token',
  'tbkn_user_role',
  'tbkn_user_name',
];

/** Khoá của phiên người dân (token OTP và SĐT đã đăng nhập). */
const CITIZEN_SESSION_KEYS = ['tb_citizen_token', 'tbkn_user_phone'];

function removeKeys(keys: string[]) {
  for (const key of keys) localStorage.removeItem(key);
}

/** Xoá phiên nhân viên ở thiết bị này; phiên người dân giữ nguyên (AC-SESSION-1, AC-LOGIN-6). */
export function clearStaffSession() {
  if (typeof window === 'undefined') return;
  removeKeys(STAFF_SESSION_KEYS);
  // Phiên cổng (tên hiển thị của cán bộ/TNV) thuộc phiên nhân viên.
  clearOfficerSession();
  clearVolunteerSession();
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

/** Xoá phiên người dân ở thiết bị này; phiên nhân viên giữ nguyên (AC-SESSION-1). */
export function clearCitizenSession() {
  if (typeof window === 'undefined') return;
  removeKeys(CITIZEN_SESSION_KEYS);
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

/** Xoá toàn bộ phiên đăng nhập (nhân viên và người dân) ở thiết bị này. */
export function clearSession() {
  if (typeof window === 'undefined') return;
  removeKeys(CITIZEN_SESSION_KEYS);
  clearStaffSession();
}

/** true khi thiết bị đang giữ token người dân (đã đăng nhập OTP ở chế độ API). */
export function hasCitizenToken(): boolean {
  return typeof window !== 'undefined' && Boolean(localStorage.getItem('tb_citizen_token'));
}

type ApiScope = 'citizen' | 'staff' | 'other';

/** Đường dẫn API dạng `/citizen/...` (bỏ origin và tiền tố /api, /api/v1). */
function apiPath(endpoint: string): string {
  let path = endpoint;
  if (/^https?:\/\//.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return path;
    }
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path.replace(/^\/api(\/v1)?(?=\/|$)/, '') || '/';
}

/** API người dân dùng token người dân; API cán bộ/TNV/quản trị/tải ảnh dùng token nhân viên (AC-SESSION-4). */
function apiScope(endpoint: string): ApiScope {
  const path = apiPath(endpoint);
  if (/^\/citizen(\/|$)/.test(path)) return 'citizen';
  if (/^\/(officer|volunteer|admin|uploads)(\/|$)/.test(path)) return 'staff';
  return 'other';
}

/** Báo cho store biết phiên đăng nhập vừa thay đổi (sau khi lưu token mới). */
export function notifySessionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

const REPORT_KEYS_STORAGE = 'tb_report_keys';

function readReportKeys(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REPORT_KEYS_STORAGE);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Lưu khoá chủ hồ sơ (ownerToken) để chứng minh quyền sở hữu hồ sơ ẩn danh ở thiết bị này. */
export function saveReportKey(code: string, key: string) {
  if (typeof window === 'undefined' || !key) return;
  localStorage.setItem(REPORT_KEYS_STORAGE, JSON.stringify({ ...readReportKeys(), [code]: key }));
}

/** Header Authorization bằng token người dân (nếu có), kể cả khi thiết bị cũng đang giữ token nhân viên. */
export function citizenAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('tb_citizen_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Header X-Report-Key cho hồ sơ này nếu thiết bị đang giữ khoá chủ hồ sơ. */
export function reportKeyHeaders(code: string): Record<string, string> {
  const key = readReportKeys()[code];
  return key ? { 'X-Report-Key': key } : {};
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device-id';
  let deviceId = localStorage.getItem('tb_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('tb_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Token gửi kèm cho một API. Có `endpoint` thì chọn đúng loại token theo đường dẫn (AC-SESSION-4):
 * API người dân không bao giờ nhận token nhân viên và ngược lại.
 */
export function getAuthToken(endpoint?: string): string | null {
  if (typeof window === 'undefined') return null;
  const citizen = localStorage.getItem('tb_citizen_token');
  const staff = localStorage.getItem('tb_staff_token') || localStorage.getItem('tb_token');
  const scope = endpoint ? apiScope(endpoint) : 'other';
  if (scope === 'citizen') return citizen;
  if (scope === 'staff') return staff;
  // API công khai, AI gợi ý: server không bắt đăng nhập; giữ thứ tự cũ.
  return staff || citizen;
}

export function setCitizenToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tb_citizen_token', token);
    // Store tải lại hồ sơ và thông báo của người dân vừa đăng nhập.
    window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
  }
}

export function setStaffToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tb_staff_token', token);
  }
}

export function clearAuthTokens() {
  clearSession();
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let url: string;
  if (endpoint.startsWith('http')) {
    url = endpoint;
  } else if (endpoint.startsWith('/api/v1')) {
    url = endpoint;
  } else if (endpoint.startsWith('/api/')) {
    url = endpoint.replace('/api/', '/api/v1/');
  } else {
    url = `/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const scope = apiScope(endpoint);
  const token = getAuthToken(endpoint);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // Có gửi token thì 401 nghĩa là phiên đó đã hết hạn; không gửi token thì 401 chỉ là "cần đăng nhập".
  const sentToken = headers.has('Authorization');

  if (!headers.has('X-Device-Id')) {
    headers.set('X-Device-Id', getDeviceId());
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', ERROR_TRANSLATIONS.NETWORK_ERROR!, 0);
  }

  if (!response.ok) {
    let errBody: ApiErrorResponse | null = null;
    try {
      errBody = await response.json();
    } catch {
      // Not JSON
    }

    const code = errBody?.error?.code || `HTTP_${response.status}`;
    const rawMessage = errBody?.error?.message || response.statusText;
    // Với đăng nhập, giữ nguyên thông báo của server ("Email hoặc mật khẩu không chính xác").
    const isLoginCall = endpoint.startsWith('/auth/') || endpoint.startsWith('/citizen/otp');
    const message = isLoginCall
      ? rawMessage || 'Thao tác không thành công.'
      : ERROR_TRANSLATIONS[code] || rawMessage || 'Thao tác không thành công.';

    // 401 trên phiên đã gửi: chỉ xoá phiên của loại API bị từ chối (AC-SESSION-3).
    if (response.status === 401 && !isLoginCall && sentToken && typeof window !== 'undefined') {
      if (scope === 'citizen') {
        clearCitizenSession();
        window.dispatchEvent(new CustomEvent(CITIZEN_LOGIN_REQUIRED_EVENT, { detail: { code } }));
      } else if (scope === 'staff') {
        clearStaffSession();
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { code } }));
      }
    }

    throw new ApiError(
      code,
      message,
      response.status,
      errBody?.error?.details,
      errBody?.error?.requestId
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Tải ảnh trực tiếp qua Signed URL
 */
export async function uploadPhotoWithSign(file: Blob | File, filename?: string): Promise<string> {
  const name = filename || (file instanceof File ? file.name : 'photo.jpg');
  const mimeType = file.type || 'image/jpeg';
  const sizeBytes = file.size;

  if (sizeBytes > 10 * 1024 * 1024) {
    throw new ApiError('FILE_TOO_LARGE', 'Kích thước file vượt quá 10MB', 422);
  }

  // 1. Ký URL
  const signRes = await apiFetch<{ uploadUrl: string; storagePath: string; token: string }>(
    '/uploads/sign',
    {
      method: 'POST',
      body: JSON.stringify({
        filename: name,
        mimeType,
        sizeBytes,
      }),
    }
  );

  // 2. PUT file lên URL ký
  const uploadRes = await fetch(signRes.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new ApiError('UPLOAD_FAILED', 'Tải ảnh lên hệ thống lưu trữ thất bại', uploadRes.status);
  }

  return signRes.storagePath;
}
