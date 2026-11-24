/**
 * API Client cho Trấn Biên Kết Nối Giai đoạn 2
 * Quản lý xác thực, device ID, header và ánh xạ lỗi sang tiếng Việt
 */

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
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  VALIDATION_ERROR: 'Dữ liệu đầu vào không hợp lệ.',
  RATE_LIMITED: 'Đã vượt quá tần suất thao tác cho phép. Vui lòng thử lại sau.',
  ANON_QUOTA_EXCEEDED: 'Đã gửi tối đa 5 phản ánh ẩn danh hôm nay. Vui lòng nhập số điện thoại.',
  CONFLICT: 'Dữ liệu bị trùng lặp hoặc đã tồn tại.',
  VERSION_CONFLICT: 'Hồ sơ đã được cán bộ khác cập nhật trước đó. Vui lòng tải lại trang.',
  TRANSITION_NOT_ALLOWED: 'Không thể chuyển trạng thái hồ sơ theo yêu cầu này.',
  INVALID_FILE_TYPE: 'Định dạng ảnh không hợp lệ (chỉ chấp nhận JPEG, PNG, WebP).',
  FILE_TOO_LARGE: 'Kích thước ảnh vượt quá dung lượng tối đa cho phép.',
  INTERNAL_ERROR: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau ít phút.',
};

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device-id';
  let deviceId = localStorage.getItem('tb_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('tb_device_id', deviceId);
  }
  return deviceId;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Ưu tiên token nhân viên, sau đó đến token người dân
  return (
    localStorage.getItem('tb_staff_token') ||
    localStorage.getItem('tb_citizen_token') ||
    localStorage.getItem('tb_token')
  );
}

export function setCitizenToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tb_citizen_token', token);
  }
}

export function setStaffToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tb_staff_token', token);
  }
}

export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tb_citizen_token');
    localStorage.removeItem('tb_staff_token');
    localStorage.removeItem('tb_token');
  }
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

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('X-Device-Id')) {
    headers.set('X-Device-Id', getDeviceId());
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errBody: ApiErrorResponse | null = null;
    try {
      errBody = await response.json();
    } catch {
      // Not JSON
    }

    const code = errBody?.error?.code || `HTTP_${response.status}`;
    const rawMessage = errBody?.error?.message || response.statusText;
    const message = ERROR_TRANSLATIONS[code] || rawMessage || 'Thao tác không thành công.';

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
