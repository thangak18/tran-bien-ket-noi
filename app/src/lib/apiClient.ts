import { Category } from '@/domain/types';

export type ApiRole = 'citizen' | 'officer' | 'volunteer' | 'admin';

const AUTH_TOKEN_KEY = 'tbkn:auth-token';

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return configured ? configured.replace(/\/+$/, '') : '';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return null;

  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface VerifyOtpResponse {
  ok: boolean;
  token: string;
  role: ApiRole;
  phone: string;
}

export async function requestOtpApi(
  phone: string,
  role: ApiRole
): Promise<{ mode: 'live' | 'dev-fallback' } | null> {
  return apiFetch<{ mode: 'live' | 'dev-fallback' }>('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone, role }),
  });
}

export async function verifyOtpApi(params: {
  phone: string;
  otp: string;
  name?: string;
  role: ApiRole;
  unit?: string;
}): Promise<VerifyOtpResponse | null> {
  const res = await apiFetch<VerifyOtpResponse>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (res?.token) {
    setAuthToken(res.token);
  }
  return res;
}

export interface TurnstileVerifyResponse {
  success: boolean;
  mode: 'turnstile' | 'dev-fallback';
  secretCodeHash?: string;
  remainingQuota?: number;
  error?: string;
  retryAfterSeconds?: number;
}

export async function verifyTurnstileApi(params: {
  token: string;
  reportId?: string;
  secretCode?: string;
}): Promise<TurnstileVerifyResponse> {
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/turnstile/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as Partial<TurnstileVerifyResponse>;
      return {
        success: res.ok && Boolean(data.success),
        mode: data.mode ?? 'turnstile',
        secretCodeHash: data.secretCodeHash,
        remainingQuota: data.remainingQuota,
        error: data.error,
        retryAfterSeconds: data.retryAfterSeconds,
      };
    } catch {
      // Mất kết nối Worker -> fallback kiểm tra token cục bộ
    }
  }
  return {
    success: Boolean(params.token && params.token.length >= 6),
    mode: 'dev-fallback',
  };
}

export interface AiClassifyApiResponse {
  category: Category;
  confidence: number;
  reason: string;
  isValidIncident: boolean;
  source: 'gemini' | 'fallback';
}

export async function classifyPhotoApi(
  imageDataUrl: string,
  hint?: string
): Promise<AiClassifyApiResponse | null> {
  return apiFetch<AiClassifyApiResponse>('/api/ai/classify', {
    method: 'POST',
    body: JSON.stringify({ imageDataUrl, hint }),
  });
}

export async function subscribeWebPushApi(subscription: {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  role?: ApiRole;
  phone?: string;
}): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

export async function fetchVapidPublicKeyApi(): Promise<{
  configured: boolean;
  publicKey: string | null;
} | null> {
  return apiFetch<{ configured: boolean; publicKey: string | null }>('/api/push/vapid-public-key', {
    method: 'GET',
  });
}

export async function dispatchNotificationApi(payload: {
  channel: 'web_push' | 'zalo_zns' | 'sms';
  phone?: string;
  reportId: string;
  title: string;
  body: string;
}): Promise<{ delivered: boolean; mode: 'live' | 'dry-run'; detail: string } | null> {
  return apiFetch<{ delivered: boolean; mode: 'live' | 'dry-run'; detail: string }>(
    '/api/notifications/dispatch',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function recordAuditLogApi(payload: {
  action: string;
  reportId?: string;
  detail?: string;
}): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>('/api/audit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface RemoteReportItem {
  id: string;
  category: Category;
  title?: string;
  description?: string;
  photos: string[];
  resultPhotos?: string[];
  lat: number;
  lng: number;
  address: string;
  locationNote?: string;
  status: string;
  department: string | null;
  createdAt: string;
  dueAt: string | null;
  completedAt: string | null;
  anonymous: boolean;
  timeline: Array<{ at: string; status: string; actor: string; note?: string }>;
}

export async function fetchReportsApi(
  limit = 100
): Promise<{ configured: boolean; items: RemoteReportItem[] } | null> {
  return apiFetch<{ configured: boolean; items: RemoteReportItem[] }>(
    `/api/reports?limit=${limit}`,
    { method: 'GET' }
  );
}

export async function updateReportApi(
  id: string,
  patch: {
    category?: Category;
    title?: string;
    description?: string;
    photos?: string[];
    lat?: number;
    lng?: number;
    address?: string;
    locationNote?: string;
    anonymous?: boolean;
    createdAt?: string;
    status?: string;
    department?: string | null;
    dueAt?: string | null;
    resultPhotos?: string[];
    timeline?: unknown[];
  }
): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>(`/api/reports/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function createTaskApi(payload: {
  reportId: string;
  assigneePhone?: string;
  assigneeName?: string;
  taskType: 'xac_minh' | 'nghiem_thu';
}): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createReportApi(payload: {
  id: string;
  category: Category;
  title?: string;
  description?: string;
  photos?: string[];
  lat: number;
  lng: number;
  address: string;
  locationNote?: string;
  anonymous?: boolean;
  phone?: string;
}): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadImageApi(
  imageDataUrl: string,
  prefix = 'incidents'
): Promise<{ ok: boolean; key: string; url: string; storage: 'r2' | 'inline-fallback' } | null> {
  return apiFetch<{ ok: boolean; key: string; url: string; storage: 'r2' | 'inline-fallback' }>(
    '/api/uploads',
    {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl, prefix }),
    }
  );
}

export interface AdminUserItem {
  id: string;
  phone: string;
  name: string;
  role: ApiRole;
  unit: string | null;
  area: string | null;
  active: number;
  created_at: string;
}

export interface SlaConfigItem {
  category: Category;
  default_days: number;
  department: string;
  updated_at: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: ApiRole;
  action: string;
  reportId?: string;
  detail?: string;
}

export async function fetchAdminUsersApi(
  role?: ApiRole
): Promise<{ configured: boolean; items: AdminUserItem[] } | null> {
  const qs = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiFetch<{ configured: boolean; items: AdminUserItem[] }>(`/api/admin/users${qs}`, {
    method: 'GET',
  });
}

export async function createAdminUserApi(payload: {
  phone: string;
  name: string;
  role: ApiRole;
  unit?: string;
  area?: string;
}): Promise<{ ok: boolean; user?: AdminUserItem } | null> {
  return apiFetch<{ ok: boolean; user?: AdminUserItem }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function toggleAdminUserApi(
  id: string,
  active: boolean
): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export async function fetchSlaConfigApi(): Promise<{
  configured: boolean;
  items: SlaConfigItem[];
} | null> {
  return apiFetch<{ configured: boolean; items: SlaConfigItem[] }>('/api/admin/sla-config', {
    method: 'GET',
  });
}

export async function updateSlaConfigApi(payload: {
  category: Category;
  defaultDays: number;
  department?: string;
}): Promise<{ ok: boolean } | null> {
  return apiFetch<{ ok: boolean }>('/api/admin/sla-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchAuditLogsApi(limit = 50): Promise<{ items: AuditLogItem[] } | null> {
  return apiFetch<{ items: AuditLogItem[] }>(`/api/audit?limit=${limit}`, { method: 'GET' });
}
