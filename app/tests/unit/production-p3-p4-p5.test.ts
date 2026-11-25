import { describe, expect, it, beforeEach } from 'vitest';
import {
  checkRateLimit,
  hashSecretCode,
  requireRole,
  resetRateLimitsForTest,
  signSessionToken,
  verifySessionToken,
  verifyTurnstileToken,
} from '../../../api/src/security';
import { classifyIncidentPhoto } from '../../../api/src/aiVision';
import { appendAuditLog, evaluateSlaAlerts, listAuditLogs } from '../../../api/src/notifications';
import { uploadImageToR2 } from '../../../api/src/reportsDb';
import { detectInAppBrowser } from '@/components/common/InAppBrowserBanner';
import { getDefaultPortalPath, isPortalEnabled, resolvePortalMode } from '@/lib/portalMode';
import { buildReportsCsv } from '@/lib/exportReport';
import { clearOfflineQueue, enqueueOfflineSubmission, getOfflineQueue } from '@/lib/pwa';
import { Report } from '@/domain/types';

describe('Phần 3 – Security, RBAC & Anti-Spam (Worker API)', () => {
  const env = { JWT_SECRET: 'test-jwt-secret-key-for-unit-tests-123456' };

  beforeEach(() => {
    resetRateLimitsForTest();
  });

  it('ký và xác thực JWT session hợp lệ, từ chối token bị sửa', async () => {
    const token = await signSessionToken(
      {
        sub: 'officer:02513820001',
        role: 'officer',
        name: 'Nguyễn Minh Tuấn',
        phone: '02513820001',
      },
      env
    );
    const verified = await verifySessionToken(token, env);
    expect(verified?.role).toBe('officer');
    expect(verified?.phone).toBe('02513820001');

    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(await verifySessionToken(tampered, env)).toBeNull();
  });

  it('kiểm tra RBAC chặn 401 khi thiếu token và 403 khi sai vai trò', async () => {
    const noAuthReq = new Request('https://example.com/api/audit');
    const r1 = await requireRole(noAuthReq, env, ['officer']);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.status).toBe(401);

    const citizenToken = await signSessionToken(
      { sub: 'citizen:0901234567', role: 'citizen', name: 'Người dân', phone: '0901234567' },
      env
    );
    const forbiddenReq = new Request('https://example.com/api/audit', {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const r2 = await requireRole(forbiddenReq, env, ['officer']);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.status).toBe(403);
  });

  it('băm SHA-256 cho secretCode và giới hạn tần suất gửi', async () => {
    const h1 = await hashSecretCode('4829', 'TB-0001');
    const h2 = await hashSecretCode('4829', 'TB-0001');
    const h3 = await hashSecretCode('4829', 'TB-0002');
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);

    expect(checkRateLimit('ip:1', 2, 60_000, 1000).allowed).toBe(true);
    expect(checkRateLimit('ip:1', 2, 60_000, 2000).allowed).toBe(true);
    expect(checkRateLimit('ip:1', 2, 60_000, 3000).allowed).toBe(false);
  });

  it('xác minh Turnstile ở chế độ dev-fallback khi chưa có secret', async () => {
    const ok = await verifyTurnstileToken('dev-turnstile-abc123', '127.0.0.1', {});
    expect(ok.success).toBe(true);
    expect(ok.mode).toBe('dev-fallback');

    const fail = await verifyTurnstileToken('', '127.0.0.1', {});
    expect(fail.success).toBe(false);
  });
});

describe('Phần 4 – Xuất báo cáo CSV, SLA & Audit Log', () => {
  it('tạo CSV có UTF-8 BOM và escape đúng dấu phẩy, ngoặc kép', () => {
    const sampleReport = {
      id: 'TB-9001',
      category: 'mat_duong',
      title: 'Ổ gà lớn, cần xử lý "gấp"',
      description: 'Trước số 12',
      photos: [],
      lat: 10.95,
      lng: 106.82,
      address: '12 Nguyễn Ái Quốc, P. Trấn Biên',
      status: 'da_giao',
      department: 'Đô thị & Hạ tầng',
      createdAt: '2026-11-20T08:00:00+07:00',
      dueAt: '2026-11-23T08:00:00+07:00',
      anonymous: false,
      followers: [],
      anonymousFollows: 0,
      timeline: [],
    } as unknown as Report;

    const csv = buildReportsCsv([sampleReport], '2026-11-24T09:00:00+07:00');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Ổ gà lớn, cần xử lý ""gấp"""');
    expect(csv).toContain(',Có,');
  });

  it('quét đúng hồ sơ quá hạn, sắp đến hạn và ghi nhận Audit Log', () => {
    const sla = evaluateSlaAlerts(
      [
        {
          id: 'TB-1',
          title: 'Quá hạn',
          status: 'da_giao',
          department: 'Đô thị',
          dueAt: '2026-11-23T09:00:00+07:00',
        },
        {
          id: 'TB-2',
          title: 'Sắp hạn',
          status: 'da_giao',
          department: 'Đô thị',
          dueAt: '2026-11-25T02:00:00+07:00',
        },
        {
          id: 'TB-3',
          title: 'Đã đóng',
          status: 'dong',
          department: 'Đô thị',
          dueAt: '2026-11-20T09:00:00+07:00',
        },
      ],
      '2026-11-24T09:00:00+07:00'
    );
    expect(sla.overdue).toHaveLength(1);
    expect(sla.overdue[0]?.id).toBe('TB-1');
    expect(sla.dueSoon).toHaveLength(1);
    expect(sla.dueSoon[0]?.id).toBe('TB-2');

    const entry = appendAuditLog({
      actor: 'Cán bộ A',
      role: 'officer',
      action: 'ASSIGN',
      reportId: 'TB-1',
    });
    expect(listAuditLogs(5)[0]?.id).toBe(entry.id);
  });
});

describe('Phần 5 – AI Vision fallback & PWA offline queue', () => {
  it('trả về gợi ý dự phòng hợp lệ khi chưa cấu hình GEMINI_API_KEY', async () => {
    const res = await classifyIncidentPhoto(
      'data:image/jpeg;base64,abc',
      '/demo-photos/ngap_nuoc/1.jpg',
      {}
    );
    expect(res.category).toBe('ngap_nuoc');
    expect(res.source).toBe('fallback');
  });

  it('lưu và xóa hàng đợi bản nháp offline trong localStorage', () => {
    clearOfflineQueue();
    enqueueOfflineSubmission({
      category: 'rac_thai',
      address: 'Đường Đồng Khởi',
      title: 'Rác tồn đọng',
    });
    expect(getOfflineQueue()).toHaveLength(1);
    clearOfflineQueue();
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it('nhận diện trình duyệt nhúng Zalo/Facebook và xử lý fallback upload R2', async () => {
    expect(detectInAppBrowser('Mozilla/5.0 Zalo/24.1')).toBe('Zalo');
    expect(detectInAppBrowser('Mozilla/5.0 FBAN/FBIOS')).toBe('Facebook');
    expect(detectInAppBrowser('Mozilla/5.0 Chrome/130.0')).toBeNull();

    const uploaded = await uploadImageToR2({}, 'data:image/jpeg;base64,abc123', 'incidents');
    expect(uploaded?.storage).toBe('inline-fallback');
    expect(uploaded?.key.startsWith('incidents/')).toBe(true);
  });

  it('tách riêng 4 trang web độc lập theo VITE_PORTAL_MODE', () => {
    expect(resolvePortalMode(undefined)).toBe('all');
    expect(resolvePortalMode('admin')).toBe('admin');
    expect(isPortalEnabled('citizen', 'citizen')).toBe(true);
    expect(isPortalEnabled('officer', 'citizen')).toBe(false);
    expect(isPortalEnabled('admin', 'admin')).toBe(true);
    expect(getDefaultPortalPath('officer')).toBe('/can-bo');
    expect(getDefaultPortalPath('volunteer')).toBe('/tnv');
    expect(getDefaultPortalPath('admin')).toBe('/admin');
  });
});
