import { Env, SessionClaims, UserRole } from './types';

const DEV_FALLBACK_JWT_SECRET = 'tbkn-dev-only-jwt-secret-change-in-production-32ch';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSessionToken(
  payload: Omit<SessionClaims, 'iat' | 'exp'>,
  env: Env,
  ttlSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const headerPart = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payloadPart = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const data = `${headerPart}.${payloadPart}`;
  const key = await importHmacKey(env.JWT_SECRET || DEV_FALLBACK_JWT_SECRET);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return `${data}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string, env: Env): Promise<SessionClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, sigPart] = parts as [string, string, string];
  try {
    const key = await importHmacKey(env.JWT_SECRET || DEV_FALLBACK_JWT_SECRET);
    const sigBytes = fromBase64Url(sigPart);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      encoder.encode(`${headerPart}.${payloadPart}`)
    );
    if (!valid) return null;
    const claims = JSON.parse(decoder.decode(fromBase64Url(payloadPart))) as SessionClaims;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export async function hashSecretCode(secretCode: string, reportId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${reportId}:${secretCode}`));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)tbkn_session=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

export async function requireRole(
  request: Request,
  env: Env,
  allowedRoles: readonly UserRole[]
): Promise<{ ok: true; claims: SessionClaims } | { ok: false; status: number; error: string }> {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: 'Chưa đăng nhập phiên làm việc.' };
  }
  const claims = await verifySessionToken(token, env);
  if (!claims) {
    return { ok: false, status: 401, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' };
  }
  if (!allowedRoles.includes(claims.role)) {
    return { ok: false, status: 403, error: 'Tài khoản không có quyền thực hiện thao tác này.' };
  }
  return { ok: true, claims };
}

// Sliding-window rate limiter (in-memory per isolate)
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
  nowMs = Date.now()
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const cutoff = nowMs - windowMs;
  const entries = (rateBuckets.get(bucketKey) ?? []).filter((ts) => ts > cutoff);
  if (entries.length >= limit) {
    const oldest = entries[0] ?? nowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    rateBuckets.set(bucketKey, entries);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  entries.push(nowMs);
  rateBuckets.set(bucketKey, entries);
  return { allowed: true, remaining: Math.max(0, limit - entries.length), retryAfterSeconds: 0 };
}

export function resetRateLimitsForTest(): void {
  rateBuckets.clear();
}

export interface TurnstileVerificationResult {
  success: boolean;
  mode: 'turnstile' | 'dev-fallback';
  errorCodes?: string[];
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string | null,
  env: Env
): Promise<TurnstileVerificationResult> {
  if (!token || token.trim().length === 0) {
    return {
      success: false,
      mode: env.TURNSTILE_SECRET_KEY ? 'turnstile' : 'dev-fallback',
      errorCodes: ['missing-input-response'],
    };
  }

  const isLocalDevToken =
    token.startsWith('dev-turnstile-') &&
    (!remoteIp || remoteIp === 'local' || remoteIp === '127.0.0.1' || remoteIp === '::1');

  if (!env.TURNSTILE_SECRET_KEY || isLocalDevToken) {
    return {
      success: token.startsWith('dev-turnstile-') || token.length >= 10,
      mode: 'dev-fallback',
    };
  }

  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);
  if (remoteIp) formData.append('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    return { success: false, mode: 'turnstile', errorCodes: [`http-${response.status}`] };
  }

  const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
  return {
    success: Boolean(data.success),
    mode: 'turnstile',
    errorCodes: data['error-codes'],
  };
}
