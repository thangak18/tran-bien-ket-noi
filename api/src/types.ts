export type UserRole = 'citizen' | 'officer' | 'volunteer' | 'admin';

export type IncidentCategory = 'den_duong' | 'ngap_nuoc' | 'rac_thai' | 'mat_duong';

export interface D1PreparedStatementLike {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<{ success: boolean }>;
}

export interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
}

export interface R2ObjectBodyLike {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

export interface R2BucketLike {
  put: (
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBodyLike | null>;
}

export interface Env {
  DB?: D1DatabaseLike;
  MEDIA?: R2BucketLike;
  ALLOWED_ORIGIN?: string;
  JWT_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  GEMINI_API_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  ZALO_OA_ACCESS_TOKEN?: string;
  ZALO_ZNS_TEMPLATE_ID?: string;
  SMS_WEBHOOK_URL?: string;
  SMS_API_KEY?: string;
}

export interface SessionClaims {
  sub: string;
  role: UserRole;
  name: string;
  phone: string;
  unit?: string;
  iat: number;
  exp: number;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  role?: UserRole;
  phone?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  reportId?: string;
  detail?: string;
}

export interface AiClassifyResult {
  category: IncidentCategory;
  confidence: number;
  reason: string;
  isValidIncident: boolean;
  source: 'gemini' | 'fallback';
}
