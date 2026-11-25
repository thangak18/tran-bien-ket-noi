import { classifyIncidentPhoto } from './aiVision';
import {
  CreateReportInput,
  insertReport,
  listPublicReports,
  updateReportStatus,
  uploadImageToR2,
} from './reportsDb';
import {
  createUser,
  createVolunteerTask,
  listSlaConfigs,
  listUsers,
  listVolunteerTasks,
  toggleUserActive,
  updateSlaConfig,
} from './rolesDb';
import { Env, IncidentCategory, PushSubscriptionPayload, UserRole } from './types';
import {
  appendAuditLog,
  dispatchNotification,
  DispatchRequest,
  evaluateSlaAlerts,
  getPushSubscriptionCount,
  listAuditLogs,
  removePushSubscription,
  savePushSubscription,
  SlaReportInput,
} from './notifications';
import {
  checkRateLimit,
  extractBearerToken,
  hashSecretCode,
  requireRole,
  signSessionToken,
  verifySessionToken,
  verifyTurnstileToken,
} from './security';

function corsHeaders(env: Env, request?: Request): Record<string, string> {
  const origin = request?.headers.get('Origin') ?? '';
  const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allowOrigin = isLocalDevOrigin ? origin : env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

function json(
  data: unknown,
  env: Env,
  status = 200,
  extraHeaders?: Record<string, string>,
  request?: Request
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(env, request),
      ...extraHeaders,
    },
  });
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

const DEMO_ADMIN_PHONES = new Set(['02513820000']);
const DEMO_OFFICER_PHONES = new Set(['02513820001', '02513820002']);
const DEMO_VOLUNTEER_PHONES = new Set(['0908100001', '0908100002', '0908100003']);

function inferRole(requestedRole: UserRole | undefined, cleanPhone: string): UserRole {
  if (requestedRole === 'admin' || DEMO_ADMIN_PHONES.has(cleanPhone)) return 'admin';
  if (requestedRole === 'officer' && DEMO_OFFICER_PHONES.has(cleanPhone)) return 'officer';
  if (requestedRole === 'volunteer' && DEMO_VOLUNTEER_PHONES.has(cleanPhone)) return 'volunteer';
  if (requestedRole === 'officer' || requestedRole === 'volunteer') return requestedRole;
  return 'citizen';
}

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env, request) });
  }

  const url = new URL(request.url);
  const { pathname } = url;
  const clientIp =
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'local';

    if (pathname === '/api/health' && request.method === 'GET') {
      return json(
        {
          ok: true,
          service: 'tran-bien-ket-noi-api',
          features: {
            databaseD1: Boolean(env.DB),
            mediaStorageR2: Boolean(env.MEDIA),
            turnstile: Boolean(env.TURNSTILE_SECRET_KEY),
            geminiVision: Boolean(env.GEMINI_API_KEY),
            webPush: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
            zaloZns: Boolean(env.ZALO_OA_ACCESS_TOKEN),
            sms: Boolean(env.SMS_WEBHOOK_URL),
          },
          pushSubscribers: getPushSubscriptionCount(),
        },
        env
      );
    }

    // === PHẦN 3: AUTH, RBAC & ANTI-SPAM ===
    if (pathname === '/api/auth/otp/request' && request.method === 'POST') {
      const rate = checkRateLimit(`otp:${clientIp}`, 5, 5 * 60 * 1000);
      if (!rate.allowed) {
        return json(
          { error: 'Bạn gửi yêu cầu OTP quá nhanh. Vui lòng thử lại sau.', retryAfterSeconds: rate.retryAfterSeconds },
          env,
          429
        );
      }

      const body = await readJson<{ phone?: string; role?: UserRole }>(request);
      const cleanPhone = (body?.phone ?? '').replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 11) {
        return json({ error: 'Số điện thoại không hợp lệ (9–11 chữ số).' }, env, 400);
      }

      const hasRealSms = Boolean(env.SMS_WEBHOOK_URL || env.ZALO_OA_ACCESS_TOKEN);
      return json(
        {
          ok: true,
          mode: hasRealSms ? 'live' : 'dev-fallback',
          expiresInSeconds: 300,
          message: hasRealSms ? 'Mã OTP đã được gửi tới số điện thoại.' : 'Chế độ thử nghiệm: dùng mã OTP 123456.',
        },
        env
      );
    }

    if (pathname === '/api/auth/otp/verify' && request.method === 'POST') {
      const body = await readJson<{
        phone?: string;
        otp?: string;
        name?: string;
        role?: UserRole;
        unit?: string;
      }>(request);

      const cleanPhone = (body?.phone ?? '').replace(/\D/g, '');
      const cleanOtp = (body?.otp ?? '').replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 11 || cleanOtp.length !== 6) {
        return json({ error: 'Thiếu số điện thoại hoặc mã OTP 6 chữ số.' }, env, 400);
      }

      const role = inferRole(body?.role, cleanPhone);
      const token = await signSessionToken(
        {
          sub: `${role}:${cleanPhone}`,
          role,
          name: body?.name?.trim() || (role === 'officer' ? 'Cán bộ phường' : role === 'volunteer' ? 'Tình nguyện viên' : 'Người dân'),
          phone: cleanPhone,
          unit: body?.unit,
        },
        env
      );

      appendAuditLog({
        actor: body?.name?.trim() || cleanPhone,
        role,
        action: 'AUTH_LOGIN',
        detail: `Đăng nhập cổng ${role}`,
      });

      return json({ ok: true, token, role, phone: cleanPhone }, env);
    }

    if (pathname === '/api/auth/me' && request.method === 'GET') {
      const token = extractBearerToken(request);
      if (!token) return json({ authenticated: false }, env, 401);
      const claims = await verifySessionToken(token, env);
      if (!claims) return json({ authenticated: false }, env, 401);
      return json({ authenticated: true, user: claims }, env);
    }

    if (pathname === '/api/turnstile/verify' && request.method === 'POST') {
      const rate = checkRateLimit(`submit:${clientIp}`, 10, 60 * 60 * 1000);
      if (!rate.allowed) {
        return json(
          { success: false, error: 'Quá giới hạn gửi trong giờ. Vui lòng thử lại sau.', retryAfterSeconds: rate.retryAfterSeconds },
          env,
          429
        );
      }

      const body = await readJson<{ token?: string; reportId?: string; secretCode?: string }>(request);
      const result = await verifyTurnstileToken(body?.token ?? '', clientIp, env);
      if (!result.success) {
        return json({ ...result, success: false, error: 'Xác minh chống spam không thành công.' }, env, 403);
      }

      const secretCodeHash =
        body?.reportId && body?.secretCode
          ? await hashSecretCode(body.secretCode, body.reportId)
          : undefined;

      return json({ ...result, remainingQuota: rate.remaining, secretCodeHash }, env);
    }

    // === PHẦN 4: WEB PUSH, ZALO/SMS, SLA & AUDIT LOG ===
    if (pathname === '/api/push/vapid-public-key' && request.method === 'GET') {
      return json(
        {
          configured: Boolean(env.VAPID_PUBLIC_KEY),
          publicKey: env.VAPID_PUBLIC_KEY || null,
        },
        env
      );
    }

    if (pathname === '/api/push/subscribe' && request.method === 'POST') {
      const body = await readJson<PushSubscriptionPayload>(request);
      if (!body?.endpoint) {
        return json({ error: 'Thiếu endpoint đăng ký Web Push.' }, env, 400);
      }
      const total = savePushSubscription(body);
      return json({ ok: true, subscribers: total }, env);
    }

    if (pathname === '/api/push/unsubscribe' && request.method === 'POST') {
      const body = await readJson<{ endpoint?: string }>(request);
      if (!body?.endpoint) return json({ error: 'Thiếu endpoint.' }, env, 400);
      removePushSubscription(body.endpoint);
      return json({ ok: true }, env);
    }

    if (pathname === '/api/notifications/dispatch' && request.method === 'POST') {
      const auth = await requireRole(request, env, ['officer', 'volunteer']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);

      const body = await readJson<DispatchRequest>(request);
      if (!body?.channel || !body.reportId || !body.body) {
        return json({ error: 'Thiếu thông tin thông báo cần gửi.' }, env, 400);
      }
      const result = await dispatchNotification(body, env);
      appendAuditLog({
        actor: auth.claims.name,
        role: auth.claims.role,
        action: `NOTIFY_${body.channel.toUpperCase()}`,
        reportId: body.reportId,
        detail: `${result.mode}: ${result.detail}`,
      });
      return json(result, env);
    }

    if (pathname === '/api/sla/check' && request.method === 'POST') {
      const body = await readJson<{ reports?: SlaReportInput[]; now?: string }>(request);
      const evaluation = evaluateSlaAlerts(body?.reports ?? [], body?.now);
      return json(evaluation, env);
    }

    if (pathname === '/api/audit' && request.method === 'GET') {
      const auth = await requireRole(request, env, ['officer', 'admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const limit = Number(url.searchParams.get('limit') ?? '50');
      return json({ items: listAuditLogs(Number.isFinite(limit) ? limit : 50) }, env);
    }

    // === CỔNG QUẢN TRỊ (ADMIN) & NHIỆM VỤ 4 VAI TRÒ ===
    if (pathname === '/api/admin/users' && request.method === 'GET') {
      const auth = await requireRole(request, env, ['admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const roleFilter = (url.searchParams.get('role') || undefined) as UserRole | undefined;
      const items = await listUsers(env, roleFilter);
      return json({ configured: items !== null, items: items ?? [] }, env);
    }

    if (pathname === '/api/admin/users' && request.method === 'POST') {
      const auth = await requireRole(request, env, ['admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const body = await readJson<{
        phone?: string;
        name?: string;
        role?: UserRole;
        unit?: string;
        area?: string;
      }>(request);
      const cleanPhone = (body?.phone ?? '').replace(/\D/g, '');
      if (cleanPhone.length < 9 || !body?.name?.trim() || !body?.role) {
        return json({ error: 'Thiếu SĐT, họ tên hoặc vai trò hợp lệ.' }, env, 400);
      }
      const created = await createUser(env, {
        phone: cleanPhone,
        name: body.name.trim(),
        role: body.role,
        unit: body.unit?.trim(),
        area: body.area?.trim(),
      });
      if (!created) return json({ error: 'Chưa gắn Database D1.' }, env, 503);
      appendAuditLog({
        actor: auth.claims.name,
        role: 'admin',
        action: 'ADMIN_CREATE_USER',
        detail: `Tạo tài khoản ${created.role}: ${created.name}`,
      });
      return json({ ok: true, user: created }, env, 201);
    }

    if (pathname.startsWith('/api/admin/users/') && request.method === 'PATCH') {
      const auth = await requireRole(request, env, ['admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const userId = decodeURIComponent(pathname.slice('/api/admin/users/'.length));
      const body = await readJson<{ active?: boolean }>(request);
      if (typeof body?.active !== 'boolean') {
        return json({ error: 'Thiếu trạng thái active.' }, env, 400);
      }
      const ok = await toggleUserActive(env, userId, body.active);
      if (!ok) return json({ error: 'Chưa gắn Database D1.' }, env, 503);
      appendAuditLog({
        actor: auth.claims.name,
        role: 'admin',
        action: body.active ? 'ADMIN_ENABLE_USER' : 'ADMIN_DISABLE_USER',
        detail: `Cập nhật tài khoản ${userId}`,
      });
      return json({ ok: true, id: userId, active: body.active }, env);
    }

    if (pathname === '/api/admin/sla-config' && request.method === 'GET') {
      const items = await listSlaConfigs(env);
      return json({ configured: items !== null, items: items ?? [] }, env);
    }

    if (pathname === '/api/admin/sla-config' && request.method === 'PATCH') {
      const auth = await requireRole(request, env, ['admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const body = await readJson<{
        category?: IncidentCategory;
        defaultDays?: number;
        department?: string;
      }>(request);
      if (!body?.category || typeof body.defaultDays !== 'number' || body.defaultDays < 1 || body.defaultDays > 30) {
        return json({ error: 'Loại sự cố hoặc số ngày SLA (1–30) không hợp lệ.' }, env, 400);
      }
      const ok = await updateSlaConfig(env, body.category, Math.round(body.defaultDays), body.department);
      if (!ok) return json({ error: 'Chưa gắn Database D1.' }, env, 503);
      appendAuditLog({
        actor: auth.claims.name,
        role: 'admin',
        action: 'ADMIN_UPDATE_SLA',
        detail: `SLA ${body.category} = ${Math.round(body.defaultDays)} ngày`,
      });
      return json({ ok: true }, env);
    }

    if (pathname === '/api/tasks' && request.method === 'GET') {
      const auth = await requireRole(request, env, ['officer', 'volunteer', 'admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const items = await listVolunteerTasks(env);
      return json({ configured: items !== null, items: items ?? [] }, env);
    }

    if (pathname === '/api/tasks' && request.method === 'POST') {
      const auth = await requireRole(request, env, ['officer', 'admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const body = await readJson<{
        reportId?: string;
        assigneePhone?: string;
        assigneeName?: string;
        taskType?: 'xac_minh' | 'nghiem_thu';
      }>(request);
      if (!body?.reportId || !body?.taskType) {
        return json({ error: 'Thiếu reportId hoặc taskType.' }, env, 400);
      }
      const created = await createVolunteerTask(env, {
        reportId: body.reportId,
        assigneePhone: body.assigneePhone,
        assigneeName: body.assigneeName,
        taskType: body.taskType,
      });
      if (!created) return json({ error: 'Chưa gắn Database D1.' }, env, 503);
      return json({ ok: true, task: created }, env, 201);
    }

    if (pathname === '/api/audit' && request.method === 'POST') {
      const auth = await requireRole(request, env, ['officer', 'volunteer']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const body = await readJson<{ action?: string; reportId?: string; detail?: string }>(request);
      if (!body?.action) return json({ error: 'Thiếu tên hành động audit.' }, env, 400);
      const entry = appendAuditLog({
        actor: auth.claims.name,
        role: auth.claims.role,
        action: body.action,
        reportId: body.reportId,
        detail: body.detail,
      });
      return json({ ok: true, entry }, env, 201);
    }

    // === PHẦN 1 & 2: DỮ LIỆU D1 & ẢNH R2 ===
    if (pathname === '/api/reports' && request.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const items = await listPublicReports(env, Number.isFinite(limit) ? limit : 100);
      if (!items) {
        return json({ configured: false, items: [], message: 'Chưa gắn binding DB (D1).' }, env);
      }
      return json({ configured: true, items }, env);
    }

    if (pathname === '/api/reports' && request.method === 'POST') {
      const body = await readJson<CreateReportInput>(request);
      if (!body?.category || typeof body.lat !== 'number' || typeof body.lng !== 'number' || !body.address) {
        return json({ error: 'Thiếu trường bắt buộc của phản ánh.' }, env, 400);
      }
      const created = await insertReport(env, body);
      if (!created) {
        return json({ ok: false, configured: false, message: 'Chưa gắn binding DB (D1).' }, env, 503);
      }
      return json({ ok: true, report: created }, env, 201);
    }

    if (pathname.startsWith('/api/reports/') && request.method === 'PATCH') {
      const auth = await requireRole(request, env, ['officer', 'volunteer', 'admin']);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const reportId = decodeURIComponent(pathname.slice('/api/reports/'.length));
      const body = await readJson<{
        category?: IncidentCategory;
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
      }>(request);
      const updated = await updateReportStatus(env, reportId, body ?? {});
      if (!updated) {
        return json({ ok: false, configured: false, message: 'Chưa gắn binding DB (D1).' }, env, 503);
      }
      appendAuditLog({
        actor: auth.claims.name,
        role: auth.claims.role,
        action: 'UPDATE_REPORT',
        reportId,
        detail: body?.status ? `Đổi trạng thái → ${body.status}` : 'Cập nhật hồ sơ',
      });
      return json({ ok: true, id: reportId }, env);
    }

    if (pathname === '/api/uploads' && request.method === 'POST') {
      const body = await readJson<{ imageDataUrl?: string; prefix?: string }>(request);
      if (!body?.imageDataUrl) {
        return json({ error: 'Thiếu dữ liệu ảnh (imageDataUrl).' }, env, 400);
      }
      const uploaded = await uploadImageToR2(env, body.imageDataUrl, body.prefix || 'incidents');
      if (!uploaded) {
        return json({ error: 'Định dạng ảnh không hợp lệ.' }, env, 400);
      }
      return json({ ok: true, ...uploaded }, env, 201);
    }

    if (pathname.startsWith('/api/uploads/') && request.method === 'GET') {
      if (!env.MEDIA) {
        return json({ error: 'Chưa cấu hình kho ảnh R2.' }, env, 404);
      }
      const key = decodeURIComponent(pathname.slice('/api/uploads/'.length));
      const obj = await env.MEDIA.get(key);
      if (!obj) {
        return json({ error: 'Không tìm thấy ảnh.' }, env, 404);
      }
      return new Response(obj.body, {
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          ...corsHeaders(env),
        },
      });
    }

    // === PHẦN 5: AI VISION PROXY (GEMINI) ===
    if (pathname === '/api/ai/classify' && request.method === 'POST') {
      const rate = checkRateLimit(`ai:${clientIp}`, 20, 10 * 60 * 1000);
      if (!rate.allowed) {
        return json({ error: 'Vượt giới hạn gọi AI tạm thời.', retryAfterSeconds: rate.retryAfterSeconds }, env, 429);
      }
      const body = await readJson<{ imageDataUrl?: string; hint?: string }>(request);
      if (!body?.imageDataUrl) {
        return json({ error: 'Thiếu dữ liệu ảnh (imageDataUrl).' }, env, 400);
      }
      const result = await classifyIncidentPhoto(body.imageDataUrl, body.hint, env);
      return json(result, env, 200, undefined, request);
    }

    return json({ error: 'Không tìm thấy endpoint API.' }, env, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await handleApiRequest(request, env);
    const mergedHeaders = new Headers(response.headers);
    const dynamicCors = corsHeaders(env, request);
    for (const [k, v] of Object.entries(dynamicCors)) {
      mergedHeaders.set(k, v);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: mergedHeaders,
    });
  },

  async scheduled(_controller: { cron: string; scheduledTime: number }, _env: Env): Promise<void> {
    appendAuditLog({
      actor: 'SLA-Cron',
      role: 'officer',
      action: 'SLA_CRON_TICK',
      detail: `Quét SLA định kỳ theo lịch ${_controller.cron}`,
    });
  },
};
