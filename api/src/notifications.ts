import { AuditLogEntry, Env, PushSubscriptionPayload } from './types';

const pushSubscriptions = new Map<string, PushSubscriptionPayload>();
const auditLogs: AuditLogEntry[] = [];

export function savePushSubscription(sub: PushSubscriptionPayload): number {
  pushSubscriptions.set(sub.endpoint, sub);
  return pushSubscriptions.size;
}

export function removePushSubscription(endpoint: string): boolean {
  return pushSubscriptions.delete(endpoint);
}

export function getPushSubscriptionCount(): number {
  return pushSubscriptions.size;
}

export function appendAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const fullEntry: AuditLogEntry = {
    id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLogs.unshift(fullEntry);
  if (auditLogs.length > 500) {
    auditLogs.length = 500;
  }
  return fullEntry;
}

export function listAuditLogs(limit = 50): AuditLogEntry[] {
  return auditLogs.slice(0, Math.max(1, Math.min(200, limit)));
}

export interface DispatchRequest {
  channel: 'web_push' | 'zalo_zns' | 'sms';
  phone?: string;
  reportId: string;
  title: string;
  body: string;
}

export interface DispatchResult {
  channel: DispatchRequest['channel'];
  delivered: boolean;
  mode: 'live' | 'dry-run';
  detail: string;
}

export async function dispatchNotification(
  payload: DispatchRequest,
  env: Env
): Promise<DispatchResult> {
  if (payload.channel === 'zalo_zns') {
    if (!env.ZALO_OA_ACCESS_TOKEN || !payload.phone) {
      return {
        channel: 'zalo_zns',
        delivered: false,
        mode: 'dry-run',
        detail: 'Chưa cấu hình ZALO_OA_ACCESS_TOKEN hoặc thiếu SĐT người nhận.',
      };
    }

    const res = await fetch('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: env.ZALO_OA_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        phone: payload.phone.replace(/^0/, '84'),
        template_id: env.ZALO_ZNS_TEMPLATE_ID || 'tbkn_status_update',
        template_data: {
          report_id: payload.reportId,
          title: payload.title,
          content: payload.body,
        },
      }),
    });

    return {
      channel: 'zalo_zns',
      delivered: res.ok,
      mode: 'live',
      detail: res.ok ? 'Đã gửi thông báo Zalo ZNS.' : `Zalo ZNS lỗi HTTP ${res.status}`,
    };
  }

  if (payload.channel === 'sms') {
    if (!env.SMS_WEBHOOK_URL || !payload.phone) {
      return {
        channel: 'sms',
        delivered: false,
        mode: 'dry-run',
        detail: 'Chưa cấu hình SMS_WEBHOOK_URL hoặc thiếu SĐT người nhận.',
      };
    }

    const res = await fetch(env.SMS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.SMS_API_KEY ? { Authorization: `Bearer ${env.SMS_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        to: payload.phone,
        message: `[Tran Bien Ket Noi] ${payload.reportId}: ${payload.body}`,
      }),
    });

    return {
      channel: 'sms',
      delivered: res.ok,
      mode: 'live',
      detail: res.ok ? 'Đã gửi SMS tới nhà cung cấp.' : `SMS Gateway lỗi HTTP ${res.status}`,
    };
  }

  return {
    channel: 'web_push',
    delivered: pushSubscriptions.size > 0 && Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
    mode: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? 'live' : 'dry-run',
    detail:
      env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
        ? `Đã xếp hàng Web Push tới ${pushSubscriptions.size} thiết bị đăng ký.`
        : 'Chưa cấu hình VAPID keys; client sẽ hiển thị Notification API cục bộ.',
  };
}

export interface SlaReportInput {
  id: string;
  title: string;
  status: string;
  department: string | null;
  dueAt: string | null;
}

export interface SlaEvaluation {
  checkedAt: string;
  overdue: Array<{ id: string; title: string; department: string | null; hoursOverdue: number }>;
  dueSoon: Array<{ id: string; title: string; department: string | null; hoursRemaining: number }>;
}

const OPEN_STATUSES = new Set(['moi', 'da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'can_bo_sung', 'mo_lai']);

export function evaluateSlaAlerts(reports: readonly SlaReportInput[], nowIso = new Date().toISOString()): SlaEvaluation {
  const nowMs = new Date(nowIso).getTime();
  const overdue: SlaEvaluation['overdue'] = [];
  const dueSoon: SlaEvaluation['dueSoon'] = [];

  for (const r of reports) {
    if (!OPEN_STATUSES.has(r.status) || !r.dueAt) continue;
    const dueMs = new Date(r.dueAt).getTime();
    if (!Number.isFinite(dueMs)) continue;
    const diffHours = (dueMs - nowMs) / (1000 * 60 * 60);
    if (diffHours < 0) {
      overdue.push({
        id: r.id,
        title: r.title,
        department: r.department,
        hoursOverdue: Math.ceil(Math.abs(diffHours)),
      });
    } else if (diffHours <= 24) {
      dueSoon.push({
        id: r.id,
        title: r.title,
        department: r.department,
        hoursRemaining: Math.max(1, Math.floor(diffHours)),
      });
    }
  }

  return { checkedAt: nowIso, overdue, dueSoon };
}
